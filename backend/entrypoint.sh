#!/bin/sh
set -e

echo "Aplicando migraciones…"
python manage.py migrate --noinput

echo "Sembrando datos si la base está vacía…"
python manage.py seed || true

echo "Arrancando gunicorn…"
exec gunicorn finanzas.wsgi:application --bind 0.0.0.0:8000 --workers 2 --access-logfile -
