"""Tests del backend: validación, API, backup, exportación Excel y auth."""
import json
from datetime import date
from io import BytesIO

from django.conf import settings
from django.test import Client, TestCase
from django.urls import reverse
from openpyxl import load_workbook

from .models import Backup, RefreshToken, Transaccion
from .seed import generar_filas_seed


def tokens_de_admin() -> dict:
    """Inicia sesión con las credenciales admin del entorno y devuelve los tokens."""
    client = Client()
    respuesta = client.post(
        reverse("login"),
        data=json.dumps(
            {
                "username": settings.FINANZAS_ADMIN_USERNAME,
                "password": settings.FINANZAS_ADMIN_PASSWORD,
            }
        ),
        content_type="application/json",
    )
    assert respuesta.status_code == 200, respuesta.content
    return respuesta.json()


class AuthTests(TestCase):
    def test_login_emite_access_y_refresh(self) -> None:
        tokens = tokens_de_admin()
        self.assertIn("access", tokens)
        self.assertIn("refresh", tokens)
        self.assertEqual(tokens["usuario"], settings.FINANZAS_ADMIN_USERNAME)
        self.assertEqual(RefreshToken.objects.filter(revocado=False).count(), 1)

    def test_login_con_credenciales_invalidas(self) -> None:
        respuesta = self.client.post(
            reverse("login"),
            data=json.dumps({"username": "admin", "password": "incorrecta"}),
            content_type="application/json",
        )
        self.assertEqual(respuesta.status_code, 401)
        self.assertIn("errores", respuesta.json())

    def test_login_con_cuerpo_invalido(self) -> None:
        respuesta = self.client.post(
            reverse("login"),
            data="no es json",
            content_type="application/json",
        )
        self.assertEqual(respuesta.status_code, 400)

    def test_refrescar_rota_el_token(self) -> None:
        tokens = tokens_de_admin()
        refrescado = self.client.post(
            reverse("refrescar_token"),
            data=json.dumps({"refresh": tokens["refresh"]}),
            content_type="application/json",
        )
        self.assertEqual(refrescado.status_code, 200)
        self.assertNotEqual(refrescado.json()["refresh"], tokens["refresh"])

        # El refresh original queda revocado: reutilizarlo falla.
        reusado = self.client.post(
            reverse("refrescar_token"),
            data=json.dumps({"refresh": tokens["refresh"]}),
            content_type="application/json",
        )
        self.assertEqual(reusado.status_code, 401)

    def test_cerrar_sesion_revoca_el_refresh(self) -> None:
        tokens = tokens_de_admin()
        respuesta = self.client.post(
            reverse("cerrar_sesion"),
            data=json.dumps({"refresh": tokens["refresh"]}),
            content_type="application/json",
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertTrue(RefreshToken.objects.get().revocado)

        refrescado = self.client.post(
            reverse("refrescar_token"),
            data=json.dumps({"refresh": tokens["refresh"]}),
            content_type="application/json",
        )
        self.assertEqual(refrescado.status_code, 401)

    def test_endpoint_protegido_sin_token(self) -> None:
        respuesta = self.client.get(reverse("listar_transacciones"))
        self.assertEqual(respuesta.status_code, 401)
        self.assertIn("errores", respuesta.json())

    def test_endpoint_protegido_con_token_malformado(self) -> None:
        respuesta = self.client.get(
            reverse("listar_transacciones"),
            HTTP_AUTHORIZATION="Bearer token-que-no-es-valido",
        )
        self.assertEqual(respuesta.status_code, 401)


class ValidacionTests(TestCase):
    def test_semilla_es_valida(self) -> None:
        from .validation import validar_filas

        errores = validar_filas(generar_filas_seed())
        self.assertEqual(errores, [])

    def test_detecta_todos_los_errores(self) -> None:
        from .validation import validar_filas

        filas = [
            {
                "Fecha": "2026-13-99",
                "Tipo": "X",
                "Categoria_Macro": "Y",
                "Subcategoria": "",
                "Concepto": "",
                "Importe": -5,
            },
            {"Fecha": "2026-01-01", "Tipo": "Ingreso", "Categoria_Macro": "Nómina", "Importe": "abc"},
        ]
        errores = validar_filas(filas)
        self.assertEqual(len(errores), 5)  # fecha, tipo, categoría, importe negativo y no numérico

    def test_columna_reservada_rechazada(self) -> None:
        from .validation import validar_filas

        filas = [
            {
                "Fecha": "2026-01-01",
                "Tipo": "Ingreso",
                "Categoria_Macro": "Nómina",
                "Importe": 100,
                "Periodo": "x",
            }
        ]
        errores = validar_filas(filas)
        self.assertTrue(any("reservado" in e for e in errores))


class ApiTests(TestCase):
    def setUp(self) -> None:
        Transaccion.objects.create(
            fecha=date(2026, 1, 1),
            tipo="Ingreso",
            categoria_macro="Nómina",
            subcategoria="Nomina",
            concepto="Nómina Enero",
            importe=250000,
        )
        Transaccion.objects.create(
            fecha=date(2026, 1, 15),
            tipo="Gasto",
            categoria_macro="Fijo",
            subcategoria="Alquiler",
            concepto="Alquiler Piso",
            importe=115000,
            extras={"Cuenta": "Unicaja"},
        )
        self.client.defaults["HTTP_AUTHORIZATION"] = (
            f"Bearer {tokens_de_admin()['access']}"
        )

    def test_listar_devuelve_filas_y_extras(self) -> None:
        respuesta = self.client.get(reverse("listar_transacciones"))
        self.assertEqual(respuesta.status_code, 200)
        datos = respuesta.json()
        self.assertEqual(len(datos["filas"]), 2)
        self.assertIn("Cuenta", datos["columnas_extra"])
        self.assertEqual(datos["filas"][0]["Importe"], 2500.0)

    def test_guardar_valida_y_rechaza(self) -> None:
        malas = [
            {"Fecha": "2026-01-01", "Tipo": "Mal", "Categoria_Macro": "Nómina", "Importe": 10}
        ]
        respuesta = self.client.post(
            reverse("guardar_transacciones"),
            data='{"filas": ' + str(malas).replace("'", '"') + "}",
            content_type="application/json",
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn("errores", respuesta.json())

    def test_guardar_hace_backup_y_reemplaza(self) -> None:
        filas = generar_filas_seed()
        respuesta = self.client.post(
            reverse("guardar_transacciones"),
            data='{"filas": ' + str(filas).replace("'", '"') + "}",
            content_type="application/json",
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()["filas"], len(filas))
        self.assertEqual(Transaccion.objects.count(), len(filas))
        self.assertEqual(Backup.objects.count(), 1)
        # El backup contiene el dataset previo (2 filas)
        self.assertEqual(len(Backup.objects.first().filas), 2)

    def test_guardar_con_columna_extra_conserva_extras(self) -> None:
        filas = [
            {
                "Fecha": "2026-01-01",
                "Tipo": "Ingreso",
                "Categoria_Macro": "Nómina",
                "Subcategoria": "Nómina",
                "Concepto": "Nómina",
                "Importe": 2500,
                "Cuenta": "Revolut",
            }
        ]
        respuesta = self.client.post(
            reverse("guardar_transacciones"),
            data='{"filas": ' + str(filas).replace("'", '"') + "}",
            content_type="application/json",
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(Transaccion.objects.first().extras, {"Cuenta": "Revolut"})

    def test_exportar_descarga_xlsx(self) -> None:
        respuesta = self.client.get(reverse("exportar_transacciones"))
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta["Content-Disposition"], 'attachment; filename="transacciones.xlsx"')
        self.assertEqual(respuesta.content[:2], b"PK")  # firma de archivo ZIP/xlsx

    def test_exportar_filtra_por_anio_y_mes(self) -> None:
        respuesta = self.client.get(
            reverse("exportar_transacciones"), {"anio": "2026", "mes": "1"}
        )
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(
            respuesta["Content-Disposition"],
            'attachment; filename="transacciones_2026_01.xlsx"',
        )
        hoja = load_workbook(BytesIO(respuesta.content)).active
        self.assertEqual(hoja.max_row, 3)  # cabecera + 2 filas de enero de 2026

    def test_exportar_filtra_por_anio_solo(self) -> None:
        respuesta = self.client.get(reverse("exportar_transacciones"), {"anio": "2025"})
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(
            respuesta["Content-Disposition"],
            'attachment; filename="transacciones_2025.xlsx"',
        )
        hoja = load_workbook(BytesIO(respuesta.content)).active
        self.assertEqual(hoja.max_row, 1)  # solo cabecera: no hay filas de 2025

    def test_exportar_rechaza_filtros_invalidos(self) -> None:
        respuesta = self.client.get(reverse("exportar_transacciones"), {"anio": "abc"})
        self.assertEqual(respuesta.status_code, 400)
        respuesta = self.client.get(reverse("exportar_transacciones"), {"mes": "13"})
        self.assertEqual(respuesta.status_code, 400)

    def test_health(self) -> None:
        respuesta = self.client.get(reverse("health"))
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.json()["transacciones"], 2)
