/**
 * Constantes de dominio de la aplicación Finanzas (React Native).
 *
 * Espejo de `core/config.py`: centraliza el contrato de datos del Excel
 * y los parámetros financieros por defecto.
 */

// ---------------------------------------------------------------------------
// Esquema del Excel (contrato de columnas)
// ---------------------------------------------------------------------------
export const COLUMNAS_EXCEL = [
  "Fecha",
  "Tipo",
  "Categoria_Macro",
  "Subcategoria",
  "Concepto",
  "Cuenta",
  "Importe",
] as const;

/** Etiquetas visibles en la cuadrícula (Categoría, no Categoria_Macro). */
export const ETIQUETAS_COLUMNA: Record<string, string> = {
  Fecha: "Fecha",
  Tipo: "Tipo",
  Categoria_Macro: "Categoría",
  Subcategoria: "Subcategoría",
  Concepto: "Concepto",
  Cuenta: "Cuenta",
  Importe: "Importe",
};

export const TIPOS_PERMITIDOS = ["Ingreso", "Gasto"] as const;
export type TipoMovimiento = (typeof TIPOS_PERMITIDOS)[number];

export const CATEGORIAS_MACRO = [
  "Nómina",
  "Regalo",
  "Deuda",
  "Ocio",
  "Inversión",
  "Fijo",
] as const;

export const COLUMNAS_AYUDA = ["Anio", "Mes"] as const;
export const NOMBRES_RESERVADOS = new Set<string>([
  ...COLUMNAS_EXCEL,
  ...COLUMNAS_AYUDA,
  "Periodo",
  "Importe_Firmado",
]);

// ---------------------------------------------------------------------------
// Regla 50/20/30 (Necesidades / Ahorro / Ocio)
// ---------------------------------------------------------------------------
export const REGLA_50_30_20: Record<string, number> = {
  Fijo: 0.3, // 30% necesidades
  Inversión: 0.5, // 50% ahorro (superable en perfil agresivo)
  Ocio: 0.2, // 20% ocio
};

// ---------------------------------------------------------------------------
// Umbrales y alertas
// ---------------------------------------------------------------------------
export const UMBRAL_FIJOS_ALERTA = 0.5; // Alerta si 'Fijos' > 50% de los ingresos

// ---------------------------------------------------------------------------
// Parámetros financieros por defecto
// ---------------------------------------------------------------------------
export const APORTACION_MENSUAL_DEFAULT = 800.0;
export const TASA_ANUAL_DEFAULT = 0.07; // 7% nominal anual
export const ANOS_PROYECCION = 15;
export const COLCHON_FINANCIERO = 8000.0;

export const PRECIO_VIVIENDA_DEFAULT = 250_000.0;
export const LTV_HIPOTECA_DEFAULT = 0.7; // 70% financiado, 30% de entrada
export const TIN_DEFAULT = 0.025; // TIN anual 2,50%
export const PLAZO_HIPOTECA_DEFAULT = 30; // Años
export const ALQUILER_DEFAULT = 800.0; // €/mes por 2 habitaciones
export const GASTOS_PISO_DEFAULT = 300.0; // €/mes comunidad + IBI + seguros
export const LTV_MAX_BANCO_DEFAULT = 0.5; // LTV máximo del banco para renta variable
export const CAIDA_MERCADO_STRESS = 0.5; // Test de estrés: -50% del fondo

// ---------------------------------------------------------------------------
// Archivos
// ---------------------------------------------------------------------------
export const EXCEL_FILENAME = "transacciones.xlsx";
export const BACKUP_FILENAME = "transacciones_backup.xlsx";

// ---------------------------------------------------------------------------
// Meses en español
// ---------------------------------------------------------------------------
export const MESES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const MESES_ES_CORTO = [
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
] as const;
