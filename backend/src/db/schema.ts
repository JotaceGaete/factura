import { pgTable, serial, varchar, text, integer, numeric, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────
export const listaPrecioEnum = pgEnum('lista_precio', ['1', '2', '3'])
export const estadoPresupuestoEnum = pgEnum('estado_presupuesto', ['borrador', 'enviado', 'aceptado', 'rechazado', 'vencido'])
export const estadoFacturaEnum = pgEnum('estado_factura', ['pendiente', 'pagada', 'anulada'])
export const tipoMovimientoEnum = pgEnum('tipo_movimiento', ['entrada', 'salida', 'ajuste'])

// ─── Clientes ─────────────────────────────────────────────────────────────────
export const clientes = pgTable('clientes', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  rut: varchar('rut', { length: 20 }).notNull().unique(),
  email: varchar('email', { length: 200 }),
  telefono: varchar('telefono', { length: 50 }),
  direccion: text('direccion'),
  lista_precio: integer('lista_precio').notNull().default(1),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

// ─── Productos ────────────────────────────────────────────────────────────────
export const productos = pgTable('productos', {
  id: serial('id').primaryKey(),
  codigo: varchar('codigo', { length: 50 }).notNull().unique(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  descripcion: text('descripcion'),
  precio1: integer('precio1').notNull().default(0),
  precio2: integer('precio2').notNull().default(0),
  precio3: integer('precio3').notNull().default(0),
  stock: integer('stock').notNull().default(0),
  stock_minimo: integer('stock_minimo').notNull().default(5),
  unidad: varchar('unidad', { length: 20 }).notNull().default('un'),
  activo: boolean('activo').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

// ─── Presupuestos ─────────────────────────────────────────────────────────────
export const presupuestos = pgTable('presupuestos', {
  id: serial('id').primaryKey(),
  numero: varchar('numero', { length: 20 }).notNull().unique(),
  cliente_id: integer('cliente_id').notNull().references(() => clientes.id),
  fecha: varchar('fecha', { length: 10 }).notNull(),
  validez_dias: integer('validez_dias').notNull().default(15),
  estado: varchar('estado', { length: 20 }).notNull().default('borrador'),
  notas: text('notas'),
  subtotal: integer('subtotal').notNull().default(0),
  descuento_global: integer('descuento_global').notNull().default(0),
  iva: integer('iva').notNull().default(0),
  total: integer('total').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

export const presupuesto_items = pgTable('presupuesto_items', {
  id: serial('id').primaryKey(),
  presupuesto_id: integer('presupuesto_id').notNull().references(() => presupuestos.id, { onDelete: 'cascade' }),
  producto_id: integer('producto_id').notNull().references(() => productos.id),
  cantidad: integer('cantidad').notNull(),
  precio_unitario: integer('precio_unitario').notNull(),
  descuento: integer('descuento').notNull().default(0),
  subtotal: integer('subtotal').notNull(),
})

// ─── Facturas ─────────────────────────────────────────────────────────────────
export const facturas = pgTable('facturas', {
  id: serial('id').primaryKey(),
  numero: varchar('numero', { length: 20 }).notNull().unique(),
  cliente_id: integer('cliente_id').notNull().references(() => clientes.id),
  presupuesto_id: integer('presupuesto_id').references(() => presupuestos.id),
  fecha: varchar('fecha', { length: 10 }).notNull(),
  fecha_vencimiento: varchar('fecha_vencimiento', { length: 10 }),
  estado: varchar('estado', { length: 20 }).notNull().default('pendiente'),
  notas: text('notas'),
  subtotal: integer('subtotal').notNull().default(0),
  descuento_global: integer('descuento_global').notNull().default(0),
  iva: integer('iva').notNull().default(0),
  total: integer('total').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

export const factura_items = pgTable('factura_items', {
  id: serial('id').primaryKey(),
  factura_id: integer('factura_id').notNull().references(() => facturas.id, { onDelete: 'cascade' }),
  producto_id: integer('producto_id').notNull().references(() => productos.id),
  cantidad: integer('cantidad').notNull(),
  precio_unitario: integer('precio_unitario').notNull(),
  descuento: integer('descuento').notNull().default(0),
  subtotal: integer('subtotal').notNull(),
})

// ─── Movimientos Stock ────────────────────────────────────────────────────────
export const movimientos_stock = pgTable('movimientos_stock', {
  id: serial('id').primaryKey(),
  producto_id: integer('producto_id').notNull().references(() => productos.id),
  tipo: varchar('tipo', { length: 20 }).notNull(),
  cantidad: integer('cantidad').notNull(),
  referencia: varchar('referencia', { length: 50 }),
  notas: text('notas'),
  created_at: timestamp('created_at').defaultNow().notNull(),
})

// ─── Contadores (para numeración automática) ──────────────────────────────────
export const contadores = pgTable('contadores', {
  id: serial('id').primaryKey(),
  tipo: varchar('tipo', { length: 20 }).notNull().unique(),
  ultimo: integer('ultimo').notNull().default(0),
})

// ─── Relations ────────────────────────────────────────────────────────────────
export const clientesRelations = relations(clientes, ({ many }) => ({
  presupuestos: many(presupuestos),
  facturas: many(facturas),
}))

export const presupuestosRelations = relations(presupuestos, ({ one, many }) => ({
  cliente: one(clientes, { fields: [presupuestos.cliente_id], references: [clientes.id] }),
  items: many(presupuesto_items),
}))

export const presupuesto_itemsRelations = relations(presupuesto_items, ({ one }) => ({
  presupuesto: one(presupuestos, { fields: [presupuesto_items.presupuesto_id], references: [presupuestos.id] }),
  producto: one(productos, { fields: [presupuesto_items.producto_id], references: [productos.id] }),
}))

export const facturasRelations = relations(facturas, ({ one, many }) => ({
  cliente: one(clientes, { fields: [facturas.cliente_id], references: [clientes.id] }),
  items: many(factura_items),
}))

export const factura_itemsRelations = relations(factura_items, ({ one }) => ({
  factura: one(facturas, { fields: [factura_items.factura_id], references: [facturas.id] }),
  producto: one(productos, { fields: [factura_items.producto_id], references: [productos.id] }),
}))
