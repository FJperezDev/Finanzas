"""Rutas raíz del backend."""
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

urlpatterns = [
    path("api/", include("api.urls")),
]

# Servir archivos subidos (avatares) solo en desarrollo; en producción los
# sirve nginx (ver nginx.conf del frontend).
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
