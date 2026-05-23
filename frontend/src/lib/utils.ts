import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-CL').format(n)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export function formatRut(rut: string): string {
  const clean = rut.replace(/\./g, '').replace(/-/g, '')
  if (clean.length < 2) return rut
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
}

export function calcularSubtotal(cantidad: number, precio: number, descuento = 0): number {
  return cantidad * precio * (1 - descuento / 100)
}

export function calcularIVA(subtotal: number, porcentaje = 19): number {
  return Math.round(subtotal * (porcentaje / 100))
}

export function calcularTotal(subtotal: number, iva: number): number {
  return subtotal + iva
}

export function getPrecioByLista(producto: { precio1: number; precio2: number; precio3: number }, lista: 1 | 2 | 3): number {
  return lista === 1 ? producto.precio1 : lista === 2 ? producto.precio2 : producto.precio3
}

export const ESTADO_PRESUPUESTO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  vencido: 'Vencido',
}

export const ESTADO_FACTURA_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  pagada: 'Pagada',
  anulada: 'Anulada',
}

export const ESTADO_PRESUPUESTO_BADGE: Record<string, string> = {
  borrador: 'badge-gray',
  enviado: 'badge-blue',
  aceptado: 'badge-green',
  rechazado: 'badge-red',
  vencido: 'badge-yellow',
}

export const ESTADO_FACTURA_BADGE: Record<string, string> = {
  pendiente: 'badge-yellow',
  pagada: 'badge-green',
  anulada: 'badge-red',
}
