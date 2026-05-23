import { Hono } from 'hono'
import { db, nextNumero, client } from '../db/index.js'
import { clientes, productos, presupuestos, presupuesto_items, facturas, factura_items, movimientos_stock } from '../db/schema.js'
import { eq, and, ilike, lte, desc, sql } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

// ═══════════════════════════════════════════════════════
// CLIENTES
// ═══════════════════════════════════════════════════════
const clienteSchema = z.object({
  nombre: z.string().min(1),
  rut: z.string().min(1),
  email: z.string().email().optional().nullable(),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  lista_precio: z.number().int().min(1).max(3).default(1),
})

app.get('/clientes', async (c) => {
  const rows = await db.select().from(clientes).orderBy(clientes.nombre)
  return c.json(rows)
})

app.get('/clientes/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const [row] = await db.select().from(clientes).where(eq(clientes.id, id))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/clientes', zValidator('json', clienteSchema), async (c) => {
  const data = c.req.valid('json')
  const [row] = await db.insert(clientes).values(data).returning()
  return c.json(row, 201)
})

app.put('/clientes/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const data = await c.req.json()
  const [row] = await db.update(clientes).set(data).where(eq(clientes.id, id)).returning()
  return c.json(row)
})

app.delete('/clientes/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.delete(clientes).where(eq(clientes.id, id))
  return c.json({ ok: true })
})

// ═══════════════════════════════════════════════════════
// PRODUCTOS
// ═══════════════════════════════════════════════════════
const productoSchema = z.object({
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  descripcion: z.string().optional().nullable(),
  precio1: z.number().int().min(0),
  precio2: z.number().int().min(0),
  precio3: z.number().int().min(0),
  stock: z.number().int().default(0),
  stock_minimo: z.number().int().default(5),
  unidad: z.string().default('un'),
  activo: z.boolean().default(true),
})

app.get('/productos', async (c) => {
  const { bajo_stock, activo } = c.req.query()
  let query = db.select().from(productos)
  const conditions = []
  if (activo === 'true') conditions.push(eq(productos.activo, true))
  if (bajo_stock === 'true') conditions.push(lte(productos.stock, productos.stock_minimo))
  // @ts-ignore
  const rows = conditions.length > 0 ? await query.where(and(...conditions)).orderBy(productos.nombre) : await query.orderBy(productos.nombre)
  return c.json(rows)
})

app.get('/productos/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const [row] = await db.select().from(productos).where(eq(productos.id, id))
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/productos', zValidator('json', productoSchema), async (c) => {
  const data = c.req.valid('json')
  const [row] = await db.insert(productos).values(data).returning()
  return c.json(row, 201)
})

app.put('/productos/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const data = await c.req.json()
  const [row] = await db.update(productos).set(data).where(eq(productos.id, id)).returning()
  return c.json(row)
})

app.delete('/productos/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.update(productos).set({ activo: false }).where(eq(productos.id, id))
  return c.json({ ok: true })
})

// Ajuste de stock
app.post('/productos/:id/stock', async (c) => {
  const producto_id = Number(c.req.param('id'))
  const { tipo, cantidad, notas } = await c.req.json()

  const [producto] = await db.select().from(productos).where(eq(productos.id, producto_id))
  if (!producto) return c.json({ error: 'Not found' }, 404)

  let nuevoStock = producto.stock
  if (tipo === 'entrada') nuevoStock += cantidad
  else if (tipo === 'salida') nuevoStock -= cantidad
  else if (tipo === 'ajuste') nuevoStock = cantidad

  await db.update(productos).set({ stock: nuevoStock }).where(eq(productos.id, producto_id))
  await db.insert(movimientos_stock).values({ producto_id, tipo, cantidad, notas })

  return c.json({ stock: nuevoStock })
})

app.get('/productos/:id/movimientos', async (c) => {
  const producto_id = Number(c.req.param('id'))
  const rows = await db.select().from(movimientos_stock)
    .where(eq(movimientos_stock.producto_id, producto_id))
    .orderBy(desc(movimientos_stock.created_at))
    .limit(50)
  return c.json(rows)
})

// ═══════════════════════════════════════════════════════
// PRESUPUESTOS
// ═══════════════════════════════════════════════════════
app.get('/presupuestos', async (c) => {
  const rows = await db.query.presupuestos.findMany({
    with: { cliente: true, items: { with: { producto: true } } },
    orderBy: [desc(presupuestos.created_at)],
  })
  return c.json(rows)
})

app.get('/presupuestos/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = await db.query.presupuestos.findFirst({
    where: eq(presupuestos.id, id),
    with: { cliente: true, items: { with: { producto: true } } },
  })
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/presupuestos', async (c) => {
  const body = await c.req.json()
  const { items: itemsData, ...presupuestoData } = body

  const numero = await nextNumero('presupuesto')
  const [pres] = await db.insert(presupuestos).values({ ...presupuestoData, numero }).returning()

  if (itemsData?.length) {
    await db.insert(presupuesto_items).values(
      itemsData.map((it: any) => ({ ...it, presupuesto_id: pres.id }))
    )
  }
  const full = await db.query.presupuestos.findFirst({
    where: eq(presupuestos.id, pres.id),
    with: { cliente: true, items: { with: { producto: true } } },
  })
  return c.json(full, 201)
})

app.put('/presupuestos/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const data = await c.req.json()
  const [row] = await db.update(presupuestos).set(data).where(eq(presupuestos.id, id)).returning()
  return c.json(row)
})

// Convertir presupuesto a factura
app.post('/presupuestos/:id/convertir', async (c) => {
  const id = Number(c.req.param('id'))
  const pres = await db.query.presupuestos.findFirst({
    where: eq(presupuestos.id, id),
    with: { items: true },
  })
  if (!pres) return c.json({ error: 'Not found' }, 404)

  const numero = await nextNumero('factura')
  const [fact] = await db.insert(facturas).values({
    numero, cliente_id: pres.cliente_id, presupuesto_id: pres.id,
    fecha: new Date().toISOString().slice(0, 10),
    estado: 'pendiente',
    subtotal: pres.subtotal, descuento_global: pres.descuento_global,
    iva: pres.iva, total: pres.total, notas: pres.notas,
  }).returning()

  if (pres.items.length) {
    await db.insert(factura_items).values(
      pres.items.map(it => ({ ...it, id: undefined, factura_id: fact.id, presupuesto_id: undefined }))
    )
    // Descontar stock
    for (const it of pres.items) {
      const [p] = await db.select().from(productos).where(eq(productos.id, it.producto_id))
      if (p) {
        await db.update(productos).set({ stock: p.stock - it.cantidad }).where(eq(productos.id, p.id))
        await db.insert(movimientos_stock).values({ producto_id: p.id, tipo: 'salida', cantidad: it.cantidad, referencia: fact.numero })
      }
    }
  }

  await db.update(presupuestos).set({ estado: 'aceptado' }).where(eq(presupuestos.id, id))
  return c.json(fact, 201)
})

app.delete('/presupuestos/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.delete(presupuestos).where(eq(presupuestos.id, id))
  return c.json({ ok: true })
})

// ═══════════════════════════════════════════════════════
// FACTURAS
// ═══════════════════════════════════════════════════════
app.get('/facturas', async (c) => {
  const { estado, cliente_id } = c.req.query()
  const rows = await db.query.facturas.findMany({
    where: estado ? eq(facturas.estado, estado) : undefined,
    with: { cliente: true, items: { with: { producto: true } } },
    orderBy: [desc(facturas.created_at)],
  })
  return c.json(rows)
})

app.get('/facturas/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = await db.query.facturas.findFirst({
    where: eq(facturas.id, id),
    with: { cliente: true, items: { with: { producto: true } } },
  })
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

app.post('/facturas', async (c) => {
  const body = await c.req.json()
  const { items: itemsData, ...facturaData } = body

  const numero = await nextNumero('factura')
  const [fact] = await db.insert(facturas).values({ ...facturaData, numero }).returning()

  if (itemsData?.length) {
    await db.insert(factura_items).values(
      itemsData.map((it: any) => ({ ...it, factura_id: fact.id }))
    )
    // Descontar stock automáticamente
    for (const it of itemsData) {
      const [p] = await db.select().from(productos).where(eq(productos.id, it.producto_id))
      if (p) {
        await db.update(productos).set({ stock: p.stock - it.cantidad }).where(eq(productos.id, p.id))
        await db.insert(movimientos_stock).values({ producto_id: p.id, tipo: 'salida', cantidad: it.cantidad, referencia: fact.numero })
      }
    }
  }
  const full = await db.query.facturas.findFirst({
    where: eq(facturas.id, fact.id),
    with: { cliente: true, items: { with: { producto: true } } },
  })
  return c.json(full, 201)
})

app.put('/facturas/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const data = await c.req.json()
  const [row] = await db.update(facturas).set(data).where(eq(facturas.id, id)).returning()
  return c.json(row)
})

app.post('/facturas/:id/anular', async (c) => {
  const id = Number(c.req.param('id'))
  const [row] = await db.update(facturas).set({ estado: 'anulada' }).where(eq(facturas.id, id)).returning()
  return c.json(row)
})

app.delete('/facturas/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.delete(facturas).where(eq(facturas.id, id))
  return c.json({ ok: true })
})

// ═══════════════════════════════════════════════════════
// STATS / DASHBOARD
// ═══════════════════════════════════════════════════════
app.get('/stats/dashboard', async (c) => {
  const now = new Date()
  const mesInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [ventasMes] = await client`
    SELECT COALESCE(SUM(total), 0) as total
    FROM facturas
    WHERE estado != 'anulada' AND fecha >= ${mesInicio}
  `
  const [facturasPendientes] = await client`SELECT COUNT(*) as count FROM facturas WHERE estado = 'pendiente'`
  const [totalClientes] = await client`SELECT COUNT(*) as count FROM clientes`
  const [bajosStock] = await client`SELECT COUNT(*) as count FROM productos WHERE stock <= stock_minimo AND activo = true`

  const ventasMensuales = await client`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as mes,
      COALESCE(SUM(total), 0) as total,
      COUNT(*) as cantidad
    FROM facturas
    WHERE estado != 'anulada' AND created_at >= NOW() - INTERVAL '12 months'
    GROUP BY mes
    ORDER BY mes
  `
  const topProductos = await client`
    SELECT p.id as producto_id, p.nombre, SUM(fi.cantidad) as cantidad_vendida, SUM(fi.subtotal) as total_vendido
    FROM factura_items fi
    JOIN productos p ON p.id = fi.producto_id
    JOIN facturas f ON f.id = fi.factura_id
    WHERE f.estado != 'anulada'
    GROUP BY p.id, p.nombre
    ORDER BY cantidad_vendida DESC
    LIMIT 10
  `
  const topClientes = await client`
    SELECT c.id as cliente_id, c.nombre, SUM(f.total) as total_compras, COUNT(f.id) as cantidad_facturas
    FROM facturas f
    JOIN clientes c ON c.id = f.cliente_id
    WHERE f.estado != 'anulada'
    GROUP BY c.id, c.nombre
    ORDER BY total_compras DESC
    LIMIT 10
  `

  return c.json({
    ventas_mes: Number(ventasMes.total),
    facturas_pendientes: Number(facturasPendientes.count),
    total_clientes: Number(totalClientes.count),
    productos_bajo_stock: Number(bajosStock.count),
    ventas_mensuales: ventasMensuales,
    top_productos: topProductos,
    top_clientes: topClientes,
  })
})

app.get('/stats/ventas-mensuales', async (c) => {
  const { year = new Date().getFullYear() } = c.req.query()
  const rows = await client`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as mes,
      COALESCE(SUM(total), 0) as total,
      COUNT(*) as cantidad
    FROM facturas
    WHERE estado != 'anulada' AND EXTRACT(YEAR FROM created_at) = ${year}
    GROUP BY mes ORDER BY mes
  `
  return c.json(rows)
})

app.get('/stats/top-clientes', async (c) => {
  const rows = await client`
    SELECT c.id as cliente_id, c.nombre, SUM(f.total) as total_compras, COUNT(f.id) as cantidad_facturas
    FROM facturas f JOIN clientes c ON c.id = f.cliente_id
    WHERE f.estado != 'anulada'
    GROUP BY c.id, c.nombre ORDER BY total_compras DESC LIMIT 20
  `
  return c.json(rows)
})

app.get('/stats/top-productos', async (c) => {
  const rows = await client`
    SELECT p.id as producto_id, p.nombre, SUM(fi.cantidad) as cantidad_vendida, SUM(fi.subtotal) as total_vendido
    FROM factura_items fi JOIN productos p ON p.id = fi.producto_id
    JOIN facturas f ON f.id = fi.factura_id WHERE f.estado != 'anulada'
    GROUP BY p.id, p.nombre ORDER BY cantidad_vendida DESC LIMIT 20
  `
  return c.json(rows)
})

export default app
