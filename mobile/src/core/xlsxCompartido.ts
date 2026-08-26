/**
 * Funciones puras compartidas por la capa de datos (nativa y web):
 * normalización de celdas, orden cronológico y validación de esquema.
 */
import { CATEGORIAS_MACRO, COLUMNAS_EXCEL, TIPOS_PERMITIDOS } from "./config";
import type { FilaTransaccion } from "./calculations";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export interface FilaGuardable {
  Fecha: string;
  Tipo: string;
  Categoria_Macro: string;
  Subcategoria: string;
  Concepto: string;
  Importe: number;
  [extra: string]: unknown;
}

// ---------------------------------------------------------------------------
// Normalización
// ---------------------------------------------------------------------------
/** Convierte cualquier valor de celda de fecha a string YYYY-MM-DD. */
export function normalizarFecha(valor: unknown): string {
  if (valor == null) return "";
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const y = valor.getUTCFullYear();
    const m = String(valor.getUTCMonth() + 1).padStart(2, "0");
    const d = String(valor.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof valor === "number") {
    // Serial de Excel: días desde 1899-12-30.
    const ms = Math.round((valor - 25569) * 86400 * 1000);
    const fecha = new Date(ms);
    const y = fecha.getUTCFullYear();
    const m = String(fecha.getUTCMonth() + 1).padStart(2, "0");
    const d = String(fecha.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(valor).trim();
}

export function normalizarImporte(valor: unknown): number {
  if (typeof valor === "number") return valor;
  if (valor == null) return 0;
  const texto = String(valor).trim().replace(/\u00a0/g, " ");
  const limpio = texto.replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "");
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : 0;
}

export function ordenarPorFecha(filas: FilaTransaccion[]): FilaTransaccion[] {
  return [...filas].sort((a, b) => a.Fecha.localeCompare(b.Fecha));
}

// ---------------------------------------------------------------------------
// Validación de esquema (espejo de `_validar_esquema` de Python)
// ---------------------------------------------------------------------------
export function validarEsquema(filas: FilaTransaccion[]): string[] {
  const errores: string[] = [];
  if (filas.length === 0) return errores;

  const tipos = new Set(filas.map((f) => f.Tipo));
  const invalidos = [...tipos].filter((t) => !TIPOS_PERMITIDOS.includes(t as never));
  if (invalidos.length) errores.push(`Valores de 'Tipo' no permitidos: ${invalidos.join(", ")}`);

  const cats = new Set(filas.map((f) => f.Categoria_Macro));
  const catsInvalidas = [...cats].filter((c) => !CATEGORIAS_MACRO.includes(c as never));
  if (catsInvalidas.length) {
    errores.push(`Valores de 'Categoria_Macro' no permitidos: ${catsInvalidas.join(", ")}`);
  }

  if (filas.some((f) => f.Importe < 0)) {
    errores.push("La columna 'Importe' debe contener solo valores positivos.");
  }
  return errores;
}

/** Columnas del contrato como string[] (para compatibilidad de tipos). */
export const COLUMNAS_CONTRATO: string[] = [...COLUMNAS_EXCEL];
