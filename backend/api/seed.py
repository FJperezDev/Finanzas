"""Semilla de datos del backend (espejo de mobile/src/core/seed.ts).

Genera el mismo dataset que el móvil: 8 meses (2025-06 … 2025-12 y Enero
2026) con nómina de 1.600 €, house hacking y ahorro > 50 %. Enero 2026
contiene exactamente la vista descrita del editor:

  1. "Nómina Enero"  · 2.500,00 €  (Ingreso, Nómina)
  2. "Compra Semanal" · 150,00 €   (Gasto, Ocio, Comida)
  3. "Alquiler Piso"  · 1.150,00 € (Gasto, Fijo) → el frontend aplica el
     cambio pendiente a 1.200,00 € (celda G3) al cargar, como en móvil.
"""
import math
import random

# RNG determinista (semilla 42), como np.random.default_rng(42)
RNG = random.Random(42)

NOMINA_NETA = 1600.0
PAGA_EXTRA_NETA = 1350.0
PAGA_EXTRA_INVERTIDA = 800.0
MESES_PAGA_EXTRA = {6, 12}

# (Categoria_Macro, Subcategoria, Concepto, día, base €, volatilidad)
GASTOS_MENSUALES = [
    ("Fijo", "Alquiler", "Alquiler mensual (house hacking)", 3, 350.0, 0.00),
    ("Fijo", "Suministros", "Recibo Iberdrola", 8, 50.0, 0.10),
    ("Fijo", "Transporte", "Abono transporte", 12, 40.0, 0.15),
    ("Fijo", "Telefonia_Internet", "Fibra + móvil", 15, 30.0, 0.05),
    ("Fijo", "Seguros", "Seguro salud", 20, 25.0, 0.05),
    ("Ocio", "Restaurantes", "Salidas fin de semana", 10, 60.0, 0.30),
    ("Ocio", "Ocio_Vario", "Ocio y suscripciones", 22, 40.0, 0.30),
    ("Inversión", "Indexado_SP500", "Transferencia MyInvestor - SP500", 5, 800.0, 0.00),
    ("Inversión", "Cuenta_Remunerada", "Cuenta remunerada MyInvestor", 5, 100.0, 0.05),
]

ENERO_2026 = [
    ("2026-01-01", "Ingreso", "Nómina", "Nómina", "Nómina Enero", 2500.0),
    ("2026-01-10", "Gasto", "Ocio", "Comida", "Compra Semanal", 150.0),
    # Valor guardado 1.150,00 €: el editor arranca con el cambio pendiente a 1.200,00 €
    ("2026-01-15", "Gasto", "Fijo", "Alquiler", "Alquiler Piso", 1150.0),
]


def _importe(base: float, volatilidad: float) -> float:
    if volatilidad == 0.0:
        return round(base, 2)
    return round(base * (1.0 + volatilidad * RNG.gauss(0.0, 1.0)), 2)


def filas_mes(anio: int, mes: int) -> list[tuple]:
    filas = []
    filas.append((f"{anio}-{mes:02d}-01", "Ingreso", "Nómina", "Nómina", "Nómina mensual", _importe(NOMINA_NETA, 0.02)))
    for macro, sub, concepto, dia, base, vol in GASTOS_MENSUALES:
        filas.append((f"{anio}-{mes:02d}-{dia:02d}", "Gasto", macro, sub, concepto, _importe(base, vol)))
    if mes in MESES_PAGA_EXTRA:
        filas.append((f"{anio}-{mes:02d}-15", "Ingreso", "Regalo", "Paga_Extra", "Paga extra", _importe(PAGA_EXTRA_NETA, 0.02)))
        filas.append((f"{anio}-{mes:02d}-16", "Gasto", "Inversión", "Indexado_SP500", "Aportación extraordinaria indexado", PAGA_EXTRA_INVERTIDA))
    return filas


def generar_filas_seed() -> list[dict]:
    """Devuelve la lista completa de filas de la semilla."""
    meses = [(2025, m) for m in range(6, 13)] + [(2026, 1)]
    filas: list[dict] = []
    for anio, mes in meses:
        if anio == 2026 and mes == 1:
            for fecha, tipo, macro, sub, concepto, importe in ENERO_2026:
                filas.append({
                    "Fecha": fecha,
                    "Tipo": tipo,
                    "Categoria_Macro": macro,
                    "Subcategoria": sub,
                    "Concepto": concepto,
                    "Importe": importe,
                })
        else:
            for fecha, tipo, macro, sub, concepto, importe in filas_mes(anio, mes):
                filas.append({
                    "Fecha": fecha,
                    "Tipo": tipo,
                    "Categoria_Macro": macro,
                    "Subcategoria": sub,
                    "Concepto": concepto,
                    "Importe": importe,
                })
    return filas


def importe_entero(importe: float) -> int:
    """Convierte a céntimos enteros para evitar errores de coma flotante."""
    return int(round(importe * 100))


def decimal_importe(cents: int) -> float:
    """Convierte céntimos enteros a euros."""
    return round(cents / 100, 2)


__all__ = [
    "generar_filas_seed",
    "importe_entero",
    "decimal_importe",
    "math",
]
