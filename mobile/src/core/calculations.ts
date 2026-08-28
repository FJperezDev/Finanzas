/**
 * Matemática financiera pura: sin React, sin dependencias de UI.
 * Espejo de `core/calculations.py`.
 */
import { REGLA_50_30_20 } from "./config";
import { anioMesDe } from "./formatos";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export interface FilaTransaccion {
  __id: string;
  Fecha: string; // YYYY-MM-DD
  Tipo: string; // 'Ingreso' | 'Gasto'
  Categoria_Macro: string;
  Subcategoria: string;
  Concepto: string;
  Importe: number;
  Importe_Firmado?: number;
  [extra: string]: unknown;
}

export interface FilaFlujoMensual {
  anio: number;
  mes: number;
  periodo: string; // "2026-01"
  etiqueta: string; // "ene 26"
  Ingresos: number;
  Gastos: number;
  Neto: number;
  Neto_Acumulado: number;
}

export interface FilaDistribucion {
  Categoria_Macro: string;
  Total_Gastado: number;
  Peso_Real: number;
  Peso_Objetivo: number;
}

export interface FilaProyeccion {
  Mes: number;
  Ano: number;
  Aportacion_Acumulada: number;
  Intereses_Generados: number;
  Capital: number;
}

// ---------------------------------------------------------------------------
// Clasificación de inversiones
// ---------------------------------------------------------------------------
/**
 * Clasifica la Subcategoria de un movimiento de 'Inversión':
 *  - "marca_personal": gasto real (resta del patrimonio).
 *  - "remunerada":     transferencia a la cuenta remunerada (no resta).
 *  - "cartera":        transferencia al fondo indexado/cartera (no resta).
 */
export type ClasificacionInversion =
  | "marca_personal"
  | "remunerada"
  | "cartera";

export function clasificarInversion(
  subcategoria: string,
): ClasificacionInversion {
  const sub = (subcategoria ?? "").replace(/[_\s-]+/g, " ").toLowerCase();
  if (sub.includes("marca personal")) return "marca_personal";
  if (sub.includes("remunerada")) return "remunerada";
  return "cartera";
}

/**
 * ¿Es una transferencia a otra cuenta (no corriente)? Solo los gastos de
 * 'Inversión' que NO son 'Marca Personal' se consideran transferencias:
 * el dinero no sale del patrimonio, cambia de cuenta.
 */
export function esTransferenciaInversion(fila: FilaTransaccion): boolean {
  return (
    fila.Tipo === "Gasto" &&
    fila.Categoria_Macro === "Inversión" &&
    clasificarInversion(fila.Subcategoria ?? "") !== "marca_personal"
  );
}

// ---------------------------------------------------------------------------
// Patrimonio acumulado
// ---------------------------------------------------------------------------
export interface FilaPatrimonio {
  balanceCorriente: number;
  aportadoCartera: number;
  aportadoRemunerada: number;
  totalPatrimonio: number;
}

/**
 * Patrimonio acumulado hasta un conjunto de filas.
 *
 * Contabilidad: toda transferencia sale de la cuenta corriente (reduce el
 * balance), pero no reduce el patrimonio: se suma como aportado a su cuenta
 * destino (cartera o remunerada). Solo 'Marca Personal' es un gasto real que
 * destruye patrimonio.
 */
export function patrimonioAcumulado(filas: FilaTransaccion[]): FilaPatrimonio {
  let aportadoCartera = 0;
  let aportadoRemunerada = 0;
  let totalIngresos = 0;
  let totalGastos = 0;

  for (const f of filas) {
    if (f.Tipo === "Ingreso") {
      totalIngresos += f.Importe;
    } else if (f.Tipo === "Gasto") {
      totalGastos += f.Importe;
      if (esTransferenciaInversion(f)) {
        if (clasificarInversion(f.Subcategoria ?? "") === "remunerada") {
          aportadoRemunerada += f.Importe;
        } else {
          aportadoCartera += f.Importe;
        }
      }
    }
  }

  const balanceCorriente = totalIngresos - totalGastos;
  return {
    balanceCorriente,
    aportadoCartera,
    aportadoRemunerada,
    totalPatrimonio: balanceCorriente + aportadoCartera + aportadoRemunerada,
  };
}

// ---------------------------------------------------------------------------
// Flujo de caja mensual
// ---------------------------------------------------------------------------
/** Agrega por mes ingresos, gastos y flujo de caja neto (orden cronológico). */
export function flujoDeCajaMensual(
  filas: FilaTransaccion[],
): FilaFlujoMensual[] {
  const porMes = new Map<
    string,
    { anio: number; mes: number; Ingresos: number; Gastos: number }
  >();

  for (const f of filas) {
    const am = anioMesDe(f.Fecha);
    if (!am) continue;
    const clave = `${am.anio}-${String(am.mes).padStart(2, "0")}`;
    const registro = porMes.get(clave) ?? {
      anio: am.anio,
      mes: am.mes,
      Ingresos: 0,
      Gastos: 0,
    };

    const importeAbsoluto = Math.abs(f.Importe_Firmado ?? f.Importe);

    if (f.Tipo === "Ingreso") registro.Ingresos += importeAbsoluto;
    else if (f.Tipo === "Gasto" && !esTransferenciaInversion(f)) {
      registro.Gastos += importeAbsoluto;
    }
    porMes.set(clave, registro);
  }

  const ordenado = [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b));
  let acumulado = 0;
  return ordenado.map(([periodo, r]) => {
    const neto = r.Ingresos - r.Gastos;
    acumulado += neto;
    return {
      ...r,
      periodo,
      etiqueta: etiquetaCorta(r.anio, r.mes),
      Neto: neto,
      Neto_Acumulado: acumulado,
    };
  });
}

function etiquetaCorta(anio: number, mes: number): string {
  const cortos = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${cortos[mes - 1] ?? "?"} ${String(anio).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Distribución 50/20/30
// ---------------------------------------------------------------------------
/** Peso (%) de cada Categoria_Macro sobre los ingresos totales. */
export function distribucion503020(
  gastos: FilaTransaccion[],
  ingresosTotales: number,
): FilaDistribucion[] {
  const totales = new Map<string, number>();
  for (const g of gastos) {
    totales.set(
      g.Categoria_Macro,
      (totales.get(g.Categoria_Macro) ?? 0) + g.Importe,
    );
  }
  return [...totales.entries()]
    .map(([Categoria_Macro, Total_Gastado]) => ({
      Categoria_Macro,
      Total_Gastado,
      Peso_Real: ingresosTotales > 0 ? Total_Gastado / ingresosTotales : 0,
      Peso_Objetivo: REGLA_50_30_20[Categoria_Macro] ?? 0,
    }))
    .sort((a, b) => b.Total_Gastado - a.Total_Gastado);
}

// ---------------------------------------------------------------------------
// Interés compuesto
// ---------------------------------------------------------------------------
/**
 * Proyecta capital mes a mes con interés compuesto y aportación recurrente.
 * Fórmula: C_{t+1} = C_t * (1 + i) + A, con i = (1 + tasa_anual)^(1/12) - 1.
 */
export function proyectarInteresCompuesto(
  aportacionMensual: number,
  tasaAnual: number,
  anos = 15,
  capitalInicial = 8000,
): FilaProyeccion[] {
  const iMensual = Math.pow(1 + tasaAnual, 1 / 12) - 1;
  let capital = capitalInicial;
  const registros: FilaProyeccion[] = [];

  for (let mes = 0; mes <= anos * 12; mes++) {
    if (mes > 0) capital = capital * (1 + iMensual) + aportacionMensual;
    const aportado = capitalInicial + aportacionMensual * mes;
    registros.push({
      Mes: mes,
      Ano: Math.floor(mes / 12),
      Aportacion_Acumulada: aportado,
      Intereses_Generados: capital - aportado,
      Capital: capital,
    });
  }
  return registros;
}

/** Primer mes (1-indexado) en que un capital desde cero alcanza `objetivo`. */
export function mesParaObjetivo(
  objetivo: number,
  aportacionMensual: number,
  tasaAnual: number,
): { mes: number; capital: number } {
  if (aportacionMensual <= 0) {
    throw new Error(
      "La aportación mensual debe ser > 0 para alcanzar un objetivo.",
    );
  }
  const iMensual = Math.pow(1 + tasaAnual, 1 / 12) - 1;
  let capital = 0;
  let mes = 0;
  while (capital < objetivo && mes < 100_000) {
    mes += 1;
    capital = capital * (1 + iMensual) + aportacionMensual;
  }
  if (capital < objetivo) {
    throw new Error("El objetivo no es alcanzable con estos parámetros.");
  }
  return { mes, capital };
}

// ---------------------------------------------------------------------------
// Hipoteca y pignoración
// ---------------------------------------------------------------------------
/** Cuota mensual fija (sistema francés) de una hipoteca. */
export function cuotaHipotecaria(
  principal: number,
  tasaAnual: number,
  anos = 30,
): number {
  const i = tasaAnual / 12;
  const n = anos * 12;
  if (i === 0) return principal / n;
  return (principal * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1);
}

/** Desglose de la primera cuota: { intereses, amortizacion }. */
export function desgloseHipotecaPrimerMes(
  principal: number,
  tasaAnual: number,
  anos = 30,
): { intereses: number; amortizacion: number } {
  const intereses = principal * (tasaAnual / 12);
  const cuota = cuotaHipotecaria(principal, tasaAnual, anos);
  return { intereses, amortizacion: cuota - intereses };
}

/**
 * Capital mínimo HOY en el fondo indexado para evitar una margin call.
 * Capital * (1 - caída) >= ltv_maximo * deuda_garantizada
 */
export function capitalSeguridadPignoracion(
  deudaGarantizada: number,
  ltvMaximo: number,
  caidaMercado: number,
): number {
  if (caidaMercado >= 1) {
    throw new Error("La caída del mercado debe ser inferior al 100 %.");
  }
  return (ltvMaximo * deudaGarantizada) / (1 - caidaMercado);
}
