"""Modelos de datos del backend de Finanzas."""

from decimal import Decimal

from django.db import models
from phonenumber_field.modelfields import PhoneNumberField


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
    cuenta = models.CharField(max_length=100, blank=True, default="")
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


class Contacto(models.Model):
    """Contacto que representa una persona o entidad con la que se tiene
    una relación de deuda.
    Cada contacto se identifica con su Número de teléfono.
    """

    nombre = models.CharField(max_length=100)
    telefono = PhoneNumberField(unique=True)

    correo = models.EmailField(blank=True, null=True)
    direccion = models.CharField(max_length=200, blank=True, default="")

    icono = models.ImageField(upload_to="iconos_contactos/", blank=True, null=True)

    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self) -> str:
        return f"{self.nombre} ({self.telefono})"


class GastoCompartido(models.Model):
    TIPOS_REPARTO = [("IGUALES", "A partes iguales"), ("EXACTO", "Por cantidad exacta")]

    concepto = models.CharField(max_length=200)
    fecha = models.DateField(db_index=True)
    importe_total = models.DecimalField(max_digits=12, decimal_places=2)

    categoria_macro = models.CharField(max_length=40)
    subcategoria = models.CharField(max_length=120, blank=True, default="")

    tipo_reparto = models.CharField(
        max_length=16, choices=TIPOS_REPARTO, default="IGUALES"
    )

    # Indica si la parte del usuario principal (la "porción inferida" cuando
    # pagó otra persona) ya ha sido saldada por completo. El importe saldado
    # (parcial o total) se guarda en `mi_parte_saldada_importe`.
    mi_parte_saldada = models.BooleanField(default=False)
    mi_parte_saldada_importe = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    # True si la parte saldada fue "perdonada" (sin movimiento de dinero).
    mi_parte_perdonada = models.BooleanField(default=False)

    pagador = models.ForeignKey(
        "Contacto",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gastos_pagados",
    )

    transaccion = models.OneToOneField(
        "Transaccion", on_delete=models.SET_NULL, null=True, blank=True
    )

    creado = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.fecha} · {self.concepto} · {self.importe_total}"


class Participacion(models.Model):
    gasto = models.ForeignKey(
        GastoCompartido, on_delete=models.CASCADE, related_name="participaciones"
    )
    contacto = models.ForeignKey(
        "Contacto", on_delete=models.CASCADE, related_name="deudas"
    )
    importe_debido = models.DecimalField(max_digits=12, decimal_places=2)
    # Importe ya saldado (pagado o perdonado). `saldado` indica si se ha
    # cubierto la totalidad; `perdonado` si se saldó sin mover dinero.
    importe_saldado = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    saldado = models.BooleanField(default=False)
    perdonado = models.BooleanField(default=False)

    class Meta:
        unique_together = (
            "gasto",
            "contacto",
        )  # Un contacto no puede estar dos veces en el mismo gasto

    @property
    def pendiente(self) -> Decimal:
        """Importe que aún no se ha saldado (pagado ni perdonado)."""
        pendiente = self.importe_debido - self.importe_saldado
        return pendiente if pendiente > 0 else Decimal("0.00")

    def __str__(self) -> str:
        estado = "Pagado" if self.saldado else "Pendiente"
        return f"{self.contacto.nombre} debe {self.importe_debido} ({estado})"


class Cuenta(models.Model):
    """Cuenta propia de dinero.

    `tipo` distingue las cuentas corrientes (Unicaja, Revolut, Efectivo…)
    de las cuentas de inversión destino de los traspasos: "cartera"
    (fondo indexado) y "remunerada" (cuenta remunerada).
    """

    TIPOS = [
        ("corriente", "Corriente"),
        ("cartera", "Cartera"),
        ("remunerada", "Remunerada"),
    ]

    nombre = models.CharField(max_length=100, unique=True)
    tipo = models.CharField(max_length=16, choices=TIPOS, default="corriente")

    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return f"{self.nombre} ({self.tipo})"


class Traspaso(models.Model):
    """Movimiento de dinero entre dos cuentas propias.

    Un traspaso NO es una `Transaccion` (no contabiliza como gasto ni
    ingreso): el dinero cambia de cuenta pero no sale del patrimonio.
    """

    fecha = models.DateField(db_index=True)
    importe = models.DecimalField(max_digits=12, decimal_places=2)
    concepto = models.CharField(max_length=200, blank=True, default="")

    cuenta_origen = models.ForeignKey(
        "Cuenta", on_delete=models.CASCADE, related_name="traspasos_salientes"
    )
    cuenta_destino = models.ForeignKey(
        "Cuenta", on_delete=models.CASCADE, related_name="traspasos_entrantes"
    )

    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha", "-id"]

    def __str__(self) -> str:
        return (
            f"{self.fecha} · {self.cuenta_origen.nombre} → "
            f"{self.cuenta_destino.nombre} · {self.importe}"
        )
