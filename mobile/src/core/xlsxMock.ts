/**
 * Capa de datos en modo invitado (sin backend): un dataset mock en memoria.
 *
 * Misma API pública que la implementación con servidor (xlsxService):
 *   - leerTransacciones()  → genera/lee el dataset de demostración
 *   - escribirTransacciones() → persiste los cambios en memoria (sesión)
 *   - generarSeedSiNecesario() → no-op (la semilla vive aquí)
 *   - exportarXlsx()       → descarga un .xlsx generado en el cliente
 */
import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as XLSX from "xlsx";

import type {
  FilaTransaccion,
  Contacto,
  GastoCompartido,
  ParticipacionCompartida,
} from "./calculations";
import {
  generarFilasSeed,
  generarContactosSeed,
  generarGastosCompartidosSeed,
} from "./seed";
import {
  ordenarPorFecha,
  type FilaGuardable,
  type PayloadGastoCompartido,
} from "./xlsxCompartido";

let memoria: FilaTransaccion[] | null = null;
let memoriaContactos: Contacto[] | null = null;
let memoriaGastos: GastoCompartido[] | null = null;

function cargarContactosMemoria(): Contacto[] {
  if (!memoriaContactos) {
    memoriaContactos = generarContactosSeed();
  }
  return memoriaContactos;
}

function cargarGastosMemoria(): GastoCompartido[] {
  if (!memoriaGastos) {
    // Forzamos el tipado para que coincida con la interfaz,
    // ya que seed.ts exporta literales.
    memoriaGastos = generarGastosCompartidosSeed() as GastoCompartido[];
  }
  return memoriaGastos;
}

export async function leerContactosMock(): Promise<Contacto[]> {
  return cargarContactosMemoria();
}

export async function leerGastosCompartidosMock(): Promise<GastoCompartido[]> {
  return cargarGastosMemoria();
}

export async function guardarGastoCompartidoMock(
  payload: PayloadGastoCompartido,
): Promise<void> {
  const gastos = cargarGastosMemoria();
  const nuevoId =
    gastos.length > 0 ? Math.max(...gastos.map((g) => g.id)) + 1 : 1;

  let participaciones: ParticipacionCompartida[] = [];

  // Lógica espejo del backend
  if (payload.tipo_reparto === "IGUALES") {
    const partes = payload.participantes.length + 1;
    const porPersona = Math.round((payload.importe_total / partes) * 100) / 100;
    participaciones = payload.participantes.map((p) => ({
      contacto_id: p.contacto_id,
      importe_debido: porPersona,
      importe_saldado: 0,
      saldado: false,
      perdonado: false,
    }));
  } else if (payload.tipo_reparto === "EXACTO") {
    participaciones = payload.participantes.map((p) => ({
      contacto_id: p.contacto_id,
      importe_debido: p.importe_exacto ?? 0,
      importe_saldado: 0,
      saldado: false,
      perdonado: false,
    }));
  }

  // 1. Guardar el Gasto Compartido
  gastos.push({
    id: nuevoId,
    concepto: payload.concepto,
    fecha: payload.fecha,
    importe_total: payload.importe_total,
    categoria_macro: payload.categoria_macro,
    subcategoria: payload.subcategoria,
    tipo_reparto: payload.tipo_reparto,
    pagador_id: payload.pagador_id,
    mi_parte_saldada: false,
    mi_parte_saldada_importe: 0,
    mi_parte_perdonada: false,
    participaciones,
  });

  // 2. Si pagaste tú, generar la fila en el Excel de forma automática
  if (payload.pagador_id === null && !payload.omitir_transaccion) {
    const filas = cargarMemoria();
    filas.push({
      __id: `mock_tx_gasto_${nuevoId}`,
      Fecha: payload.fecha,
      Tipo: "Gasto",
      Categoria_Macro: payload.categoria_macro,
      Subcategoria: payload.subcategoria,
      Concepto: payload.concepto,
      Importe: payload.importe_total,
    });
  }
}

function cargarMemoria(): FilaTransaccion[] {
  if (!memoria) {
    memoria = generarFilasSeed().map((fila, indice) => ({
      __id: `mock_${indice + 1}`,
      ...fila,
    }));
  }
  return memoria;
}

export async function generarSeedSiNecesario(): Promise<boolean> {
  return true;
}

export async function leerTransaccionesMock(): Promise<FilaTransaccion[]> {
  return ordenarPorFecha(cargarMemoria().map((fila) => ({ ...fila })));
}

export async function escribirTransaccionesMock(
  filas: FilaGuardable[],
): Promise<void> {
  memoria = filas.map((fila, indice) => ({
    ...fila,
    __id:
      typeof fila.__id === "string" && fila.__id.length > 0
        ? fila.__id
        : `mock_${indice + 1}`,
  })) as FilaTransaccion[];
}

export async function exportarXlsxMock(
  anio: number | null = null,
  mes: number | null = null,
): Promise<void> {
  const filas = cargarMemoria().filter((fila) => {
    const [yyyy, mm] = fila.Fecha.split("-");
    if (anio != null && Number(yyyy) !== anio) return false;
    return mes == null || Number(mm) === mes;
  });

  const sinId = filas.map(
    ({ __id: _omitido, Importe_Firmado: _firmado, ...resto }) => resto,
  );

  const libro = XLSX.utils.book_new();
  const hoja = XLSX.utils.json_to_sheet(sinId);
  XLSX.utils.book_append_sheet(libro, hoja, "Transacciones");

  const nombre =
    anio == null
      ? "transacciones.xlsx"
      : `transacciones_${anio}${mes != null ? `_${String(mes).padStart(2, "0")}` : ""}.xlsx`;

  if (Platform.OS === "web") {
    XLSX.writeFile(libro, nombre);
    return;
  }

  const binario = XLSX.write(libro, { type: "array", bookType: "xlsx" });
  new File(Paths.document, nombre).write(new Uint8Array(binario));
}

export async function crearContactoMock(
  payload: Omit<Contacto, "id">,
): Promise<Contacto> {
  const contactos = cargarContactosMemoria();
  const nuevoId =
    contactos.length > 0 ? Math.max(...contactos.map((c) => c.id)) + 1 : 1;
  const nuevoContacto = { id: nuevoId, ...payload };
  contactos.push(nuevoContacto);
  return nuevoContacto;
}

export async function eliminarContactoMock(id: number): Promise<void> {
  const contactos = cargarContactosMemoria();
  const index = contactos.findIndex((c) => c.id === id);
  if (index !== -1) {
    contactos.splice(index, 1);
  }
}

export async function subirAvatarMock(
  contactoId: number,
  icono: string | null,
): Promise<Contacto | null> {
  const contactos = cargarContactosMemoria();
  const contacto = contactos.find((c) => c.id === contactoId);
  if (!contacto) return null;
  contacto.icono = icono;
  return { ...contacto };
}

export async function saldarDeudaMock(payload: {
  contacto_id: number;
  importe?: number;
  registrar_transaccion: boolean;
}): Promise<{ importe: number; tipo: "Ingreso" | "Gasto" | null; perdonado: boolean }> {
  const gastos = cargarGastosMemoria();
  let meDeben = 0;
  let leDebo = 0;

  const pendienteDe = (p: ParticipacionCompartida) =>
    p.importe_debido - (p.importe_saldado ?? 0);

  for (const g of gastos) {
    for (const p of g.participaciones) {
      if (g.pagador_id === null && p.contacto_id === payload.contacto_id) {
        meDeben += pendienteDe(p);
      }
    }
    if (g.pagador_id === payload.contacto_id) {
      const sumaOtros = g.participaciones.reduce(
        (acc, p) => acc + p.importe_debido,
        0,
      );
      const miParte = g.importe_total - sumaOtros;
      const saldada =
        g.mi_parte_saldada_importe ?? (g.mi_parte_saldada ? miParte : 0);
      leDebo += Math.max(miParte - saldada, 0);
    }
  }

  const neto = meDeben - leDebo;
  if (Math.abs(neto) <= 0.01) {
    return { importe: 0, tipo: null, perdonado: !payload.registrar_transaccion };
  }

  const importeASaldar = Math.min(
    payload.importe ?? Math.abs(neto),
    Math.abs(neto),
  );
  const perdonar = !payload.registrar_transaccion;
  let restante = importeASaldar;

  if (neto > 0) {
    for (const g of gastos) {
      if (restante <= 0) break;
      if (g.pagador_id !== null) continue;
      for (const p of g.participaciones) {
        if (restante <= 0) break;
        if (p.contacto_id !== payload.contacto_id) continue;
        const pendiente = pendienteDe(p);
        if (pendiente <= 0) continue;
        const aplicar = Math.min(restante, pendiente);
        p.importe_saldado = (p.importe_saldado ?? 0) + aplicar;
        p.saldado = p.importe_saldado >= p.importe_debido;
        if (perdonar) p.perdonado = true;
        restante -= aplicar;
      }
    }
  } else {
    for (const g of gastos) {
      if (restante <= 0) break;
      if (g.pagador_id !== payload.contacto_id) continue;
      const sumaOtros = g.participaciones.reduce(
        (acc, p) => acc + p.importe_debido,
        0,
      );
      const miParte = g.importe_total - sumaOtros;
      const saldada =
        g.mi_parte_saldada_importe ?? (g.mi_parte_saldada ? miParte : 0);
      const pendiente = Math.max(miParte - saldada, 0);
      if (pendiente <= 0) continue;
      const aplicar = Math.min(restante, pendiente);
      g.mi_parte_saldada_importe = saldada + aplicar;
      g.mi_parte_saldada = g.mi_parte_saldada_importe >= miParte;
      if (perdonar) g.mi_parte_perdonada = true;
      restante -= aplicar;
    }
  }

  const tipo: "Ingreso" | "Gasto" = neto > 0 ? "Ingreso" : "Gasto";

  if (payload.registrar_transaccion) {
    const filas = cargarMemoria();
    filas.push({
      __id: `mock_tx_saldar_${Date.now()}`,
      Fecha: new Date().toISOString().split("T")[0],
      Tipo: tipo,
      Categoria_Macro: "Deuda",
      Subcategoria: "Saldar",
      Concepto: "Saldar cuentas",
      Importe: importeASaldar,
    });
  }

  return { importe: importeASaldar, tipo, perdonado: perdonar };
}
