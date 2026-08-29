"""Settings del backend de Finanzas (Django + SQLite)."""

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


# ---------------------------------------------------------------------------
# Entorno
# ---------------------------------------------------------------------------


def env_bool(nombre: str, defecto: bool = False) -> bool:
    """Convierte una variable de entorno habitual en booleano."""
    valor = os.getenv(nombre)
    if valor is None:
        return defecto

    return valor.strip().lower() in {"1", "true", "yes", "on"}


# ---------------------------------------------------------------------------
# Seguridad
# ---------------------------------------------------------------------------

DEBUG = env_bool("DEBUG", True)

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-finanzas-local-desarrollo",
)
if not DEBUG and SECRET_KEY.startswith("django-insecure-"):
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY debe ser una clave real en producción."
    )

# Usuario administrador (único usuario de la aplicación) definido por
# variables de entorno. En desarrollo se permite el fallback local; en
# producción la contraseña es obligatoria.
FINANZAS_ADMIN_USERNAME = os.getenv("FINANZAS_ADMIN_USERNAME", "admin")
FINANZAS_ADMIN_PASSWORD = os.getenv("FINANZAS_ADMIN_PASSWORD")
if not FINANZAS_ADMIN_PASSWORD:
    if DEBUG:
        FINANZAS_ADMIN_PASSWORD = "admin123"
    else:
        raise ImproperlyConfigured(
            "FINANZAS_ADMIN_PASSWORD es obligatoria en producción."
        )

# Firma de los tokens de acceso/refresco (por defecto reutiliza SECRET_KEY).
FINANZAS_TOKEN_SECRET = os.getenv("FINANZAS_TOKEN_SECRET", SECRET_KEY)

FINANZAS_ACCESS_TOKEN_MINUTES = int(os.getenv("FINANZAS_ACCESS_TOKEN_MINUTES", "15"))
FINANZAS_REFRESH_TOKEN_DAYS = int(os.getenv("FINANZAS_REFRESH_TOKEN_DAYS", "7"))

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "*").split(",")
    if host.strip()
]


# ---------------------------------------------------------------------------
# Aplicaciones
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "corsheaders",
    "api",
]


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ---------------------------------------------------------------------------
# Django
# ---------------------------------------------------------------------------

ROOT_URLCONF = "finanzas.urls"

WSGI_APPLICATION = "finanzas.wsgi.application"


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
            ],
        },
    },
]


# ---------------------------------------------------------------------------
# Base de datos
# ---------------------------------------------------------------------------

# SQLite persistente en backend/data/db.sqlite3.
# En producción, ./backend/data se monta como volumen Docker en /app/data.
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": DATA_DIR / "db.sqlite3",
    }
}


# ---------------------------------------------------------------------------
# Internacionalización
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "es-es"

TIME_ZONE = "Europe/Madrid"

USE_I18N = True

USE_TZ = True


# ---------------------------------------------------------------------------
# Archivos estáticos
# ---------------------------------------------------------------------------

STATIC_URL = "static/"


# ---------------------------------------------------------------------------
# Archivos subidos (avatares de contacto, etc.)
# ---------------------------------------------------------------------------

MEDIA_URL = "/media/"
MEDIA_ROOT = DATA_DIR / "media"


# ---------------------------------------------------------------------------
# Django
# ---------------------------------------------------------------------------

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

APPEND_SLASH = False


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

# Desarrollo:
# Expo Web se ejecuta en localhost:8081 y Django en localhost:8000.
#
# Producción:
# Nginx sirve el frontend y hace proxy inverso hacia Django bajo /api/,
# por lo que las peticiones son del mismo origen y CORS no es necesario.

if DEBUG:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ]

    # Mantiene compatibilidad con otros puertos usados ocasionalmente por Expo.
    CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", False)


# ---------------------------------------------------------------------------
# Caché
# ---------------------------------------------------------------------------

# En producción (gunicorn con varios workers) la caché por defecto
# (locmem) es por proceso, lo que debilita el throttle de login. Usamos
# una caché en disco compartida por todos los workers.
if not DEBUG:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.filebased.FileBasedCache",
            "LOCATION": DATA_DIR / "cache",
        }
    }


# ---------------------------------------------------------------------------
# Seguridad de producción
# ---------------------------------------------------------------------------

if not DEBUG:
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"

    # Detrás de nginx (proxy inverso) las peticiones llegan como HTTP aunque
    # el cliente use HTTPS; confiamos en la cabecera X-Forwarded-Proto para
    # generar URLs absolutas (p. ej. avatares) con el esquema correcto.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
