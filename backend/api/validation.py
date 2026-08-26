"""Contrato de dominio del backend (espejo de core/config.py + validación)."""

from datetime import date

COLUMNAS_EXCEL = [
    "Fecha",
    "Tipo",
    "Categoria_Macro",
    "Subcategoria",
    "Concepto",
    "Importe",
]

TIPOS_PERMITIDOS = ["Ingreso", "Gasto"]

CATEGORIAS_MACRO = [
    "Nómina",
    "Regalo",
    "Deuda",
    "Ocio",
    "Inversión",
    "Fijo",
]

NOMBRES_RESERVADOS = set(COLUMNAS_EXCEL) | {"Anio", "Mes", "Periodo", "Importe_Firmado"}

MAX_BACKUPS = 10


def validar_fila(fila: dict, indice: int) -> list[str]:
    """Valida una fila cruda y devuelve la lista de errores de esa fila."""
    errores: list[str] = []

    fecha = fila.get("Fecha")
    try:
        date.fromisoformat(str(fecha))
    except (TypeError, ValueError):
        errores.append(
            f"Fecha vacía o inválida en la fila {indice + 1} (formato YYYY-MM-DD)."
        )

    if fila.get("Tipo") not in TIPOS_PERMITIDOS:
        errores.append(
            f"'Tipo' inválido en la fila {indice + 1}. Permitidos: {', '.join(TIPOS_PERMITIDOS)}."
        )

    if fila.get("Categoria_Macro") not in CATEGORIAS_MACRO:
        errores.append(
            f"'Categoria_Macro' inválida en la fila {indice + 1}. "
            f"Permitidas: {', '.join(CATEGORIAS_MACRO)}."
        )

    importe = fila.get("Importe")
    try:
        valor = float(importe)
        if valor < 0:
            errores.append(
                f"'Importe' negativo en la fila {indice + 1} "
                "(el signo lo dictamina la columna 'Tipo')."
            )
    except (TypeError, ValueError):
        errores.append(f"'Importe' vacío o no numérico en la fila {indice + 1}.")

    for clave, valor in fila.items():
        if clave in COLUMNAS_EXCEL or clave in ("id",):
            continue
        if clave in NOMBRES_RESERVADOS:
            errores.append(
                f"La columna '{clave}' de la fila {indice + 1} es un nombre reservado."
            )
        elif (
            not isinstance(valor, (str, int, float)) or valor is True or valor is False
        ):
            errores.append(
                f"La columna '{clave}' de la fila {indice + 1} debe ser texto o número."
            )

    return errores


def validar_filas(filas: list[dict]) -> list[str]:
    """Valida el dataset completo y devuelve los errores agregados."""
    errores: list[str] = []
    for indice, fila in enumerate(filas):
        errores.extend(validar_fila(fila, indice))
    return errores
