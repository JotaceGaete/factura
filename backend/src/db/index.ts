import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error('DATABASE_URL env var is required')
}

const client = postgres(connectionString, { max: 10 })
export const db = drizzle(client, { schema })

// ─── Seed contadores si no existen ───────────────────────────────────────────
export async function initDB() {
  try {
    // Crear tablas (fallback si no hay migrations)
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
    console.log('[DB] Initialized')
  } catch (e) {
    console.error('[DB] Init error:', e)
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
