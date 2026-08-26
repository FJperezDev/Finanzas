"""Autenticación: tokens de acceso y refresco firmados con HMAC-SHA256.

Formato JWT ligero (cabecera.cuerpo.firma) implementado solo con la
librería estándar, sin dependencias externas:

  - access:  expiración corta (FINANZAS_ACCESS_TOKEN_MINUTES).
  - refresh: expiración larga (FINANZAS_REFRESH_TOKEN_DAYS), con `jti`
    persistido en BD para poder revocarlo al cerrar sesión y rotarlo
    en cada refresco.

Las credenciales del usuario administrador se leen de variables de
entorno (FINANZAS_ADMIN_USERNAME / FINANZAS_ADMIN_PASSWORD).
"""

import base64
import hashlib
import hmac
import json
import time

from django.conf import settings
from django.http import JsonResponse


# ---------------------------------------------------------------------------
# Codificación base64url y firma
# ---------------------------------------------------------------------------
def _b64url(datos: bytes) -> str:
    return base64.urlsafe_b64encode(datos).rstrip(b"=").decode("ascii")


def _desb64url(texto: str) -> bytes:
    relleno = "=" * (-len(texto) % 4)
    return base64.urlsafe_b64decode(texto + relleno)


def _firma(segmento: bytes) -> bytes:
    clave = settings.FINANZAS_TOKEN_SECRET.encode("utf-8")
    return hmac.new(clave, segmento, hashlib.sha256).digest()


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

    cabecera = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    cuerpo = _b64url(json.dumps(payload).encode())
    segmento = f"{cabecera}.{cuerpo}".encode()
    return f"{cabecera}.{cuerpo}.{_b64url(_firma(segmento))}"


def verificar_token(token: str, tipo_esperado: str) -> dict | None:
    """Devuelve el payload si el token es válido, o None en caso contrario."""
    try:
        cabecera, cuerpo, firma = token.split(".")
        segmento = f"{cabecera}.{cuerpo}".encode()
        if not hmac.compare_digest(_b64url(_firma(segmento)), firma):
            return None
        payload = json.loads(_desb64url(cuerpo))
    except (ValueError, KeyError, json.JSONDecodeError, UnicodeDecodeError):
        return None

    if payload.get("tipo") != tipo_esperado:
        return None
    if int(payload.get("exp", 0)) < int(time.time()):
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
