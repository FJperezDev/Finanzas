/**
 * Store del Editor de Datos (Zustand).
 *
 * Mantiene una copia de trabajo del Excel en memoria con:
 *  - Filtros Año / Mes (vistas, como en Streamlit); el año puede ser "todos".
 *  - Historial de cambios con deshacer/rehacer (simula Ctrl+Z).
 *  - Marca de celdas modificadas respecto al último guardado (rojo + icono
 *    de deshacer por celda, como en Excel).
 *  - Autoguardado con debounce: cada cambio (celda, fila, columna, deshacer…)
 *    marca el estado como sucio y programa la persistencia validada al
 *    servidor (o al archivo en nativo). Sin botón de guardar.
 */
import { create } from "zustand";

import type { FilaTransaccion } from "../core/calculations";
import {
  CATEGORIAS_MACRO,
  COLUMNAS_EXCEL,
  NOMBRES_RESERVADOS,
  TIPOS_PERMITIDOS,
} from "../core/config";
import { anioMesDe, esFechaValida, hoyISO } from "../core/formatos";
import { SEED_CAMBIO_PENDIENTE } from "../core/seed";
import {
  escribirTransacciones,
  generarSeedSiNecesario,
  leerTransacciones,
  ordenarPorFecha,
  validarEsquema,
} from "../core/xlsxService";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export interface Cambio {
  id: string;
  col: string;
  prev: unknown;
  next: unknown;
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

  undoStack: Cambio[];
  redoStack: Cambio[];

  seleccion: SeleccionCelda | null;
  filasSeleccionadas: string[]; // checkboxes de la columna A

  anio: number | null;
  mes: number | null; // null = todos los meses
  guardando: boolean;
  sucio: boolean; // hay cambios pendientes de persistir (autoguardado)

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
    Categoria_Macro: "Fijos",
    Subcategoria: "",
    Concepto: "",
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

function aplicarCambio(
  filas: FilaTransaccion[],
  cambio: Cambio,
): FilaTransaccion[] {
  return filas.map((f) =>
    f.__id === cambio.id ? { ...f, [cambio.col]: cambio.next } : f,
  );
}

/** Fila guardada correspondiente (baseline), si existe. */
function filaGuardada(
  guardadas: FilaTransaccion[],
  id: string,
): FilaTransaccion | undefined {
  return guardadas.find((g) => g.__id === id);
}

function valorSoloLectura(v: unknown): unknown {
  return v;
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
  undoStack: [],
  redoStack: [],
  seleccion: null,
  filasSeleccionadas: [],
  anio: new Date().getFullYear(),
  mes: null,
  guardando: false,
  sucio: false,

  modalAnadirVisible: false,
  setModalAnadirVisible: (visible) => set({ modalAnadirVisible: visible }),

  // -------------------------------------------------------------------------
  cargar: async () => {
    set({ cargando: true, error: null });
    try {
      await generarSeedSiNecesario();
      let filas = await leerTransacciones();

      // Semilla del cambio pendiente de la vista (G3: 1.150,00 → 1.200,00 €).
      let cambioInicial: Cambio | null = null;
      const alquiler = filas.find(
        (f) =>
          f.Concepto === SEED_CAMBIO_PENDIENTE.concepto &&
          f.Fecha === SEED_CAMBIO_PENDIENTE.fecha &&
          f.Importe === SEED_CAMBIO_PENDIENTE.importeGuardado,
      );
      if (alquiler) {
        cambioInicial = {
          id: alquiler.__id,
          col: "Importe",
          prev: SEED_CAMBIO_PENDIENTE.importeGuardado,
          next: SEED_CAMBIO_PENDIENTE.importePendiente,
        };
        filas = aplicarCambio(filas, cambioInicial);
      }

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
        undoStack: cambioInicial ? [cambioInicial] : [],
        redoStack: [],
        filasSeleccionadas: [],
        seleccion: primera ? { id: primera.__id, col: "Fecha" } : null,
        anio,
        mes,
        sucio: cambioInicial != null,
      });
      if (cambioInicial) programarAutoguardado();
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
        undoStack: [],
        redoStack: [],
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
    const { filas, undoStack } = get();
    const fila = filas.find((f) => f.__id === id);
    if (!fila) return;
    const prev = fila[col];
    if (prev === valor) return;

    set({
      filas: filas.map((f) => (f.__id === id ? { ...f, [col]: valor } : f)),
      undoStack: [
        ...undoStack,
        { id, col, prev: valorSoloLectura(prev), next: valor },
      ],
      redoStack: [],
      sucio: true,
    });
    programarAutoguardado();
  },

  deshacer: () => {
    const { filas, undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const cambio = undoStack[undoStack.length - 1];
    set({
      filas: aplicarCambio(filas, { ...cambio, next: cambio.prev }),
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, cambio],
      sucio: true,
    });
    programarAutoguardado();
  },

  rehacer: () => {
    const { filas, undoStack, redoStack } = get();
    if (redoStack.length === 0) return;
    const cambio = redoStack[redoStack.length - 1];
    set({
      filas: aplicarCambio(filas, { ...cambio, next: cambio.next }),
      undoStack: [...undoStack, cambio],
      redoStack: redoStack.slice(0, -1),
      sucio: true,
    });
    programarAutoguardado();
  },

  revertirCelda: (id, col) => {
    const { filas, guardadas, undoStack, redoStack } = get();
    const guardada = filaGuardada(guardadas, id);
    if (!guardada) return;
    const prev = guardada[col];
    set({
      filas: filas.map((f) => (f.__id === id ? { ...f, [col]: prev } : f)),
      undoStack: undoStack.filter((c) => !(c.id === id && c.col === col)),
      redoStack: redoStack.filter((c) => !(c.id === id && c.col === col)),
      sucio: true,
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

    set({
      // La añadimos al principio de la lista para que el usuario la vea inmediatamente
      filas: [nueva, ...filas],
      seleccion: { id: nueva.__id, col: "Fecha" },
      sucio: true,
    });
    programarAutoguardado();
  },

  eliminarFilasSeleccionadas: () => {
    const { filas, filasSeleccionadas, undoStack, redoStack, seleccion } =
      get();
    if (filasSeleccionadas.length === 0) return;
    const ids = new Set(filasSeleccionadas);
    set({
      filas: filas.filter((f) => !ids.has(f.__id)),
      undoStack: undoStack.filter((c) => !ids.has(c.id)),
      redoStack: redoStack.filter((c) => !ids.has(c.id)),
      filasSeleccionadas: [],
      seleccion: seleccion && ids.has(seleccion.id) ? null : seleccion,
      sucio: true,
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

    set({
      filas: filas.map((f) => ({ ...f, [limpio]: "" })),
      columnasExtra: [...columnasExtra, limpio],
      sucio: true,
    });
    programarAutoguardado();
    return null;
  },

  eliminarColumna: (nombre) => {
    const { filas, columnasExtra, undoStack, redoStack, seleccion } = get();
    const sin = filas.map((f) => {
      const copia = { ...f };
      delete copia[nombre];
      return copia;
    });
    set({
      filas: sin,
      columnasExtra: columnasExtra.filter((c) => c !== nombre),
      undoStack: undoStack.filter((c) => c.col !== nombre),
      redoStack: redoStack.filter((c) => c.col !== nombre),
      seleccion: seleccion && seleccion.col === nombre ? null : seleccion,
      sucio: true,
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
    const { filas, undoStack, redoStack, seleccion } = get();
    const idsSet = new Set(ids);
    set({
      filas: filas.filter((f) => !idsSet.has(f.__id)),
      undoStack: undoStack.filter((c) => !idsSet.has(c.id)),
      redoStack: redoStack.filter((c) => !idsSet.has(c.id)),
      seleccion: seleccion && idsSet.has(seleccion.id) ? null : seleccion,
      sucio: true,
    });
    programarAutoguardado();
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
