"""Rutas raíz del backend."""
from django.urls import include, path

urlpatterns = [
    path("api/", include("api.urls")),
]
