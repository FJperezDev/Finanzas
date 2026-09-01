"""Exportación del dataset a un Excel real (openpyxl).

Contrato de columnas: Fecha, Tipo, Categoria_Macro, Subcategoria, Concepto,
Importe + cualquier columna adicional conservada en `extras`.
"""
import io

from openpyxl import Workbook
from openpyxl.styles import Font

from .validation import COLUMNAS_EXCEL


def _columnas_extra(filas: list[dict]) -> list[str]:
    """Columnas adicionales, en orden de primera aparición."""
    vistas: list[str] = []
    for fila in filas:
        for clave in fila.keys():
            if clave in COLUMNAS_EXCEL or clave in ("id",):
                continue
            if clave not in vistas:
                vistas.append(clave)
    return vistas


def filas_a_columnas(filas: list[dict]) -> list[str]:
    return COLUMNAS_EXCEL + _columnas_extra(filas)


def construir_excel(filas: list[dict]) -> bytes:
    """Construye el xlsx en memoria y devuelve sus bytes."""
    columnas = filas_a_columnas(filas)
    wb = Workbook()
    hoja = wb.active
    hoja.title = "Transacciones"

    hoja.append(columnas)
    for celda in hoja[1]:
        celda.font = Font(bold=True)

    for fila in filas:
        hoja.append([fila.get(col, "") for col in columnas])

    # Ancho de columnas aproximado para legibilidad
    anchos = {"Fecha": 12, "Tipo": 10, "Categoria_Macro": 20, "Subcategoria": 20, "Concepto": 34, "Cuenta": 18, "Importe": 12}
    for col_idx, col in enumerate(columnas, start=1):
        hoja.column_dimensions[hoja.cell(row=1, column=col_idx).column_letter].width = anchos.get(col, 16)

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
