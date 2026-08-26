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

import type { FilaTransaccion } from "./calculations";
import { generarFilasSeed } from "./seed";
import {
  ordenarPorFecha,
  type FilaGuardable,
} from "./xlsxCompartido";

let memoria: FilaTransaccion[] | null = null;

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

  const nombre = anio == null
    ? "transacciones.xlsx"
    : `transacciones_${anio}${mes != null ? `_${String(mes).padStart(2, "0")}` : ""}.xlsx`;

  if (Platform.OS === "web") {
    XLSX.writeFile(libro, nombre);
    return;
  }

  const binario = XLSX.write(libro, { type: "array", bookType: "xlsx" });
  new File(Paths.document, nombre).write(new Uint8Array(binario));
}
