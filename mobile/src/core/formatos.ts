/**
 * Helpers de formato y fechas en español.
 * Espejo de los helpers `_fmt_eur` / `_fmt_mes` de los módulos Python.
 */
import { MESES_ES, MESES_ES_CORTO } from "./config";

/** Formatea un número en español con miles (.) y decimales fijos: 1.234,56 */
export function formatoEs(valor: number, decimales = 2): string {
  const [entera, decimal = ""] = Math.abs(valor)
    .toFixed(decimales)
    .split(".");
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimal ? `${conMiles},${decimal}` : conMiles;
}

/** Formatea un importe en euros con dos decimales: 1.250,50 € */
export function fmtEur(valor: number): string {
  const signo = valor < 0 ? "-" : "";
  return `${signo}${formatoEs(valor)} €`;
}

/** Formatea un importe con signo explícito: +800,00 € / −1.200,50 € */
export function fmtEurSigno(valor: number): string {
  const signo = valor >= 0 ? "+" : "−";
  return `${signo}${formatoEs(valor)} €`;
}

/** "Mes N · Año A, mes M" a partir de un ordinal de mes (1-indexado). */
export function fmtMesOrdinal(mes: number): string {
  const ano = Math.floor((mes - 1) / 12) + 1;
  const mesDelAno = ((mes - 1) % 12) + 1;
  return `Mes ${mes} · Año ${ano}, mes ${mesDelAno}`;
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------
const RX_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Comprueba si una cadena es una fecha válida en formato YYYY-MM-DD. */
export function esFechaValida(valor: string): boolean {
  const m = RX_FECHA.exec(valor);
  if (!m) return false;
  const [, y, mo, d] = m.map(Number);
  const fecha = new Date(Date.UTC(y, mo - 1, d));
  return (
    fecha.getUTCFullYear() === y &&
    fecha.getUTCMonth() === mo - 1 &&
    fecha.getUTCDate() === d
  );
}

/** Devuelve la fecha de hoy como string YYYY-MM-DD (hora local). */
export function hoyISO(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  const d = String(hoy.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Año y mes (1-12) de una fecha ISO, o null si es inválida. */
export function anioMesDe(iso: string): { anio: number; mes: number } | null {
  if (!esFechaValida(iso)) return null;
  const [y, m] = iso.split("-").map(Number);
  return { anio: y, mes: m };
}

/** Nombre del mes en español (1-12). */
export function nombreMes(mes: number): string {
  return MESES_ES[mes - 1] ?? "—";
}

/** Etiqueta corta de un periodo mensual: "ene 26". */
export function etiquetaPeriodo(anio: number, mes: number): string {
  return `${MESES_ES_CORTO[mes - 1] ?? "—"} ${String(anio).slice(2)}`;
}

/** Formatea un porcentaje: 0.345 -> "34,5%" */
export function fmtPct(valor: number, decimales = 1): string {
  return `${(valor * 100).toLocaleString("es-ES", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })}%`;
}
