"""Autenticación: tokens de acceso y refresco JWT (HS256, PyJWT).

  - access:  expiración corta (FINANZAS_ACCESS_TOKEN_MINUTES).
  - refresh: expiración larga (FINANZAS_REFRESH_TOKEN_DAYS), con `jti`
    persistido en BD para poder revocarlo al cerrar sesión y rotarlo
    en cada refresco.

Las credenciales del usuario administrador se leen de variables de
entorno (FINANZAS_ADMIN_USERNAME / FINANZAS_ADMIN_PASSWORD).
"""

import hmac
import time

import jwt
from django.conf import settings
from django.http import JsonResponse


# ---------------------------------------------------------------------------
# Emisión y verificación
# ---------------------------------------------------------------------------
def emitir_token(
    tipo: str,
    usuario: str,
    minutos_validez: int,
    jti: str | None = None,
) -> str:
    ahora = int(time.time())
    payload = {
        "tipo": tipo,
        "usuario": usuario,
        "iat": ahora,
        "exp": ahora + minutos_validez * 60,
    }
    if jti:
        payload["jti"] = jti

    return jwt.encode(
        payload, settings.FINANZAS_TOKEN_SECRET, algorithm="HS256"
    )


def verificar_token(token: str, tipo_esperado: str) -> dict | None:
    """Devuelve el payload si el token es válido, o None en caso contrario."""
    try:
        payload = jwt.decode(
            token,
            settings.FINANZAS_TOKEN_SECRET,
            algorithms=["HS256"],
            options={"require": ["exp", "tipo", "usuario"]},
        )
    except jwt.PyJWTError:
        return None

    if payload.get("tipo") != tipo_esperado:
        return None
    return payload


def credenciales_validas(usuario: str, contrasena: str) -> bool:
    ok_usuario = hmac.compare_digest(usuario, settings.FINANZAS_ADMIN_USERNAME)
    ok_clave = hmac.compare_digest(contrasena, settings.FINANZAS_ADMIN_PASSWORD)
    return ok_usuario and ok_clave


# ---------------------------------------------------------------------------
# Decorador para vistas protegidas
# ---------------------------------------------------------------------------
def requiere_token(vista):
    """Exige la cabecera `Authorization: Bearer <access>` en la vista."""

    def envuelta(request, *args, **kwargs):
        cabecera = request.headers.get("Authorization", "")
        if not cabecera.startswith("Bearer "):
            return JsonResponse(
                {"errores": ["Token de acceso requerido."]}, status=401
            )
        payload = verificar_token(cabecera[7:].strip(), "access")
        if payload is None:
            return JsonResponse(
                {"errores": ["Token de acceso inválido o caducado."]}, status=401
            )
        request.usuario_auth = payload.get("usuario")
        return vista(request, *args, **kwargs)

    return envuelta
