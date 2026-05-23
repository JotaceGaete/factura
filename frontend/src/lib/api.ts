import axios from 'axios'
import type {
  Cliente, Producto, Presupuesto, Factura,
  DashboardStats, MovimientoStock
} from '@/types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message || 'Error de conexión'
    console.error('[API Error]', msg)
    return Promise.reject(err)
  }
)

// ─── Clientes ─────────────────────────────────────────────────────────────────
export const clientesApi = {
  list: () => api.get<Cliente[]>('/clientes').then(r => r.data),
  get: (id: number) => api.get<Cliente>(`/clientes/${id}`).then(r => r.data),
  create: (data: Omit<Cliente, 'id' | 'created_at'>) => api.post<Cliente>('/clientes', data).then(r => r.data),
  update: (id: number, data: Partial<Cliente>) => api.put<Cliente>(`/clientes/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/clientes/${id}`),
}

// ─── Productos ────────────────────────────────────────────────────────────────
export const productosApi = {
  list: (params?: { activo?: boolean; bajo_stock?: boolean }) =>
    api.get<Producto[]>('/productos', { params }).then(r => r.data),
  get: (id: number) => api.get<Producto>(`/productos/${id}`).then(r => r.data),
  create: (data: Omit<Producto, 'id' | 'created_at'>) => api.post<Producto>('/productos', data).then(r => r.data),
  update: (id: number, data: Partial<Producto>) => api.put<Producto>(`/productos/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/productos/${id}`),
  ajustarStock: (id: number, data: { tipo: string; cantidad: number; notas?: string }) =>
    api.post(`/productos/${id}/stock`, data).then(r => r.data),
  movimientos: (id: number) => api.get<MovimientoStock[]>(`/productos/${id}/movimientos`).then(r => r.data),
}

// ─── Presupuestos ─────────────────────────────────────────────────────────────
export const presupuestosApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<Presupuesto[]>('/presupuestos', { params }).then(r => r.data),
  get: (id: number) => api.get<Presupuesto>(`/presupuestos/${id}`).then(r => r.data),
  create: (data: Omit<Presupuesto, 'id' | 'numero' | 'created_at'>) =>
    api.post<Presupuesto>('/presupuestos', data).then(r => r.data),
  update: (id: number, data: Partial<Presupuesto>) =>
    api.put<Presupuesto>(`/presupuestos/${id}`, data).then(r => r.data),
  convertirAFactura: (id: number) =>
    api.post<Factura>(`/presupuestos/${id}/convertir`).then(r => r.data),
  delete: (id: number) => api.delete(`/presupuestos/${id}`),
}

// ─── Facturas ─────────────────────────────────────────────────────────────────
export const facturasApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<Factura[]>('/facturas', { params }).then(r => r.data),
  get: (id: number) => api.get<Factura>(`/facturas/${id}`).then(r => r.data),
  create: (data: Omit<Factura, 'id' | 'numero' | 'created_at'>) =>
    api.post<Factura>('/facturas', data).then(r => r.data),
  update: (id: number, data: Partial<Factura>) =>
    api.put<Factura>(`/facturas/${id}`, data).then(r => r.data),
  anular: (id: number) => api.post(`/facturas/${id}/anular`).then(r => r.data),
  delete: (id: number) => api.delete(`/facturas/${id}`),
}

// ─── Dashboard / Stats ────────────────────────────────────────────────────────
export const statsApi = {
  dashboard: () => api.get<DashboardStats>('/stats/dashboard').then(r => r.data),
  ventasPorMes: (year: number) =>
    api.get('/stats/ventas-mensuales', { params: { year } }).then(r => r.data),
  ventasPorCliente: () => api.get('/stats/top-clientes').then(r => r.data),
  ventasPorProducto: () => api.get('/stats/top-productos').then(r => r.data),
}

export default api
