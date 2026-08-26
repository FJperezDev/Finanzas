"""Modelos de datos del backend de Finanzas."""

from django.db import models


class Transaccion(models.Model):
    """Un movimiento del Excel de transacciones.

    Las columnas fuera del contrato ('Cuenta', 'Bizum'…) se guardan en
    `extras` como JSON, de modo que el contrato se respeta y las columnas
    adicionales se conservan.
    """

    TIPOS = [("Ingreso", "Ingreso"), ("Gasto", "Gasto")]

    fecha = models.DateField(db_index=True)
    tipo = models.CharField(max_length=16, choices=TIPOS)
    categoria_macro = models.CharField(max_length=40)
    subcategoria = models.CharField(max_length=120, blank=True, default="")
    concepto = models.CharField(max_length=200, blank=True, default="")
    importe = models.DecimalField(max_digits=12, decimal_places=2)
    extras = models.JSONField(default=dict, blank=True)

    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["fecha", "id"]
        indexes = [
            models.Index(
                fields=["fecha", "tipo"],
                name="transaccion_fecha_tipo_idx",
            ),
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.fecha} · {self.tipo} · {self.concepto} · {self.importe}"


class Backup(models.Model):
    creado = models.DateTimeField(auto_now_add=True)
    motivo = models.CharField(
        max_length=100,
        default="manual",
    )
    filas = models.JSONField(default=list)

    class Meta:
        ordering = ["-creado"]


class RefreshToken(models.Model):
    """Token de refresco emitido en el inicio de sesión.

    Cada token se identifica por su `jti` para poder revocarlo al cerrar
    sesión y rotarlo en cada refresco (el viejo queda marcado como
    revocado al emitir uno nuevo).
    """

    jti = models.CharField(max_length=64, unique=True)
    usuario = models.CharField(max_length=150)
    expiracion = models.DateTimeField(db_index=True)
    revocado = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]
