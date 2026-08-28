/**
 * Semilla de datos: genera `transacciones.xlsx` si no existe.
 *
 * Replica el perfil de `generate_mock_data.py` (nómina 1.600 €, house
 * hacking, ahorro > 50 %) e incluye la vista descrita para el editor:
 * Enero 2026 con "Nómina Enero" 2.500,00 €, "Compra Semanal" 150,00 € y
 * "Alquiler Piso" con un cambio pendiente (1.150,00 → 1.200,00 €).
 */
import { COLUMNAS_EXCEL } from "./config";

export interface FilaSeed {
  Fecha: string;
  Tipo: string;
  Categoria_Macro: string;
  Subcategoria: string;
  Concepto: string;
  Importe: number;
}

// ---------------------------------------------------------------------------
// RNG determinista (semilla 42), como np.random.default_rng(42)
// ---------------------------------------------------------------------------
function crearRng(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const RNG = crearRng(42);

function importe(base: number, volatilidad: number): number {
  if (volatilidad === 0) return base;
  // Aproximación de ruido gaussiano por suma de uniformes (Box-Muller simple).
  const u1 = Math.max(RNG(), 1e-9);
  const u2 = Math.max(RNG(), 1e-9);
  const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.round(base * (1 + volatilidad * gauss) * 100) / 100;
}

const NOMINA_NETA = 1600.0;
const PAGA_EXTRA_NETA = 1350.0;
const PAGA_EXTRA_INVERTIDA = 800.0;
const MESES_PAGA_EXTRA = new Set([6, 12]);

// (Categoria_Macro, Subcategoria, Concepto, día, base €, volatilidad)
const GASTOS_MENSUALES: [string, string, string, number, number, number][] = [
  ["Fijo", "Alquiler", "Alquiler mensual (house hacking)", 3, 350.0, 0.0],
  ["Fijo", "Suministros", "Recibo Iberdrola", 8, 50.0, 0.1],
  ["Fijo", "Transporte", "Abono transporte", 12, 40.0, 0.15],
  ["Fijo", "Telefonia_Internet", "Fibra + móvil", 15, 30.0, 0.05],
  ["Fijo", "Seguros", "Seguro salud", 20, 25.0, 0.05],
  ["Ocio", "Restaurantes", "Salidas fin de semana", 10, 60.0, 0.3],
  ["Ocio", "Ocio_Vario", "Ocio y suscripciones", 22, 40.0, 0.3],
  [
    "Inversión",
    "Indexado_SP500",
    "Transferencia MyInvestor - SP500",
    5,
    800.0,
    0.0,
  ],
  [
    "Inversión",
    "Cuenta_Remunerada",
    "Cuenta remunerada MyInvestor",
    5,
    100.0,
    0.05,
  ],
];

function filasMes(anio: number, mes: number): FilaSeed[] {
  const filas: FilaSeed[] = [];
  const fila = (
    tipo: string,
    macro: string,
    sub: string,
    concepto: string,
    dia: number,
    valor: number,
  ) => {
    filas.push({
      Fecha: `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
      Tipo: tipo,
      Categoria_Macro: macro,
      Subcategoria: sub,
      Concepto: concepto,
      Importe: valor,
    });
  };

  fila(
    "Ingreso",
    "Nómina",
    "Nomina",
    "Nómina mensual",
    1,
    importe(NOMINA_NETA, 0.02),
  );
  for (const [macro, sub, concepto, dia, base, vol] of GASTOS_MENSUALES) {
    fila("Gasto", macro, sub, concepto, dia, importe(base, vol));
  }
  if (MESES_PAGA_EXTRA.has(mes)) {
    fila(
      "Ingreso",
      "Regalo",
      "Paga_Extra",
      "Paga extra",
      15,
      importe(PAGA_EXTRA_NETA, 0.02),
    );
    fila(
      "Gasto",
      "Inversión",
      "Indexado_SP500",
      "Aportación extraordinaria indexado",
      16,
      PAGA_EXTRA_INVERTIDA,
    );
  }
  return filas;
}

// ---------------------------------------------------------------------------
// Enero 2026: la vista descrita del módulo editor
// ---------------------------------------------------------------------------
const ENERO_2026: FilaSeed[] = [
  {
    Fecha: "2026-01-01",
    Tipo: "Ingreso",
    Categoria_Macro: "Nómina",
    Subcategoria: "Nómina",
    Concepto: "Nómina Enero",
    Importe: 2500.0,
  },
  {
    Fecha: "2026-01-10",
    Tipo: "Gasto",
    Categoria_Macro: "Ocio",
    Subcategoria: "Comida",
    Concepto: "Compra Semanal",
    Importe: 150.0,
  },
  // Valor guardado 1.150,00 €: el editor arranca con el cambio pendiente a 1.200,00 €
  {
    Fecha: "2026-01-15",
    Tipo: "Gasto",
    Categoria_Macro: "Fijo",
    Subcategoria: "Alquiler",
    Concepto: "Alquiler Piso",
    Importe: 1150.0,
  },
];

/** Marca del cambio pendiente inicial del editor (celda G3 en la vista). */
export const SEED_CAMBIO_PENDIENTE = {
  concepto: "Alquiler Piso",
  fecha: "2026-01-15",
  importeGuardado: 1150.0,
  importePendiente: 1200.0,
};

// ---------------------------------------------------------------------------
// Generación
// ---------------------------------------------------------------------------
export function generarFilasSeed(): FilaSeed[] {
  const meses: { anio: number; mes: number }[] = [];
  for (let mes = 6; mes <= 12; mes++) meses.push({ anio: 2025, mes });
  meses.push({ anio: 2026, mes: 1 });

  const filas: FilaSeed[] = [];
  for (const { anio, mes } of meses) {
    if (anio === 2026 && mes === 1) {
      filas.push(...ENERO_2026);
    } else {
      filas.push(...filasMes(anio, mes));
    }
  }
  return filas;
}

export const SEED_COLUMNAS = COLUMNAS_EXCEL;
