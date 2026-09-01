"""Rutas de la API."""

from django.urls import path

from . import auth_views, views

urlpatterns = [
    path("auth/login/", auth_views.login, name="login"),
    path("auth/refresh/", auth_views.refrescar, name="refrescar_token"),
    path("auth/logout/", auth_views.cerrar_sesion, name="cerrar_sesion"),
    path("transacciones/", views.listar_transacciones, name="listar_transacciones"),
    path(
        "transacciones/guardar/",
        views.guardar_transacciones,
        name="guardar_transacciones",
    ),
    path(
        "transacciones/exportar/",
        views.exportar_transacciones,
        name="exportar_transacciones",
    ),
    # Sistema de deudas y contactos
    path("contactos/", views.listar_contactos, name="listar_contactos"),
    path("contactos/crear/", views.crear_contacto, name="crear_contacto"),
    path(
        "contactos/<int:contacto_id>/eliminar/",
        views.eliminar_contacto,
        name="eliminar_contacto",
    ),
    path(
        "contactos/<int:contacto_id>/avatar/",
        views.subir_avatar,
        name="subir_avatar",
    ),
    path(
        "gastos-compartidos/",
        views.listar_gastos_compartidos,
        name="listar_gastos_compartidos",
    ),
    path(
        "gastos-compartidos/crear/",
        views.crear_gasto_compartido,
        name="crear_gasto_compartido",
    ),
    path(
        "gastos-compartidos/saldar/",
        views.saldar_gasto_compartido,
        name="saldar_gasto_compartido",
    ),
    path(
        "participaciones/<int:participacion_id>/saldar/",
        views.actualizar_participacion,
        name="actualizar_participacion",
    ),
    # Cuentas corrientes y de inversión + traspasos
    path("cuentas/", views.listar_cuentas, name="listar_cuentas"),
    path("cuentas/crear/", views.crear_cuenta, name="crear_cuenta"),
    path(
        "cuentas/<int:cuenta_id>/actualizar/",
        views.actualizar_cuenta,
        name="actualizar_cuenta",
    ),
    path(
        "cuentas/<int:cuenta_id>/eliminar/",
        views.eliminar_cuenta,
        name="eliminar_cuenta",
    ),
    path("traspasos/crear/", views.crear_traspaso, name="crear_traspaso"),
    path("traspasos/", views.listar_traspasos, name="listar_traspasos"),
    path("health/", views.health, name="health"),
]
