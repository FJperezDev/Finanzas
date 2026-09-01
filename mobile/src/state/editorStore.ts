/**
 * Store del Editor de Datos (Zustand).
 *
 * Mantiene una copia de trabajo del Excel en memoria con:
 *  - Filtros Año / Mes (vistas, como en Streamlit); el año puede ser "todos".
 *  - Historial de cambios con deshacer/rehacer (Ctrl+Z / Ctrl+Y) de hasta
 *    7 acciones, cubriendo cualquier tipo de edición (celda, fila, columna).
 *  - Marca de celdas modificadas respecto al último guardado (rojo + icono
 *    de deshacer por celda, como en Excel).
 *  - Autoguardado con debounce: cada cambio (celda, fila, columna, deshacer…)
 *    marca el estado como sucio y programa la persistencia validada al
 *    servidor (o al archivo en nativo). Sin botón de guardar.
 */
import { create } from "zustand";

import type {
  Contacto,
  FilaTransaccion,
  GastoCompartido,
  Cuenta,
  TraspasoHistorial,
} from "../core/calculations";
import {
  CATEGORIAS_MACRO,
  COLUMNAS_EXCEL,
  NOMBRES_RESERVADOS,
  TIPOS_PERMITIDOS,
} from "../core/config";
import { anioMesDe, esFechaValida, hoyISO } from "../core/formatos";
import {
  escribirTransacciones,
  generarSeedSiNecesario,
  leerTransacciones,
  ordenarPorFecha,
  validarEsquema,
  leerContactos,
  leerGastosCompartidos,
  guardarGastoCompartidoApi,
  crearContactoApi,
  eliminarContactoApi,
  saldarDeudaApi,
  subirAvatarApi,
  leerCuentas,
  crearCuentaApi,
  actualizarCuentaApi,
  eliminarCuentaApi,
  crearTraspasoApi,
  leerTraspasos,
} from "../core/xlsxService";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export interface Snapshot {
  filas: FilaTransaccion[];
  columnasExtra: string[];
}

export interface SeleccionCelda {
  id: string;
  col: string;
}

interface Flash {
  tipo: "ok" | "error" | "info";
  texto: string;
}

export interface EditorState {
  cargando: boolean;
  error: string | null;
  flash: Flash | null;

  filas: FilaTransaccion[];
  guardadas: FilaTransaccion[]; // última versión persistida (baseline)
  columnasExtra: string[];

  pasado: Snapshot[]; // historial de estados anteriores (máx. 7)
  futuro: Snapshot[]; // estados deshechos, para rehacer

  seleccion: SeleccionCelda | null;
  filasSeleccionadas: string[]; // checkboxes de la columna A

  anio: number | null;
  mes: number | null; // null = todos los meses
  guardando: boolean;
  sucio: boolean; // hay cambios pendientes de persistir (autoguardado)

  contactos: Contacto[];
  gastosCompartidos: GastoCompartido[];
  cuentas: Cuenta[];
  traspasos: TraspasoHistorial[];
  modoVista: "movimientos" | "traspasos";

  crearContacto: (payload: Omit<Contacto, "id">) => Promise<void>;

  eliminarContacto: (id: number) => Promise<void>;

  subirAvatar: (contactoId: number, icono: string | null) => Promise<void>;

  saldarDeuda: (payload: {
    contacto_id: number;
    importe?: number;
    registrar_transaccion: boolean;
    cuenta?: string;
  }) => Promise<void>;

  crearGastoCompartido: (payload: {
    concepto: string;
    fecha: string;
    importe_total: number;
    categoria_macro: string;
    subcategoria: string;
    tipo_reparto: "IGUALES" | "EXACTO";
    pagador_id: number | null;
    participantes: { contacto_id: number; importe_exacto?: number }[];
  }) => Promise<void>;

  crearCuenta: (payload: { nombre: string; tipo: string }) => Promise<void>;
  actualizarCuenta: (
    cuentaId: number,
    payload: { nombre: string; tipo: string },
  ) => Promise<void>;
  eliminarCuenta: (id: number) => Promise<void>;
  crearTraspaso: (payload: {
    fecha: string;
    importe: number;
    concepto: string;
    cuenta_origen_id: number;
    cuenta_destino_id: number;
  }) => Promise<void>;

  // Acciones
  cargar: () => Promise<void>;
  guardar: () => Promise<void>;

  setCelda: (id: string, col: string, valor: unknown) => void;
  deshacer: () => void;
  rehacer: () => void;
  revertirCelda: (id: string, col: string) => void;

  agregarFila: (nuevaFila?: any) => void;
  eliminarFilasSeleccionadas: () => void;
  agregarColumna: (nombre: string) => string | null; // null = ok, string = error
  eliminarColumna: (nombre: string) => void;

  setAnio: (anio: number | null) => void;
  setMes: (mes: number | null) => void;
  setSeleccion: (seleccion: SeleccionCelda | null) => void;
  toggleFilaSeleccionada: (id: string) => void;
  limpiarFilasSeleccionadas: () => void;
  limpiarFlash: () => void;
  eliminarFilasPorId: (ids: string[]) => void;

  modalAnadirVisible: boolean;
  setModalAnadirVisible: (visible: boolean) => void;
  setModoVista: (modo: "movimientos" | "traspasos") => void;
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
let contadorFila = 0;
function nuevoIdFila(): string {
  contadorFila += 1;
  return `r${Date.now().toString(36)}_${contadorFila}`;
}

function filaNueva(importe = 0): FilaTransaccion {
  return {
    __id: nuevoIdFila(),
    Fecha: hoyISO(),
    Tipo: "Gasto",
    Categoria_Macro: "Fijo",
    Subcategoria: "",
    Concepto: "",
    Cuenta: "",
    Importe: importe,
  };
}

function clonarFila(fila: FilaTransaccion): FilaTransaccion {
  return { ...fila };
}

/** Fecha por defecto para nuevas filas: la última del Excel o hoy. */
function fechaDeNuevaFila(filas: FilaTransaccion[]): string {
  if (filas.length === 0) return hoyISO();
  return filas[filas.length - 1].Fecha || hoyISO();
}

/** Fila guardada correspondiente (baseline), si existe. */
function filaGuardada(
  guardadas: FilaTransaccion[],
  id: string,
): FilaTransaccion | undefined {
  return guardadas.find((g) => g.__id === id);
}

// ---------------------------------------------------------------------------
// Historial de acciones (deshacer/rehacer, máximo 7)
// ---------------------------------------------------------------------------
const LIMITE_HISTORIAL = 7;

/**
 * Registra el estado actual antes de aplicar una mutación y actualiza el
 * store. `filas` y `columnasExtra` se tratan de forma inmutable, por lo que
 * guardar sus referencias es seguro (nunca se modifican in place).
 */
function registrarAccion(
  get: () => EditorState,
  set: (parcial: Partial<EditorState>) => void,
  nuevo: Partial<EditorState>,
): void {
  const { pasado, filas, columnasExtra } = get();
  const siguiente = [...pasado, { filas, columnasExtra }];
  if (siguiente.length > LIMITE_HISTORIAL) {
    siguiente.shift();
  }
  set({ ...nuevo, pasado: siguiente, futuro: [], sucio: true });
}

// ---------------------------------------------------------------------------
// Validación + normalización (espejo de `_validar_normalizar` de Python)
// ---------------------------------------------------------------------------
export function validarNormalizar(filas: FilaTransaccion[]): {
  filas: FilaTransaccion[];
  errores: string[];
} {
  const errores: string[] = [];

  const fechasInvalidas: number[] = [];
  const tiposInvalidos: number[] = [];
  const catsInvalidas: number[] = [];
  const importesInvalidos: number[] = [];

  filas.forEach((f, i) => {
    if (!esFechaValida(f.Fecha)) fechasInvalidas.push(i + 1);
    if (!TIPOS_PERMITIDOS.includes(f.Tipo as never)) tiposInvalidos.push(i + 1);
    if (!CATEGORIAS_MACRO.includes(f.Categoria_Macro as never))
      catsInvalidas.push(i + 1);
    if (!Number.isFinite(f.Importe)) importesInvalidos.push(i + 1);
    else if (f.Importe < 0) importesInvalidos.push(i + 1);
  });

  const filas8 = (lista: number[]) => lista.slice(0, 8).join(", ");
  if (fechasInvalidas.length) {
    errores.push(
      `Fecha vacía o inválida en las filas ${filas8(fechasInvalidas)} (formato YYYY-MM-DD).`,
    );
  }
  if (tiposInvalidos.length) {
    errores.push(
      `'Tipo' inválido en las filas ${filas8(tiposInvalidos)}. Permitidos: ${TIPOS_PERMITIDOS.join(", ")}.`,
    );
  }
  if (catsInvalidas.length) {
    errores.push(
      `'Categoria_Macro' inválida en las filas ${filas8(catsInvalidas)}. Permitidas: ${CATEGORIAS_MACRO.join(", ")}.`,
    );
  }
  if (importesInvalidos.length) {
    errores.push(
      `'Importe' vacío o negativo en las filas ${filas8(importesInvalidos)} (el signo lo dictamina la columna 'Tipo').`,
    );
  }
  if (errores.length) return { filas, errores };

  const normalizadas = filas.map((f) => ({
    ...f,
    Subcategoria: f.Subcategoria ?? "",
    Concepto: f.Concepto ?? "",
    Cuenta: f.Cuenta ?? "",
    Importe: Number(f.Importe),
  }));
  return { filas: ordenarPorFecha(normalizadas), errores: [] };
}

// ---------------------------------------------------------------------------
// Filtros por defecto
// ---------------------------------------------------------------------------
function filtrosPorDefecto(filas: FilaTransaccion[]): {
  anio: number;
  mes: number | null;
} {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;

  const anios = new Set<number>();
  const mesesDelAnio = new Set<number>();
  for (const f of filas) {
    const am = anioMesDe(f.Fecha);
    if (!am) continue;
    anios.add(am.anio);
    if (am.anio === anioActual) mesesDelAnio.add(am.mes);
  }

  const anio = anios.has(anioActual)
    ? anioActual
    : Math.max(...anios, anioActual);
  const meses = [...mesesDelAnio].sort((a, b) => b - a);
  const mes = mesesDelAnio.has(mesActual) ? mesActual : (meses[0] ?? null);
  return { anio, mes };
}

// ---------------------------------------------------------------------------
// Autoguardado (debounce)
// ---------------------------------------------------------------------------
/** Espera tras el último cambio antes de persistir automáticamente. */
const AUTOGUARDADO_MS = 2500;

let autoguardadoTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Programa el guardado automático tras un periodo de inactividad.
 * Cada cambio reinicia el temporizador; al dispararse invoca `guardar()`,
 * que no hace nada si ya no hay cambios pendientes.
 */
function programarAutoguardado() {
  if (autoguardadoTimer) clearTimeout(autoguardadoTimer);
  autoguardadoTimer = setTimeout(() => {
    autoguardadoTimer = null;
    void useEditorStore.getState().guardar();
  }, AUTOGUARDADO_MS);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useEditorStore = create<EditorState>()((set, get) => ({
  cargando: true,
  error: null,
  flash: null,
  filas: [],
  guardadas: [],
  columnasExtra: [],
  pasado: [],
  futuro: [],
  seleccion: null,
  filasSeleccionadas: [],
  anio: new Date().getFullYear(),
  mes: null,
  guardando: false,
  sucio: false,

  contactos: [],
  gastosCompartidos: [],
  cuentas: [],
  traspasos: [],
  modoVista: "movimientos",

  modalAnadirVisible: false,
  setModalAnadirVisible: (visible) => set({ modalAnadirVisible: visible }),
  setModoVista: (modo) => set({ modoVista: modo }),

  // -------------------------------------------------------------------------
  cargar: async () => {
    set({ cargando: true, error: null });
    try {
      await generarSeedSiNecesario();
      const [filas, contactos, gastosCompartidos, cuentas, traspasos] =
        await Promise.all([
          leerTransacciones(),
          leerContactos(), // Función nueva a crear
          leerGastosCompartidos(), // Función nueva a crear
          leerCuentas(),
          leerTraspasos(),
        ]);

      const { anio, mes } = filtrosPorDefecto(filas);
      const primera = filas.find((f) => {
        const am = anioMesDe(f.Fecha);
        return am && am.anio === anio && (mes == null || am.mes === mes);
      });

      set({
        cargando: false,
        filas,
        guardadas: filas.map(clonarFila),
        columnasExtra: columnasExtraDe(filas),
        pasado: [],
        futuro: [],
        filasSeleccionadas: [],
        seleccion: primera ? { id: primera.__id, col: "Fecha" } : null,
        anio,
        mes,
        contactos,
        gastosCompartidos,
        cuentas,
        traspasos,
        sucio: false,
      });
    } catch (exc) {
      set({
        cargando: false,
        error: exc instanceof Error ? exc.message : String(exc),
        filas: [],
        guardadas: [],
      });
    }
  },

  guardar: async () => {
    if (get().guardando) return;
    if (!get().sucio) return;
    set({ guardando: true });
    try {
      // Fotografía del estado a persistir (por referencia, para detectar
      // ediciones concurrentes durante la escritura).
      const filasEnviadas = get().filas;
      const { filas: normalizadas, errores } = validarNormalizar(filasEnviadas);
      if (errores.length) {
        set({
          guardando: false,
          flash: {
            tipo: "error",
            texto: `No se guardaron los cambios: ${errores.join(" ")}`,
          },
        });
        return;
      }

      const erroresEsquema = validarEsquema(normalizadas);
      if (erroresEsquema.length) {
        set({
          guardando: false,
          flash: { tipo: "error", texto: erroresEsquema.join(" ") },
        });
        return;
      }

      await escribirTransacciones(normalizadas);

      if (get().filas !== filasEnviadas) {
        // El usuario siguió editando mientras se guardaba: no pisamos sus
        // cambios, solo actualizamos la línea base y volvemos a programar.
        set({
          guardando: false,
          guardadas: normalizadas.map(clonarFila),
          sucio: true,
          flash: {
            tipo: "info",
            texto:
              "Guardado parcial: quedan cambios más recientes por guardar.",
          },
        });
        programarAutoguardado();
        return;
      }

      set({
        guardando: false,
        filas: normalizadas,
        guardadas: normalizadas.map(clonarFila),
        sucio: false,
        pasado: [],
        futuro: [],
        filasSeleccionadas: [],
        flash: {
          tipo: "ok",
          texto: `Cambios guardados automáticamente (${normalizadas.length} filas).`,
        },
      });
    } catch (exc) {
      set({
        guardando: false,
        flash: {
          tipo: "error",
          texto: `Error al guardar: ${exc instanceof Error ? exc.message : exc}`,
        },
      });
    }
  },

  // -------------------------------------------------------------------------
  setCelda: (id, col, valor) => {
    const { filas } = get();
    const fila = filas.find((f) => f.__id === id);
    if (!fila) return;
    if (fila[col] === valor) return;

    registrarAccion(get, set, {
      filas: filas.map((f) => (f.__id === id ? { ...f, [col]: valor } : f)),
    });
    programarAutoguardado();
  },

  deshacer: () => {
    const { pasado, filas, columnasExtra, futuro } = get();
    if (pasado.length === 0) return;
    const anterior = pasado[pasado.length - 1];
    set({
      filas: anterior.filas,
      columnasExtra: anterior.columnasExtra,
      pasado: pasado.slice(0, -1),
      futuro: [...futuro, { filas, columnasExtra }],
      sucio: true,
    });
    programarAutoguardado();
  },

  rehacer: () => {
    const { futuro, filas, columnasExtra, pasado } = get();
    if (futuro.length === 0) return;
    const siguiente = futuro[futuro.length - 1];
    set({
      filas: siguiente.filas,
      columnasExtra: siguiente.columnasExtra,
      pasado: [...pasado, { filas, columnasExtra }],
      futuro: futuro.slice(0, -1),
      sucio: true,
    });
    programarAutoguardado();
  },

  revertirCelda: (id, col) => {
    const { filas, guardadas } = get();
    const guardada = filaGuardada(guardadas, id);
    if (!guardada) return;
    const prev = guardada[col];
    registrarAccion(get, set, {
      filas: filas.map((f) => (f.__id === id ? { ...f, [col]: prev } : f)),
    });
    programarAutoguardado();
  },

  // -------------------------------------------------------------------------
  agregarFila: (nuevaFila: any) => {
    const { filas } = get();

    // Si pasamos datos desde el modal, los combinamos con la estructura base.
    // Usamos tu función interna nuevoIdFila() para mantener consistencia.
    const nueva = nuevaFila
      ? { ...filaNueva(), ...nuevaFila, __id: nuevoIdFila() }
      : { ...filaNueva(), Fecha: fechaDeNuevaFila(filas) };

    registrarAccion(get, set, {
      // La añadimos al principio de la lista para que el usuario la vea inmediatamente
      filas: [nueva, ...filas],
      seleccion: { id: nueva.__id, col: "Fecha" },
    });
    programarAutoguardado();
  },

  eliminarFilasSeleccionadas: () => {
    const { filas, filasSeleccionadas, seleccion } = get();
    if (filasSeleccionadas.length === 0) return;
    const ids = new Set(filasSeleccionadas);
    registrarAccion(get, set, {
      filas: filas.filter((f) => !ids.has(f.__id)),
      filasSeleccionadas: [],
      seleccion: seleccion && ids.has(seleccion.id) ? null : seleccion,
    });
    programarAutoguardado();
  },

  agregarColumna: (nombre) => {
    const { filas, columnasExtra } = get();
    const limpio = nombre.trim();
    if (!limpio) return "Escribe un nombre para la columna.";
    if (NOMBRES_RESERVADOS.has(limpio))
      return `'${limpio}' es un nombre reservado de la aplicación.`;
    if (columnasExtra.includes(limpio))
      return `La columna '${limpio}' ya existe.`;

    registrarAccion(get, set, {
      filas: filas.map((f) => ({ ...f, [limpio]: "" })),
      columnasExtra: [...columnasExtra, limpio],
    });
    programarAutoguardado();
    return null;
  },

  eliminarColumna: (nombre) => {
    const { filas, columnasExtra, seleccion } = get();
    const sin = filas.map((f) => {
      const copia = { ...f };
      delete copia[nombre];
      return copia;
    });
    registrarAccion(get, set, {
      filas: sin,
      columnasExtra: columnasExtra.filter((c) => c !== nombre),
      seleccion: seleccion && seleccion.col === nombre ? null : seleccion,
    });
    programarAutoguardado();
  },

  // -------------------------------------------------------------------------
  setAnio: (anio) => {
    if (anio == null) {
      set({ anio: null, mes: null });
      return;
    }
    const { filas, mes } = get();
    const meses = new Set(
      filas
        .map((f) => anioMesDe(f.Fecha))
        .filter(
          (am): am is { anio: number; mes: number } => !!am && am.anio === anio,
        )
        .map((am) => am.mes),
    );
    set({
      anio,
      mes: mes != null && meses.has(mes) ? mes : null,
    });
  },

  setMes: (mes) => set({ mes }),
  setSeleccion: (seleccion) => set({ seleccion }),
  toggleFilaSeleccionada: (id) => {
    const { filasSeleccionadas } = get();
    set({
      filasSeleccionadas: filasSeleccionadas.includes(id)
        ? filasSeleccionadas.filter((x) => x !== id)
        : [...filasSeleccionadas, id],
    });
  },
  limpiarFilasSeleccionadas: () => set({ filasSeleccionadas: [] }),
  limpiarFlash: () => set({ flash: null }),
  eliminarFilasPorId: (ids) => {
    const { filas, seleccion } = get();
    const idsSet = new Set(ids);
    registrarAccion(get, set, {
      filas: filas.filter((f) => !idsSet.has(f.__id)),
      seleccion: seleccion && idsSet.has(seleccion.id) ? null : seleccion,
    });
    programarAutoguardado();
  },
  crearGastoCompartido: async (payload) => {
    set({ guardando: true });
    try {
      // Llamada a la API (crearemos esta función en el siguiente paso)
      await guardarGastoCompartidoApi(payload);

      // Como un gasto compartido pagado por ti genera una Transaccion en el backend,
      // lo más seguro es recargar todo el estado para tener el Excel y deudas sincronizados.
      await get().cargar();

      set({
        guardando: false,
        flash: {
          tipo: "ok",
          texto: "Gasto compartido registrado correctamente.",
        },
      });
    } catch (exc) {
      set({
        guardando: false,
        flash: {
          tipo: "error",
          texto: `Error al registrar deudas: ${exc instanceof Error ? exc.message : exc}`,
        },
      });
    }
  },
  crearContacto: async (payload) => {
    set({ guardando: true });
    try {
      await crearContactoApi(payload);
      const contactosActualizados = await leerContactos(); // Recargamos para ver el nuevo
      set({
        contactos: contactosActualizados,
        guardando: false,
        flash: { tipo: "ok", texto: "Contacto creado correctamente." },
      });
    } catch (exc) {
      set({
        guardando: false,
        flash: {
          tipo: "error",
          texto: exc instanceof Error ? exc.message : String(exc),
        },
      });
    }
  },
  eliminarContacto: async (id: number) => {
    set({ guardando: true });
    try {
      await eliminarContactoApi(id);

      // Actualizamos el estado local eliminando el contacto de la lista sin recargar todo de internet
      const contactosActualizados = get().contactos.filter((c) => c.id !== id);

      set({
        contactos: contactosActualizados,
        guardando: false,
        flash: { tipo: "info", texto: "Contacto eliminado." },
      });
    } catch (exc) {
      set({
        guardando: false,
        flash: {
          tipo: "error",
          texto: exc instanceof Error ? exc.message : String(exc),
        },
      });
    }
  },

  subirAvatar: async (contactoId, icono) => {
    set({ guardando: true });
    try {
      await subirAvatarApi(contactoId, icono);
      const contactosActualizados = await leerContactos();
      set({
        contactos: contactosActualizados,
        guardando: false,
        flash: { tipo: "ok", texto: "Avatar actualizado." },
      });
    } catch (exc) {
      set({
        guardando: false,
        flash: {
          tipo: "error",
          texto: exc instanceof Error ? exc.message : String(exc),
        },
      });
    }
  },

  saldarDeuda: async (payload) => {
    set({ guardando: true });
    try {
      await saldarDeudaApi(payload);

      // El backend marca las deudas como saldadas y crea la transacción
      // espejo; recargamos para reflejar Excel y balances sincronizados.
      await get().cargar();

      set({
        guardando: false,
        flash: { tipo: "ok", texto: "Deuda saldada correctamente." },
      });
    } catch (exc) {
      set({
        guardando: false,
        flash: {
          tipo: "error",
          texto: `Error al saldar: ${exc instanceof Error ? exc.message : exc}`,
        },
      });
    }
  },

  crearCuenta: async (payload) => {
    set({ guardando: true });
    try {
      await crearCuentaApi(payload);
      const cuentasActualizadas = await leerCuentas();
      set({
        cuentas: cuentasActualizadas,
        guardando: false,
        flash: { tipo: "ok", texto: "Cuenta creada correctamente." },
      });
    } catch (exc) {
      set({
        guardando: false,
        flash: {
          tipo: "error",
          texto: exc instanceof Error ? exc.message : String(exc),
        },
      });
    }
  },

  actualizarCuenta: async (cuentaId, payload) => {
    set({ guardando: true });
    try {
      await actualizarCuentaApi(cuentaId, payload);
      // Renombrar una cuenta también actualiza la columna 'Cuenta' de las
      // transacciones, así que recargamos todo para mantenerlo coherente.
      await get().cargar();
      set({
        guardando: false,
        flash: { tipo: "ok", texto: "Cuenta actualizada correctamente." },
      });
    } catch (exc) {
      set({
        guardando: false,
        flash: {
          tipo: "error",
          texto: exc instanceof Error ? exc.message : String(exc),
        },
      });
    }
  },

  eliminarCuenta: async (id) => {
    set({ guardando: true });
    try {
      await eliminarCuentaApi(id);
      const [cuentasActualizadas, traspasosActualizados] = await Promise.all([
        leerCuentas(),
        leerTraspasos(),
      ]);
      set({
        cuentas: cuentasActualizadas,
        traspasos: traspasosActualizados,
        guardando: false,
        flash: { tipo: "info", texto: "Cuenta eliminada." },
      });
    } catch (exc) {
      set({
        guardando: false,
        flash: {
          tipo: "error",
          texto: exc instanceof Error ? exc.message : String(exc),
        },
      });
    }
  },

  crearTraspaso: async (payload) => {
    set({ guardando: true });
    try {
      await crearTraspasoApi(payload);
      const [cuentasActualizadas, traspasosActualizados] = await Promise.all([
        leerCuentas(),
        leerTraspasos(),
      ]);
      set({
        cuentas: cuentasActualizadas,
        traspasos: traspasosActualizados,
        guardando: false,
        flash: { tipo: "ok", texto: "Traspaso registrado correctamente." },
      });
    } catch (exc) {
      set({
        guardando: false,
        flash: {
          tipo: "error",
          texto: exc instanceof Error ? exc.message : String(exc),
        },
      });
    }
  },
}));

// ---------------------------------------------------------------------------
// Selectores derivados
// ---------------------------------------------------------------------------
/** Columnas adicionales presentes en las filas (fuera del contrato). */
function columnasExtraDe(filas: FilaTransaccion[]): string[] {
  if (filas.length === 0) return [];
  const extras = new Set<string>();
  for (const f of filas) {
    for (const clave of Object.keys(f)) {
      if (
        !COLUMNAS_EXCEL.includes(clave as never) &&
        !["__id", "Importe_Firmado"].includes(clave)
      ) {
        extras.add(clave);
      }
    }
  }
  return [...extras];
}

/** Filas visibles según los filtros Año/Mes activos. */
export function filasVisiblesDe(state: EditorState): FilaTransaccion[] {
  return state.filas.filter((f) => {
    const am = anioMesDe(f.Fecha);
    if (!am) return false;
    if (state.anio != null && am.anio !== state.anio) return false;
    return state.mes == null || am.mes === state.mes;
  });
}

/** Años presentes en los datos, unidos al año actual, ordenados descendente. */
export function aniosDisponibles(filas: FilaTransaccion[]): number[] {
  const anios = new Set<number>([new Date().getFullYear()]);
  for (const f of filas) {
    const am = anioMesDe(f.Fecha);
    if (am) anios.add(am.anio);
  }
  return [...anios].sort((a, b) => b - a);
}

/** Celdas modificadas respecto al último guardado: id|col -> { prev, next }. */
export function celdasCambiadasDe(
  state: EditorState,
): Map<string, { prev: unknown; next: unknown }> {
  const cambiadas = new Map<string, { prev: unknown; next: unknown }>();
  for (const f of state.filas) {
    const guardada = filaGuardada(state.guardadas, f.__id);
    if (!guardada) continue;
    for (const col of columnasDeFila(state)) {
      if (f[col] !== guardada[col]) {
        cambiadas.set(`${f.__id}|${col}`, {
          prev: guardada[col],
          next: f[col],
        });
      }
    }
  }
  return cambiadas;
}

/** Todas las columnas editables de una fila (contrato + extras). */
export function columnasDeFila(state: EditorState): string[] {
  return [...COLUMNAS_EXCEL, ...state.columnasExtra];
}

/** ¿La fila no existe aún en el archivo guardado? */
export function esFilaNueva(id: string, guardadas: FilaTransaccion[]): boolean {
  return !guardadas.some((g) => g.__id === id);
}

/** Letra de columna estilo Excel para la cabecera: 0 → A, 1 → B, 26 → AA… */
export function letraColumna(indice: number): string {
  let n = indice;
  let letras = "";
  while (n >= 0) {
    letras = String.fromCharCode(65 + (n % 26)) + letras;
    n = Math.floor(n / 26) - 1;
  }
  return letras;
}

/** Referencia estilo Excel de una celda: col + fila (1-indexada). */
export function referenciaCelda(indiceCol: number, indiceFila: number): string {
  return `${letraColumna(indiceCol)}${indiceFila + 1}`;
}
