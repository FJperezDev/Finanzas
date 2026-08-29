"""API REST del backend de Finanzas (JSON puro, sin DRF).

Endpoints:
  GET  /api/transacciones/          → dataset completo + columnas extra
  POST /api/transacciones/guardar/  → validar + backup + reemplazo total
  GET  /api/transacciones/exportar/ → descarga transacciones.xlsx
                                      (?anio=YYYY&mes=MM filtran la descarga)
  GET  /api/health/                 → healthcheck
"""

import base64
import json
import re
import uuid
from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from PIL import Image

from .auth import requiere_token
from .excel import construir_excel, filas_a_columnas
from .models import Backup, Transaccion, Contacto, GastoCompartido, Participacion
from .seed import (
    generar_filas_seed,
    importe_entero,
    generar_contactos_seed,
    generar_gastos_compartidos_seed,
)
from .validation import COLUMNAS_EXCEL, MAX_BACKUPS, validar_filas, CATEGORIAS_MACRO


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
            if (
                clave not in COLUMNAS_EXCEL
                and clave not in ("id", "__id")
                and clave not in vistas
            ):
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
    if Transaccion.objects.exists() or Contacto.objects.exists():
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

    contactos_db = []
    for c_data in generar_contactos_seed():
        contacto = Contacto.objects.create(
            nombre=c_data["nombre"],
            telefono=c_data["telefono"],
            correo=c_data["correo"],
        )
        contactos_db.append(contacto)

    gastos_seed = generar_gastos_compartidos_seed()
    for g_data in gastos_seed:
        pagador = (
            contactos_db[g_data["pagador_index"]]
            if g_data["pagador_index"] is not None
            else None
        )
        importe_total = Decimal(str(g_data["importe_total"]))

        gasto = GastoCompartido.objects.create(
            concepto=g_data["concepto"],
            fecha=date.fromisoformat(g_data["fecha"]),
            importe_total=importe_total,
            categoria_macro=g_data["categoria_macro"],
            subcategoria=g_data["subcategoria"],
            tipo_reparto=g_data["tipo_reparto"],
            pagador=pagador,
        )

        # Si pagaste tú, generamos la transacción espejo
        if pagador is None:
            tx = Transaccion.objects.create(
                fecha=gasto.fecha,
                tipo="Gasto",
                categoria_macro=gasto.categoria_macro,
                subcategoria=gasto.subcategoria,
                concepto=gasto.concepto,
                importe=importe_entero(float(gasto.importe_total)),
            )
            gasto.transaccion = tx
            gasto.save(update_fields=["transaccion"])

        # Generar las participaciones
        if g_data["tipo_reparto"] == "IGUALES":
            # Partes = número de participantes + el pagador (1)
            partes = len(g_data["participantes"]) + 1
            importe_por_persona = (importe_total / partes).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

            for index_participante in g_data["participantes"]:
                Participacion.objects.create(
                    gasto=gasto,
                    contacto=contactos_db[index_participante],
                    importe_debido=importe_por_persona,
                )

        elif g_data["tipo_reparto"] == "EXACTO":
            for part_data in g_data["participantes"]:
                Participacion.objects.create(
                    gasto=gasto,
                    contacto=contactos_db[part_data["contacto_index"]],
                    importe_debido=Decimal(str(part_data["importe_exacto"])),
                )

    return {
        "seed": True,
        "transacciones": len(filas),
        "contactos": len(contactos_db),
        "gastos_compartidos": len(gastos_seed),
    }


@csrf_exempt
@require_POST
@requiere_token
def crear_gasto_compartido(request) -> JsonResponse:
    try:
        cuerpo = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"errores": ["Cuerpo JSON inválido."]}, status=400)

    concepto = str(cuerpo.get("concepto") or "").strip()
    fecha = cuerpo.get("fecha")
    tipo_reparto = cuerpo.get("tipo_reparto")
    pagador_id = cuerpo.get("pagador_id")
    omitir_transaccion = bool(cuerpo.get("omitir_transaccion", False))

    # Extraemos categorías
    categoria_macro = cuerpo.get("categoria_macro")
    subcategoria = str(cuerpo.get("subcategoria") or "")

    participantes = cuerpo.get("participantes", [])

    # --- Validaciones de entrada (se validan todas antes de escribir) ---
    errores: list[str] = []

    if not concepto:
        errores.append("El campo 'concepto' es obligatorio.")

    try:
        fecha_parsed = date.fromisoformat(str(fecha))
    except (TypeError, ValueError):
        errores.append("El campo 'fecha' debe ser una fecha válida (YYYY-MM-DD).")
        fecha_parsed = None

    try:
        importe_total = Decimal(str(cuerpo.get("importe_total", "")))
        if importe_total <= 0:
            errores.append("El campo 'importe_total' debe ser mayor que 0.")
    except (InvalidOperation, ValueError, TypeError):
        importe_total = None
        errores.append("El campo 'importe_total' debe ser un número.")

    if tipo_reparto not in ("IGUALES", "EXACTO"):
        errores.append("El campo 'tipo_reparto' debe ser 'IGUALES' o 'EXACTO'.")

    if categoria_macro not in CATEGORIAS_MACRO:
        errores.append(
            f"'Categoria_Macro' inválida. Permitidas: {', '.join(CATEGORIAS_MACRO)}."
        )

    if not isinstance(participantes, list) or not participantes:
        errores.append("Debe haber al menos un participante.")
        participantes_validos: list[dict] = []
    else:
        participantes_validos = [p for p in participantes if isinstance(p, dict)]
        if len(participantes_validos) != len(participantes):
            errores.append("Cada participante debe ser un objeto con 'contacto_id'.")

        # Comprobamos que el pagador y los participantes existen.
        ids_contacto = {p.get("contacto_id") for p in participantes_validos}
        if pagador_id is not None:
            ids_contacto.add(pagador_id)
        existentes = set(
            Contacto.objects.filter(id__in=ids_contacto).values_list("id", flat=True)
        )
        if pagador_id is not None and pagador_id not in existentes:
            errores.append(f"El pagador (contacto {pagador_id}) no existe.")
        for p in participantes_validos:
            if p.get("contacto_id") not in existentes:
                errores.append(f"El contacto {p.get('contacto_id')} no existe.")

        # En reparto exacto, los importes deben sumar como máximo el total.
        if tipo_reparto == "EXACTO" and importe_total is not None:
            suma = Decimal("0.00")
            importes_ok = True
            for p in participantes_validos:
                try:
                    suma += Decimal(str(p.get("importe_exacto", 0)))
                except (InvalidOperation, ValueError, TypeError):
                    errores.append("Los importes exactos deben ser números.")
                    importes_ok = False
                    break
            if importes_ok and suma > importe_total:
                errores.append("La suma de las partes supera el total.")

    if errores:
        return JsonResponse({"errores": errores}, status=400)

    with transaction.atomic():
        # 1. Crear el registro del gasto compartido
        gasto = GastoCompartido.objects.create(
            concepto=concepto,
            fecha=fecha_parsed,
            importe_total=importe_total,
            categoria_macro=categoria_macro,
            subcategoria=subcategoria,
            tipo_reparto=tipo_reparto,
            pagador_id=pagador_id,
        )

        # 2. Lógica de creación de Transacción (Sólo si pagas tú)
        if pagador_id is None and not omitir_transaccion:
            nueva_transaccion = Transaccion.objects.create(
                fecha=gasto.fecha,
                tipo="Gasto",
                categoria_macro=gasto.categoria_macro,
                subcategoria=gasto.subcategoria,
                concepto=gasto.concepto,
                importe=importe_entero(float(gasto.importe_total)),
            )
            gasto.transaccion = nueva_transaccion
            gasto.save(update_fields=["transaccion"])

        # 3. Lógica de reparto de participaciones (Deudas)
        if tipo_reparto == "IGUALES":
            cantidad_personas = len(participantes_validos) + 1
            importe_por_persona = (importe_total / cantidad_personas).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

            for p in participantes_validos:
                Participacion.objects.create(
                    gasto=gasto,
                    contacto_id=p["contacto_id"],
                    importe_debido=importe_por_persona,
                )

        elif tipo_reparto == "EXACTO":
            for p in participantes_validos:
                importe = Decimal(str(p.get("importe_exacto", 0)))
                Participacion.objects.create(
                    gasto=gasto, contacto_id=p["contacto_id"], importe_debido=importe
                )

    return JsonResponse({"ok": True, "gasto_id": gasto.id})


# ---------------------------------------------------------------------------
# Contactos: serialización y avatares
# ---------------------------------------------------------------------------
FORMATOS_AVATAR = {"PNG": "png", "JPEG": "jpg", "WEBP": "webp"}
TAMANO_MAX_AVATAR = 2 * 1024 * 1024  # 2 MB
RX_DATA_URL = re.compile(r"^data:image/(png|jpeg|webp);base64,(.+)$", re.IGNORECASE)


def contacto_a_dict(contacto: Contacto, request) -> dict:
    """Serializa un contacto, resolviendo la URL absoluta de su avatar."""
    icono = None
    if contacto.icono:
        icono = request.build_absolute_uri(contacto.icono.url)
    return {
        "id": contacto.id,
        "nombre": contacto.nombre,
        "telefono": str(contacto.telefono),
        "correo": contacto.correo,
        "direccion": contacto.direccion,
        "icono": icono,
    }


def _decodificar_avatar(dato) -> tuple[bytes, str]:
    """Valida un avatar en base64 (o data URL) y devuelve (bytes, extensión).

    Lanza `ValueError` con un mensaje legible si el contenido no es una
    imagen soportada o supera el tamaño máximo.
    """
    if not isinstance(dato, str) or not dato:
        raise ValueError("El avatar está vacío.")

    coincidencia = RX_DATA_URL.match(dato.strip())
    if coincidencia:
        extension = coincidencia.group(1).lower()
        crudo = coincidencia.group(2)
    else:
        extension = None
        crudo = dato

    try:
        datos = base64.b64decode(crudo, validate=True)
    except (ValueError, base64.binascii.Error) as exc:
        raise ValueError("El avatar no es un base64 válido.") from exc

    if len(datos) > TAMANO_MAX_AVATAR:
        raise ValueError("El avatar supera el tamaño máximo de 2 MB.")

    try:
        imagen = Image.open(BytesIO(datos))
        formato = (imagen.format or "").upper()
        imagen.verify()
    except Exception as exc:  # noqa: BLE001 - PIL lanza excepciones variadas
        raise ValueError("El archivo no es una imagen válida.") from exc

    if formato not in FORMATOS_AVATAR:
        raise ValueError("Formato de imagen no soportado (usa PNG, JPEG o WebP).")

    extension = extension or FORMATOS_AVATAR[formato]
    return datos, extension


def _guardar_avatar(contacto: Contacto, dato) -> None:
    """Guarda (o reemplaza) el avatar de un contacto desde base64."""
    datos, extension = _decodificar_avatar(dato)
    nombre = f"{uuid.uuid4().hex}.{extension}"
    ruta = Path(settings.MEDIA_ROOT) / "iconos_contactos" / nombre
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_bytes(datos)

    anterior = contacto.icono
    contacto.icono.name = f"iconos_contactos/{nombre}"
    contacto.save(update_fields=["icono"])
    # Eliminamos el avatar anterior solo si el guardado ha ido bien.
    if anterior and anterior.name != contacto.icono.name:
        try:
            anterior.delete(save=False)
        except OSError:
            pass


@require_GET
@requiere_token
def listar_contactos(request) -> JsonResponse:
    """Devuelve la lista de contactos disponibles."""
    contactos = []
    for c in Contacto.objects.all():
        contactos.append(contacto_a_dict(c, request))
    return JsonResponse({"contactos": contactos})


@require_GET
@requiere_token
def listar_gastos_compartidos(_request) -> JsonResponse:
    """Devuelve el historial de gastos compartidos y sus deudas."""
    # Usamos prefetch_related para no hacer una query a BD por cada gasto (optimización)
    gastos_db = GastoCompartido.objects.prefetch_related("participaciones").all()
    gastos_serializados = []

    for g in gastos_db:
        participaciones = [
            {
                "id": p.id,
                "contacto_id": p.contacto_id,
                "importe_debido": float(p.importe_debido),
                "importe_saldado": float(p.importe_saldado),
                "saldado": p.saldado,
                "perdonado": p.perdonado,
            }
            for p in g.participaciones.all()
        ]

        gastos_serializados.append(
            {
                "id": g.id,
                "concepto": g.concepto,
                "fecha": g.fecha.isoformat(),
                "importe_total": float(g.importe_total),
                "categoria_macro": g.categoria_macro,
                "subcategoria": g.subcategoria,
                "tipo_reparto": g.tipo_reparto,
                "pagador_id": g.pagador_id,
                "mi_parte_saldada": g.mi_parte_saldada,
                "mi_parte_saldada_importe": float(g.mi_parte_saldada_importe),
                "mi_parte_perdonada": g.mi_parte_perdonada,
                "participaciones": participaciones,
            }
        )

    return JsonResponse({"gastos": gastos_serializados})


@csrf_exempt
@require_POST
@requiere_token
def crear_contacto(request) -> JsonResponse:
    try:
        cuerpo = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"errores": ["Cuerpo JSON inválido."]}, status=400)

    nombre = str(cuerpo.get("nombre") or "").strip()
    telefono = str(cuerpo.get("telefono") or "").strip()
    correo = cuerpo.get("correo")
    direccion = str(cuerpo.get("direccion") or "").strip()
    icono = cuerpo.get("icono")

    if not nombre or not telefono:
        return JsonResponse(
            {"errores": ["El nombre y el teléfono son obligatorios."]}, status=400
        )

    try:
        with transaction.atomic():
            contacto = Contacto.objects.create(
                nombre=nombre,
                telefono=telefono,
                correo=correo if correo else None,
                direccion=direccion,
            )
            if icono:
                _guardar_avatar(contacto, icono)
    except ValueError as exc:
        return JsonResponse({"errores": [str(exc)]}, status=400)
    except Exception:
        return JsonResponse(
            {
                "errores": [
                    "No se pudo guardar. Revisa que el teléfono incluya el prefijo (+34...) y no esté repetido."
                ]
            },
            status=400,
        )

    return JsonResponse({"ok": True, "contacto": contacto_a_dict(contacto, request)})


@csrf_exempt
@require_POST
@requiere_token
def subir_avatar(request, contacto_id: int) -> JsonResponse:
    """Actualiza el avatar de un contacto (base64 o data URL en JSON)."""
    try:
        contacto = Contacto.objects.get(id=contacto_id)
    except Contacto.DoesNotExist:
        return JsonResponse(
            {"errores": ["El contacto no existe o ya fue eliminado."]}, status=404
        )

    try:
        cuerpo = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"errores": ["Cuerpo JSON inválido."]}, status=400)

    icono = cuerpo.get("icono")
    if icono is None:
        # Enviar `icono: null` elimina el avatar actual.
        if contacto.icono:
            contacto.icono.delete(save=True)
        contacto.icono = None
        contacto.save(update_fields=["icono"])
    else:
        try:
            _guardar_avatar(contacto, icono)
        except ValueError as exc:
            return JsonResponse({"errores": [str(exc)]}, status=400)

    return JsonResponse({"ok": True, "contacto": contacto_a_dict(contacto, request)})


@csrf_exempt
@require_POST
@requiere_token
def eliminar_contacto(request, contacto_id: int) -> JsonResponse:
    try:
        contacto = Contacto.objects.get(id=contacto_id)
        contacto.delete()
        return JsonResponse({"ok": True})
    except Contacto.DoesNotExist:
        return JsonResponse(
            {"errores": ["El contacto no existe o ya fue eliminado."]}, status=404
        )
    except Exception as e:
        return JsonResponse({"errores": [f"Error al eliminar: {str(e)}"]}, status=500)


# ---------------------------------------------------------------------------
# Saldo de deudas
# ---------------------------------------------------------------------------
def _mi_parte_inferida(gasto: GastoCompartido) -> Decimal:
    """Parte que le corresponde al usuario principal en un gasto ajeno.

    Cuando paga otra persona, las participaciones listan a los demás
    deudores; lo que falta hasta el total se asume que es tu parte.
    """
    suma_otros = sum(
        (p.importe_debido for p in gasto.participaciones.all()),
        Decimal("0.00"),
    )
    return max(gasto.importe_total - suma_otros, Decimal("0.00"))


def _pendiente_mi_parte(gasto: GastoCompartido) -> Decimal:
    """Parte del usuario aún no saldada en un gasto pagado por otra persona."""
    pendiente = _mi_parte_inferida(gasto) - gasto.mi_parte_saldada_importe
    return pendiente if pendiente > 0 else Decimal("0.00")


@csrf_exempt
@require_POST
@requiere_token
def saldar_gasto_compartido(request) -> JsonResponse:
    """Salda cuentas con un contacto: transferencia (pago/cobro) o perdón.

    Body:
      - contacto_id (obligatorio)
      - importe (opcional): dinero que cambia de manos. Por defecto, el saldo
        neto. Si supera el saldo, el exceso vuelca la balanza: si te pagan de
        más pasas a deberles, y si pagas de más ellos pasan a deberte.
      - registrar_transaccion (bool, defecto True): si True se registra la
        transacción espejo (ingreso si te pagan, gasto si pagas). Si False la
        cantidad se considera "perdonada": se salda sin mover dinero (y no se
        vuelca la balanza).

    El saldo se aplica FIFO: primero lo más antiguo.
    """
    try:
        cuerpo = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"errores": ["Cuerpo JSON inválido."]}, status=400)

    try:
        contacto_id = int(cuerpo.get("contacto_id"))
    except (TypeError, ValueError):
        return JsonResponse(
            {"errores": ["El campo 'contacto_id' es obligatorio."]}, status=400
        )

    registrar_transaccion = bool(cuerpo.get("registrar_transaccion", True))

    importe_solicitado = None
    if cuerpo.get("importe") not in (None, ""):
        try:
            importe_solicitado = Decimal(str(cuerpo.get("importe")))
        except (InvalidOperation, ValueError, TypeError):
            return JsonResponse(
                {"errores": ["El campo 'importe' debe ser un número."]}, status=400
            )
        if importe_solicitado <= 0:
            return JsonResponse(
                {"errores": ["El campo 'importe' debe ser mayor que 0."]}, status=400
            )

    try:
        contacto = Contacto.objects.get(id=contacto_id)
    except Contacto.DoesNotExist:
        return JsonResponse(
            {"errores": ["El contacto no existe o ya fue eliminado."]}, status=404
        )

    with transaction.atomic():
        # Lo que te deben (tú pagaste): participaciones del contacto.
        participaciones = list(
            Participacion.objects.filter(
                contacto=contacto, gasto__pagador__isnull=True
            )
            .select_related("gasto")
            .order_by("gasto__fecha", "gasto__id", "id")
        )

        # Lo que debes (pagó el contacto): tu parte inferida en sus gastos.
        gastos_ajenos = list(
            GastoCompartido.objects.filter(pagador=contacto)
            .prefetch_related("participaciones")
            .order_by("fecha", "id")
        )

        me_deben = sum((p.pendiente for p in participaciones), Decimal("0.00"))
        le_debo = sum((_pendiente_mi_parte(g) for g in gastos_ajenos), Decimal("0.00"))
        neto = me_deben - le_debo

        perdonar = not registrar_transaccion

        # ------------------------------------------------------------------
        # PERDÓN: se salda sin mover dinero y sin volcar la balanza.
        # ------------------------------------------------------------------
        if perdonar:
            importe_a = min(
                importe_solicitado if importe_solicitado is not None else abs(neto),
                abs(neto),
            )
            restante = importe_a
            if neto > 0:
                for p in participaciones:
                    if restante <= 0:
                        break
                    aplicar = min(restante, p.pendiente)
                    p.importe_saldado += aplicar
                    p.saldado = p.importe_saldado >= p.importe_debido
                    p.perdonado = True
                    p.save(update_fields=["importe_saldado", "saldado", "perdonado"])
                    restante -= aplicar
            elif neto < 0:
                for g in gastos_ajenos:
                    if restante <= 0:
                        break
                    aplicar = min(restante, _pendiente_mi_parte(g))
                    g.mi_parte_saldada_importe += aplicar
                    g.mi_parte_saldada = (
                        g.mi_parte_saldada_importe >= _mi_parte_inferida(g)
                    )
                    g.mi_parte_perdonada = True
                    g.save(
                        update_fields=[
                            "mi_parte_saldada_importe",
                            "mi_parte_saldada",
                            "mi_parte_perdonada",
                        ]
                    )
                    restante -= aplicar

            return JsonResponse(
                {
                    "ok": True,
                    "importe": float(importe_a),
                    "tipo": None,
                    "perdonado": True,
                    "exceso": 0.0,
                    "transaccion": None,
                }
            )

        # ------------------------------------------------------------------
        # TRANSFERENCIA: el dinero cambia de manos; el exceso vuelca el saldo.
        # ------------------------------------------------------------------
        importe_a = (
            importe_solicitado if importe_solicitado is not None else abs(neto)
        )
        if importe_a <= 0:
            return JsonResponse(
                {
                    "ok": True,
                    "importe": 0.0,
                    "tipo": None,
                    "perdonado": False,
                    "exceso": 0.0,
                    "transaccion": None,
                }
            )

        exceso = Decimal("0.00")
        tipo = "Ingreso" if neto >= 0 else "Gasto"

        if neto >= 0:
            # Te pagan: primero saldan lo que te deben…
            restante = importe_a
            for p in participaciones:
                if restante <= 0:
                    break
                aplicar = min(restante, p.pendiente)
                p.importe_saldado += aplicar
                p.saldado = p.importe_saldado >= p.importe_debido
                p.save(update_fields=["importe_saldado", "saldado"])
                restante -= aplicar
            exceso = restante
            # …y si pagan de más, pasas a deberles.
            if exceso > 0:
                GastoCompartido.objects.create(
                    concepto=f"Saldo a favor de {contacto.nombre}",
                    fecha=timezone.localdate(),
                    importe_total=exceso,
                    categoria_macro="Deuda",
                    subcategoria="Saldar",
                    tipo_reparto="EXACTO",
                    pagador=contacto,
                )
        else:
            # Pagas: primero saldas lo que les debes…
            restante = importe_a
            for g in gastos_ajenos:
                if restante <= 0:
                    break
                aplicar = min(restante, _pendiente_mi_parte(g))
                g.mi_parte_saldada_importe += aplicar
                g.mi_parte_saldada = g.mi_parte_saldada_importe >= _mi_parte_inferida(g)
                g.save(update_fields=["mi_parte_saldada_importe", "mi_parte_saldada"])
                restante -= aplicar
            exceso = restante
            # …y si pagas de más, ellos pasan a deberte.
            if exceso > 0:
                gasto = GastoCompartido.objects.create(
                    concepto="Saldo a tu favor",
                    fecha=timezone.localdate(),
                    importe_total=exceso,
                    categoria_macro="Deuda",
                    subcategoria="Saldar",
                    tipo_reparto="EXACTO",
                    pagador=None,
                )
                Participacion.objects.create(
                    gasto=gasto, contacto=contacto, importe_debido=exceso
                )

        transaccion_id = None
        tx = Transaccion.objects.create(
            fecha=timezone.localdate(),
            tipo=tipo,
            categoria_macro="Deuda",
            subcategoria="Saldar",
            concepto=f"Saldar cuentas con {contacto.nombre}",
            importe=importe_entero(float(importe_a)),
        )
        transaccion_id = tx.id

    return JsonResponse(
        {
            "ok": True,
            "importe": float(importe_a),
            "tipo": tipo,
            "perdonado": False,
            "exceso": float(exceso),
            "transaccion": transaccion_id,
        }
    )


@csrf_exempt
@require_POST
@requiere_token
def actualizar_participacion(request, participacion_id: int) -> JsonResponse:
    """Saldar/reabrir una participación individual.

    Body opcional:
      - saldado (bool): si es True se salda por completo, si es False se
        reabre (importe_saldado = 0).
      - perdonado (bool): marca si el saldo se hizo sin movimiento de dinero.
    """
    try:
        participacion = Participacion.objects.get(id=participacion_id)
    except Participacion.DoesNotExist:
        return JsonResponse(
            {"errores": ["La participación no existe."]}, status=404
        )

    try:
        cuerpo = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"errores": ["Cuerpo JSON inválido."]}, status=400)

    saldado = bool(cuerpo.get("saldado", True))
    participacion.saldado = saldado
    participacion.importe_saldado = (
        participacion.importe_debido if saldado else Decimal("0.00")
    )
    if not saldado:
        participacion.perdonado = False
    elif "perdonado" in cuerpo:
        participacion.perdonado = bool(cuerpo["perdonado"])
    participacion.save(update_fields=["saldado", "importe_saldado", "perdonado"])

    return JsonResponse(
        {
            "ok": True,
            "id": participacion.id,
            "contacto_id": participacion.contacto_id,
            "importe_debido": float(participacion.importe_debido),
            "importe_saldado": float(participacion.importe_saldado),
            "saldado": participacion.saldado,
            "perdonado": participacion.perdonado,
        }
    )
