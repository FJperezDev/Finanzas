"""Comando: siembra la base de datos si está vacía.

Uso:
    python manage.py seed
"""
from django.core.management.base import BaseCommand

from api.views import seed_initial


class Command(BaseCommand):
    help = "Siembra la base de datos con datos de ejemplo si está vacía."

    def handle(self, *args, **options) -> None:
        resultado = seed_initial()
        if resultado["seed"]:
            self.stdout.write(self.style.SUCCESS(f"Semilla creada: {resultado['filas']} filas."))
        else:
            self.stdout.write("La base de datos ya contiene datos; semilla omitida.")
