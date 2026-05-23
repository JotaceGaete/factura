# FacturaApp

Sistema de facturación para un negocio. Presupuestos, facturas, productos, stock, listas de precio y estadísticas.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind |
| Backend | Hono (Node.js) |
| Base de datos | PostgreSQL |
| PDF | jsPDF |
| Charts | Recharts |
| Deploy | Docker + Coolify |

---

## Desarrollo local

```bash
# 1. Clonar y configurar env
cp .env.example .env
# Editar .env con tus valores

# 2. Levantar todo con Docker Compose
docker compose up --build

# App disponible en:
# Frontend → http://localhost
# Backend  → http://localhost:3000
# DB       → localhost:5432
```

### Dev sin Docker

```bash
# Terminal 1 - Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

---

## Deploy en Coolify

### Opción A: Docker Compose (recomendada)

1. En Coolify → New Resource → Docker Compose
2. Pegar el contenido de `docker-compose.yml`
3. Configurar las variables de entorno:
   - `POSTGRES_PASSWORD` → contraseña segura
   - `CORS_ORIGIN` → tu dominio (ej: `https://facturas.tuempresa.cl`)
4. Deploy

### Opción B: Servicios separados

Desplegar cada servicio por separado en Coolify apuntando al Dockerfile correspondiente.

---

## Estructura

```
factura-app/
├── frontend/           React + Vite
│   ├── src/
│   │   ├── pages/      Dashboard, Clientes, Productos, Presupuestos, Facturas, Reportes
│   │   ├── components/ Layout, UI
│   │   ├── lib/        api.ts, utils.ts, pdf.ts
│   │   └── types/      TypeScript types
│   ├── Dockerfile
│   └── nginx.conf
├── backend/            Hono API
│   ├── src/
│   │   ├── db/         schema.ts (Drizzle), migrate.sql
│   │   ├── routes/     Todos los endpoints
│   │   └── index.ts
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Funcionalidades

- **Clientes** — CRUD, RUT, listas de precio (1/2/3)
- **Productos** — CRUD, 3 precios por lista, stock, alertas stock mínimo
- **Stock** — Ajustes manuales (entrada/salida/ajuste), historial movimientos
- **Presupuestos** — Crear, PDF, convertir a factura
- **Facturas** — Emitir, PDF, imprimir, anular, descuento por ítem y global
- **PDF** — Generación client-side con jsPDF, logo y datos empresa
- **Dashboard** — KPIs, gráfico ventas mensuales, top productos, top clientes
- **Reportes** — Ventas anuales, ranking clientes, productos más vendidos

---

## Personalizar datos empresa

Editar `frontend/src/lib/pdf.ts`, objeto `EMPRESA`:

```ts
const EMPRESA = {
  nombre: 'Mi Empresa SpA',
  rut: '76.000.000-0',
  giro: 'Venta de productos',
  direccion: 'Av. Ejemplo 123, Santiago',
  telefono: '+56 9 9000 0000',
  email: 'contacto@miempresa.cl',
}
```

---

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `POSTGRES_USER` | Usuario PostgreSQL | `facturaapp` |
| `POSTGRES_PASSWORD` | Contraseña PostgreSQL | `changeme` |
| `POSTGRES_DB` | Nombre base de datos | `facturaapp` |
| `CORS_ORIGIN` | Origen permitido CORS | `*` |
| `VITE_API_URL` | URL API (build time) | `/api` |
