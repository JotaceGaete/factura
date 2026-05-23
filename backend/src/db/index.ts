import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error('DATABASE_URL env var is required')
}

const client = postgres(connectionString, { max: 10 })
export const db = drizzle(client, { schema })

// Idempotent schema migration for Coolify redeploys with an existing volume.
export async function initDB() {
  try {
    await client`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        rut VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(200),
        telefono VARCHAR(50),
        direccion TEXT,
        lista_precio INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    await client`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        nombre VARCHAR(200) NOT NULL,
        descripcion TEXT,
        precio1 INTEGER NOT NULL DEFAULT 0,
        precio2 INTEGER NOT NULL DEFAULT 0,
        precio3 INTEGER NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        stock_minimo INTEGER NOT NULL DEFAULT 5,
        unidad VARCHAR(20) NOT NULL DEFAULT 'un',
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    await client`
      CREATE TABLE IF NOT EXISTS presupuestos (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(20) NOT NULL UNIQUE,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id),
        fecha VARCHAR(10) NOT NULL,
        validez_dias INTEGER NOT NULL DEFAULT 15,
        estado VARCHAR(20) NOT NULL DEFAULT 'borrador',
        notas TEXT,
        subtotal INTEGER NOT NULL DEFAULT 0,
        descuento_global INTEGER NOT NULL DEFAULT 0,
        iva INTEGER NOT NULL DEFAULT 0,
        total INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    await client`
      CREATE TABLE IF NOT EXISTS presupuesto_items (
        id SERIAL PRIMARY KEY,
        presupuesto_id INTEGER NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
        producto_id INTEGER NOT NULL REFERENCES productos(id),
        cantidad INTEGER NOT NULL,
        precio_unitario INTEGER NOT NULL,
        descuento INTEGER NOT NULL DEFAULT 0,
        subtotal INTEGER NOT NULL
      )
    `
    await client`
      CREATE TABLE IF NOT EXISTS facturas (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(20) NOT NULL UNIQUE,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id),
        presupuesto_id INTEGER REFERENCES presupuestos(id),
        fecha VARCHAR(10) NOT NULL,
        fecha_vencimiento VARCHAR(10),
        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
        notas TEXT,
        subtotal INTEGER NOT NULL DEFAULT 0,
        descuento_global INTEGER NOT NULL DEFAULT 0,
        iva INTEGER NOT NULL DEFAULT 0,
        total INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    await client`
      CREATE TABLE IF NOT EXISTS factura_items (
        id SERIAL PRIMARY KEY,
        factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
        producto_id INTEGER NOT NULL REFERENCES productos(id),
        cantidad INTEGER NOT NULL,
        precio_unitario INTEGER NOT NULL,
        descuento INTEGER NOT NULL DEFAULT 0,
        subtotal INTEGER NOT NULL
      )
    `
    await client`
      CREATE TABLE IF NOT EXISTS movimientos_stock (
        id SERIAL PRIMARY KEY,
        producto_id INTEGER NOT NULL REFERENCES productos(id),
        tipo VARCHAR(20) NOT NULL,
        cantidad INTEGER NOT NULL,
        referencia VARCHAR(50),
        notas TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `
    await client`
      CREATE TABLE IF NOT EXISTS contadores (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(20) NOT NULL UNIQUE,
        ultimo INTEGER NOT NULL DEFAULT 0
      )
    `
    await client`
      INSERT INTO contadores (tipo, ultimo) VALUES ('factura', 0), ('presupuesto', 0)
      ON CONFLICT (tipo) DO NOTHING
    `
    await client`CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas(cliente_id)`
    await client`CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado)`
    await client`CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(fecha)`
    await client`CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente ON presupuestos(cliente_id)`
    await client`CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_stock(producto_id)`
    console.log('[DB] Schema ready')
  } catch (e) {
    console.error('[DB] Migration error:', e)
    throw e
  }
}

export async function nextNumero(tipo: 'factura' | 'presupuesto'): Promise<string> {
  const result = await client`
    UPDATE contadores SET ultimo = ultimo + 1
    WHERE tipo = ${tipo}
    RETURNING ultimo
  `
  const n = result[0].ultimo
  const prefix = tipo === 'factura' ? 'F' : 'P'
  return `${prefix}-${String(n).padStart(6, '0')}`
}

export { client }
