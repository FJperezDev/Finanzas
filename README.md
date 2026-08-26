# 💸 Finanzas Personales — multiplataforma

App de finanzas personales migrada de Streamlit a **React Native (Expo)**:

- **Móvil (iOS/Android)**: editor tipo Excel sobre `transacciones.xlsx` local
  (backup + escritura atómica con expo-file-system).
- **Web**: misma app (React Native Web) servida por nginx en Docker, con
  **backend Django + SQLite** y exportación a Excel bajo demanda.

## Módulos

| Módulo | Descripción |
| --- | --- |
| 🔐 Autenticación | Login con access + refresh tokens (JWT firmado con HMAC-SHA256, sin dependencias). El usuario administrador se define por variables de entorno. Modo invitado con datos mock para probar sin backend. |
| 🗂️ Editor de Datos | Grid tipo Excel con filtros Año/Mes, undo/redo (Ctrl+Z), celdas modificadas en rojo con icono de deshacer, columnas extra, guardado con backup |
| 📊 Dashboard 50/20/30 | KPIs mensuales, distribución real vs benchmark, evolución del flujo de caja y control de umbral de gastos fijos |
| 📈 Interés Compuesto | Proyección de capital mes a mes, colchón financiero desde cero, detalle anual |
| 🏠 House Hacking | Viabilidad hipoteca + alquiler de habitaciones, cascada de flujo mensual y test de estrés de margin call |

## Autenticación

El backend expone:

| Endpoint | Descripción |
| --- | --- |
| `POST /api/auth/login/` | `{username, password}` → `{access, refresh, usuario}` |
| `POST /api/auth/refresh/` | `{refresh}` → rota el par de tokens (el viejo queda revocado) |
| `POST /api/auth/logout/` | `{refresh}` → revoca el refresh token |

`/api/transacciones/`, `/api/transacciones/guardar/` y
`/api/transacciones/exportar/` requieren la cabecera
`Authorization: Bearer <access>`; solo `/api/health/` es público.

Variables de entorno del backend:

| Variable | Defecto | Descripción |
| --- | --- | --- |
| `FINANZAS_ADMIN_USERNAME` | `admin` | Usuario administrador |
| `FINANZAS_ADMIN_PASSWORD` | `admin123` | Contraseña del administrador |
| `FINANZAS_ACCESS_TOKEN_MINUTES` | `15` | Validez del access token |
| `FINANZAS_REFRESH_TOKEN_DAYS` | `7` | Validez del refresh token |
| `FINANZAS_TOKEN_SECRET` | `DJANGO_SECRET_KEY` | Clave de firma de los tokens |

La app móvil arranca en **modo invitado**: muestra un dashboard con datos
mock (sin backend) y, en el menú de los tres puntos de la cabecera,
"Iniciar Sesión" y "Gestionar Excel" (también local, sin backend). Tras
iniciar sesión la app pasa a trabajar contra el backend (con refresco
automático del access token) y "Cerrar Sesión" revoca la sesión.

## Estructura

```
Finanzas/
├── mobile/            # App Expo (React Native + Web)
│   ├── src/core/      # config, cálculos, xlsxService (nativo y .web)
│   ├── src/components # UI, grid Excel, gráficos (nativo y .web)
│   ├── src/screens/   # 4 pantallas
│   ├── nginx.conf     # proxy /api → backend + SPA
│   └── Dockerfile     # build Expo web → nginx
├── backend/           # Django + SQLite (API y exportación Excel)
│   ├── api/           # modelo, validación, API, semilla, tests
│   └── Dockerfile     # python:3.13-slim + gunicorn
├── docker-compose.yml # backend + frontend (puerto 8080)
├── app.py             # App Streamlit original (referencia)
└── core/, modules/, data/  # Código Python original (referencia)
```

## Móvil (desarrollo)

```bash
cd mobile
npm install
npx expo start            # Expo Go / emulador
```

## Web en Docker

```bash
docker compose up -d --build
# → http://localhost:8080
```

- La API de Django comparte origen con el frontend (`/api` vía nginx).
- SQLite vive en `backend/data/db.sqlite3` (volumen persistente).
- El botón **Exportar XLSX** del editor descarga `transacciones.xlsx` real.
- En cada guardado el backend conserva un backup previo (últimos 10).

## Web en desarrollo (sin Docker)

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate && .venv/bin/python manage.py seed
.venv/bin/gunicorn finanzas.wsgi:application --bind 0.0.0.0:8000

# En otra terminal:
cd mobile
EXPO_PUBLIC_API_URL=http://localhost:8000 npx expo start --web
```

## Tests

```bash
cd backend && .venv/bin/python manage.py test api
cd mobile && npx tsc --noEmit
```

## Contrato de datos

Columnas del Excel: `Fecha`, `Tipo` (Ingreso/Gasto), `Categoria_Macro`
(Fijos, Ocio, Ahorro_Inversion, Nomina, Bonus_Extra), `Subcategoria`,
`Concepto`, `Importe` (≥ 0; el signo lo marca `Tipo`). Las columnas
adicionales (ej. `Cuenta`) se conservan en el móvil como columnas del
xlsx y en el backend como JSON.
