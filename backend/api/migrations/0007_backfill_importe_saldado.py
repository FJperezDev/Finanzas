"""Rellena importe_saldado a partir de los flags booleanos preexistentes."""

from decimal import Decimal

from django.db import migrations


def backfill(apps, schema_editor):
    Participacion = apps.get_model("api", "Participacion")
    GastoCompartido = apps.get_model("api", "GastoCompartido")

    for p in Participacion.objects.filter(saldado=True):
        p.importe_saldado = p.importe_debido
        p.save(update_fields=["importe_saldado"])

    for g in GastoCompartido.objects.filter(mi_parte_saldada=True):
        suma_otros = sum(
            (p.importe_debido for p in g.participaciones.all()),
            Decimal("0.00"),
        )
        inferida = max(g.importe_total - suma_otros, Decimal("0.00"))
        g.mi_parte_saldada_importe = inferida
        g.save(update_fields=["mi_parte_saldada_importe"])


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_gastocompartido_mi_parte_perdonada_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
