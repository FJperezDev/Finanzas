"""Rutas de la API."""
from django.urls import path

from . import auth_views, views

urlpatterns = [
    path("auth/login/", auth_views.login, name="login"),
    path("auth/refresh/", auth_views.refrescar, name="refrescar_token"),
    path("auth/logout/", auth_views.cerrar_sesion, name="cerrar_sesion"),
    path("transacciones/", views.listar_transacciones, name="listar_transacciones"),
    path("transacciones/guardar/", views.guardar_transacciones, name="guardar_transacciones"),
    path("transacciones/exportar/", views.exportar_transacciones, name="exportar_transacciones"),
    path("health/", views.health, name="health"),
]
