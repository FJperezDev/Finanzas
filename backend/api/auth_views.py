"""Vistas de autenticación: login, refresco de token y cierre de sesión."""

import json
import uuid
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .auth import credenciales_validas, emitir_token, verificar_token
from .models import RefreshToken

# Protección de fuerza bruta en el login: N intentos fallidos por IP antes
# de bloquear durante una ventana de tiempo.
MAX_INTENTOS_LOGIN = 5
VENTANA_LOGIN_SEGUNDOS = 15 * 60


def _cuerpo_json(request) -> dict | None:
    try:
        cuerpo = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
    return cuerpo if isinstance(cuerpo, dict) else None


def _emitir_par(usuario: str) -> dict:
    """Emite un nuevo par access+refresh y persiste el refresh para revocarlo."""
    # Limpieza oportunista de refrescos caducados o revocados.
    RefreshToken.objects.filter(
        expiracion__lt=timezone.now(),
    ).delete()

    jti = uuid.uuid4().hex
    access = emitir_token(
        "access", usuario, settings.FINANZAS_ACCESS_TOKEN_MINUTES
    )
    refresh = emitir_token(
        "refresh",
        usuario,
        settings.FINANZAS_REFRESH_TOKEN_DAYS * 1440,
        jti=jti,
    )
    RefreshToken.objects.create(
        jti=jti,
        usuario=usuario,
        expiracion=timezone.now() + timedelta(days=settings.FINANZAS_REFRESH_TOKEN_DAYS),
    )
    return {"access": access, "refresh": refresh, "usuario": usuario}


@csrf_exempt
@require_POST
def login(request) -> JsonResponse:
    cuerpo = _cuerpo_json(request)
    if cuerpo is None:
        return JsonResponse({"errores": ["Cuerpo JSON inválido."]}, status=400)

    usuario = str(cuerpo.get("username") or "").strip()
    contrasena = str(cuerpo.get("password") or "")

    clave = f"login:intentos:{request.META.get('REMOTE_ADDR', 'desconocida')}"
    intentos = cache.get(clave, 0)
    if intentos >= MAX_INTENTOS_LOGIN:
        return JsonResponse(
            {
                "errores": [
                    "Demasiados intentos fallidos. Espera unos minutos antes de reintentar."
                ]
            },
            status=429,
        )

    if not credenciales_validas(usuario, contrasena):
        cache.set(clave, intentos + 1, VENTANA_LOGIN_SEGUNDOS)
        return JsonResponse({"errores": ["Credenciales inválidas."]}, status=401)

    cache.delete(clave)
    return JsonResponse(_emitir_par(usuario))


@csrf_exempt
@require_POST
def refrescar(request) -> JsonResponse:
    """Rota el refresh token: revoca el usado y emite un par nuevo."""
    cuerpo = _cuerpo_json(request)
    if cuerpo is None:
        return JsonResponse({"errores": ["Cuerpo JSON inválido."]}, status=400)

    refresh = str(cuerpo.get("refresh") or "")
    payload = verificar_token(refresh, "refresh")
    if payload is None:
        return JsonResponse({"errores": ["Token de refresco inválido o caducado."]}, status=401)

    jti = payload.get("jti")
    token_bd = RefreshToken.objects.filter(jti=jti, revocado=False).first()
    if token_bd is None:
        return JsonResponse({"errores": ["Token de refresco revocado."]}, status=401)

    token_bd.revocado = True
    token_bd.save(update_fields=["revocado"])

    return JsonResponse(_emitir_par(payload["usuario"]))


@csrf_exempt
@require_POST
def cerrar_sesion(request) -> JsonResponse:
    """Revoca el refresh token; responde ok aunque ya fuera inválido."""
    cuerpo = _cuerpo_json(request) or {}
    refresh = str(cuerpo.get("refresh") or "")
    payload = verificar_token(refresh, "refresh")
    if payload is not None:
        RefreshToken.objects.filter(jti=payload.get("jti")).update(revocado=True)
    return JsonResponse({"ok": True})
