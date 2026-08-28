"""API REST del backend de Finanzas (JSON puro, sin DRF).

Endpoints:
  GET  /api/transacciones/          → dataset completo + columnas extra
  POST /api/transacciones/guardar/  → validar + backup + reemplazo total
  GET  /api/transacciones/exportar/ → descarga transacciones.xlsx
                                      (?anio=YYYY&mes=MM filtran la descarga)
  GET  /api/health/                 → healthcheck
"""

import json
from datetime import date

from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .auth import requiere_token
from .excel import construir_excel, filas_a_columnas
from .models import Backup, Transaccion
from .seed import generar_filas_seed, importe_entero
from .validation import COLUMNAS_EXCEL, MAX_BACKUPS, validar_filas


# ---------------------------------------------------------------------------
# Serialización
# ---------------------------------------------------------------------------
def fila_a_dict(t: Transaccion) -> dict:
    datos = {
        "__id": str(t.id),
        "Fecha": t.fecha.isoformat(),
        "Tipo": t.tipo,
        "Categoria_Macro": t.categoria_macro,
        "Subcategoria": t.subcategoria,
        "Concepto": t.concepto,
        "Importe": float(t.importe) / 100,
    }

    datos.update(t.extras or {})
    return datos


def columnas_extra_de(filas: list[dict]) -> list[str]:
    vistas: list[str] = []
    for fila in filas:
        for clave in fila.keys():
            if clave not in COLUMNAS_EXCEL and clave != "id" and clave not in vistas:
                vistas.append(clave)
    return vistas


def _guardar_backup(filas_previas: list[dict]) -> None:
    Backup.objects.create(filas=filas_previas)
    # Conservar solo los últimos N backups
    for antiguo in Backup.objects.all()[MAX_BACKUPS:]:
        antiguo.delete()


# ---------------------------------------------------------------------------
# Vistas
# ---------------------------------------------------------------------------
@require_GET
@requiere_token
def listar_transacciones(_request) -> JsonResponse:
    filas = [fila_a_dict(t) for t in Transaccion.objects.all()]
    return JsonResponse({"filas": filas, "columnas_extra": columnas_extra_de(filas)})


@csrf_exempt
@require_POST
@requiere_token
def guardar_transacciones(request) -> JsonResponse:
    """Reemplaza el dataset completo previa validación, con backup previo."""
    try:
        cuerpo = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"errores": ["Cuerpo JSON inválido."]}, status=400)

    filas = cuerpo.get("filas")
    if not isinstance(filas, list):
        return JsonResponse(
            {"errores": ["El campo 'filas' debe ser una lista."]}, status=400
        )

    errores = validar_filas(filas)
    if errores:
        return JsonResponse({"errores": errores[:20]}, status=400)

    # Backup + reemplazo en una única transacción: si algo falla a mitad,
    # la BD queda exactamente como estaba.
    with transaction.atomic():
        filas_previas = [fila_a_dict(t) for t in Transaccion.objects.all()]
        _guardar_backup(filas_previas)

        Transaccion.objects.all().delete()
        for fila in filas:
            extras = {}
            for clave, valor in fila.items():
                if clave not in COLUMNAS_EXCEL and clave != "id":
                    extras[clave] = "" if valor is None else valor
            Transaccion.objects.create(
                fecha=date.fromisoformat(fila["Fecha"]),
                tipo=fila["Tipo"],
                categoria_macro=fila["Categoria_Macro"],
                subcategoria=str(fila.get("Subcategoria") or ""),
                concepto=str(fila.get("Concepto") or ""),
                importe=importe_entero(float(fila["Importe"])),
                extras=extras,
            )

    return JsonResponse(
        {"ok": True, "filas": len(filas), "backup": len(filas_previas) > 0}
    )


def _param_entero(valor):
    """Convierte un query param en entero, o None si no se envía."""
    if valor is None or valor == "":
        return None
    return int(valor)


def _nombre_exportacion(anio, mes):
    if anio is None:
        return "transacciones.xlsx"
    sufijo_mes = f"_{mes:02d}" if mes is not None else ""
    return f"transacciones_{anio}{sufijo_mes}.xlsx"


@require_GET
@requiere_token
def exportar_transacciones(request) -> HttpResponse:
    """Descarga el Excel, opcionalmente filtrado por año/mes.

    El xlsx solo se construye aquí, bajo demanda de descarga; la base de
    datos es la única fuente persistente y nunca se escribe ningún archivo.
    """
    try:
        anio = _param_entero(request.GET.get("anio"))
        mes = _param_entero(request.GET.get("mes"))
    except ValueError:
        return JsonResponse(
            {"errores": ["Los filtros 'anio' y 'mes' deben ser números enteros."]},
            status=400,
        )

    if mes is not None and not 1 <= mes <= 12:
        return JsonResponse(
            {"errores": ["El filtro 'mes' debe estar entre 1 y 12."]}, status=400
        )

    consulta = Transaccion.objects.all()
    if anio is not None:
        consulta = consulta.filter(fecha__year=anio)
    if mes is not None:
        consulta = consulta.filter(fecha__month=mes)

    filas = [fila_a_dict(t) for t in consulta]
    bytes_xlsx = construir_excel(filas)
    respuesta = HttpResponse(
        bytes_xlsx,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    respuesta["Content-Disposition"] = (
        f'attachment; filename="{_nombre_exportacion(anio, mes)}"'
    )
    return respuesta


@require_GET
def health(_request) -> JsonResponse:
    total = Transaccion.objects.count()
    return JsonResponse({"ok": True, "transacciones": total})


# ---------------------------------------------------------------------------
# Semilla bajo demanda (si la BD está vacía)
# ---------------------------------------------------------------------------
def seed_initial() -> dict:
    if Transaccion.objects.exists():
        return {"seed": False}
    filas = generar_filas_seed()
    for fila in filas:
        Transaccion.objects.create(
            fecha=date.fromisoformat(fila["Fecha"]),
            tipo=fila["Tipo"],
            categoria_macro=fila["Categoria_Macro"],
            subcategoria=fila["Subcategoria"],
            concepto=fila["Concepto"],
            importe=importe_entero(fila["Importe"]),
        )
    return {"seed": True, "filas": len(filas)}
