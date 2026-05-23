// ─── Clientes ────────────────────────────────────────────────────────────────
export interface Cliente {
  id: number
  nombre: string
  rut: string
  email: string | null
  telefono: string | null
  direccion: string | null
  lista_precio: 1 | 2 | 3
  created_at: string
}

// ─── Productos ────────────────────────────────────────────────────────────────
export interface Producto {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  precio1: number
  precio2: number
  precio3: number
  stock: number
  stock_minimo: number
  unidad: string
  activo: boolean
  created_at: string
}

// ─── Presupuestos ─────────────────────────────────────────────────────────────
export type EstadoPresupuesto = 'borrador' | 'enviado' | 'aceptado' | 'rechazado' | 'vencido'

export interface PresupuestoItem {
  id: number
  presupuesto_id: number
  producto_id: number
  producto?: Producto
  cantidad: number
  precio_unitario: number
  descuento: number
  subtotal: number
}

export interface Presupuesto {
  id: number
  numero: string
  cliente_id: number
  cliente?: Cliente
  fecha: string
  validez_dias: number
  estado: EstadoPresupuesto
  notas: string | null
  subtotal: number
  descuento_global: number
  iva: number
  total: number
  items: PresupuestoItem[]
  created_at: string
}

// ─── Facturas ─────────────────────────────────────────────────────────────────
export type EstadoFactura = 'pendiente' | 'pagada' | 'anulada'

export interface FacturaItem {
  id: number
  factura_id: number
  producto_id: number
  producto?: Producto
  cantidad: number
  precio_unitario: number
  descuento: number
  subtotal: number
}

export interface Factura {
  id: number
  numero: string
  cliente_id: number
  cliente?: Cliente
  presupuesto_id: number | null
  fecha: string
  fecha_vencimiento: string | null
  estado: EstadoFactura
  notas: string | null
  subtotal: number
  descuento_global: number
  iva: number
  total: number
  items: FacturaItem[]
  created_at: string
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export interface VentaMensual {
  mes: string
  total: number
  cantidad: number
}

export interface TopProducto {
  producto_id: number
  nombre: string
  cantidad_vendida: number
  total_vendido: number
}

export interface TopCliente {
  cliente_id: number
  nombre: string
  total_compras: number
  cantidad_facturas: number
}

export interface DashboardStats {
  ventas_mes: number
  facturas_pendientes: number
  total_clientes: number
  productos_bajo_stock: number
  ventas_mensuales: VentaMensual[]
  top_productos: TopProducto[]
  top_clientes: TopCliente[]
}

// ─── Movimientos Stock ────────────────────────────────────────────────────────
export interface MovimientoStock {
  id: number
  producto_id: number
  producto?: Producto
  tipo: 'entrada' | 'salida' | 'ajuste'
  cantidad: number
  referencia: string | null
  notas: string | null
  created_at: string
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T
  total?: number
  page?: number
  limit?: number
}

export interface ApiError {
  error: string
  message: string
}

// ─── Filtros ──────────────────────────────────────────────────────────────────
export interface FiltroFacturas {
  estado?: EstadoFactura
  cliente_id?: number
  fecha_desde?: string
  fecha_hasta?: string
  page?: number
  limit?: number
}
