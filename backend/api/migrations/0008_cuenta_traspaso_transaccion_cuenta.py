"""Cuentas corrientes y de inversión + traspasos + columna 'Cuenta'."""

import django.db.models.deletion
from django.db import migrations, models

CUENTAS_INICIALES = [
    ("Unicaja", "corriente"),
    ("Revolut", "corriente"),
    ("Efectivo", "corriente"),
    ("Cartera de Inversión", "cartera"),
    ("Cuenta Remunerada", "remunerada"),
]


def crear_cuentas_y_backfill(apps, schema_editor):
    Cuenta = apps.get_model("api", "Cuenta")
    Transaccion = apps.get_model("api", "Transaccion")

    primaria = None
    for nombre, tipo in CUENTAS_INICIALES:
        cuenta, _ = Cuenta.objects.get_or_create(nombre=nombre, defaults={"tipo": tipo})
        if primaria is None and tipo == "corriente":
            primaria = cuenta

    if primaria is not None:
        Transaccion.objects.filter(cuenta="").update(cuenta=primaria.nombre)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_backfill_importe_saldado"),
    ]

    operations = [
        migrations.CreateModel(
            name="Cuenta",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nombre", models.CharField(max_length=100, unique=True)),
                ("tipo", models.CharField(choices=[("corriente", "Corriente"), ("cartera", "Cartera"), ("remunerada", "Remunerada")], default="corriente", max_length=16)),
                ("creado", models.DateTimeField(auto_now_add=True)),
                ("actualizado", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["id"],
            },
        ),
        migrations.AddField(
            model_name="transaccion",
            name="cuenta",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.CreateModel(
            name="Traspaso",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("fecha", models.DateField(db_index=True)),
                ("importe", models.DecimalField(decimal_places=2, max_digits=12)),
                ("concepto", models.CharField(blank=True, default="", max_length=200)),
                ("cuenta_destino", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="traspasos_entrantes", to="api.cuenta")),
                ("cuenta_origen", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="traspasos_salientes", to="api.cuenta")),
                ("creado", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-fecha", "-id"],
            },
        ),
        migrations.RunPython(crear_cuentas_y_backfill, migrations.RunPython.noop),
    ]
