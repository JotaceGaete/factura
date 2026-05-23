import jsPDF from 'jspdf'
import type { Factura, FacturaItem, Presupuesto, PresupuestoItem } from '@/types'
import { formatMoney, formatDate, formatRut } from './utils'

const EMPRESA = {
  nombre: 'Mi Empresa SpA',
  rut: '76.000.000-0',
  giro: 'Venta de productos',
  direccion: 'Av. Ejemplo 123, Santiago',
  telefono: '+56 9 9000 0000',
  email: 'contacto@miempresa.cl',
}

function addHeader(doc: jsPDF, tipo: 'FACTURA' | 'PRESUPUESTO', numero: string) {
  // Fondo header
  doc.setFillColor(15, 17, 23)
  doc.rect(0, 0, 210, 40, 'F')

  // Nombre empresa
  doc.setTextColor(226, 232, 240)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(EMPRESA.nombre, 15, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(EMPRESA.giro, 15, 22)
  doc.text(`${EMPRESA.direccion} | ${EMPRESA.telefono}`, 15, 27)
  doc.text(EMPRESA.email, 15, 32)

  // Tipo documento (derecha)
  doc.setFillColor(14, 165, 233)
  doc.roundedRect(140, 8, 55, 24, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(tipo, 167, 18, { align: 'center' })
  doc.setFontSize(10)
  doc.text(`N° ${numero}`, 167, 26, { align: 'center' })
}

function addClienteSection(doc: jsPDF, cliente: Factura['cliente'], fecha: string, extra?: string) {
  doc.setFillColor(22, 27, 39)
  doc.rect(0, 45, 210, 35, 'F')

  doc.setTextColor(100, 116, 139)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENTE', 15, 55)

  doc.setTextColor(226, 232, 240)
  doc.setFontSize(11)
  doc.text(cliente?.nombre || '-', 15, 62)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(`RUT: ${formatRut(cliente?.rut || '')}`, 15, 68)
  if (cliente?.direccion) doc.text(cliente.direccion, 15, 73)

  // Fecha (derecha)
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('FECHA', 150, 55)
  doc.setTextColor(226, 232, 240)
  doc.setFontSize(10)
  doc.text(formatDate(fecha), 150, 62)
  if (extra) {
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(8)
    doc.text(extra, 150, 68)
  }
}

function addItemsTable(doc: jsPDF, items: FacturaItem[] | PresupuestoItem[], startY: number): number {
  let y = startY + 10

  // Header tabla
  doc.setFillColor(37, 45, 61)
  doc.rect(10, y, 190, 8, 'F')
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUCTO', 15, y + 5)
  doc.text('CANT.', 110, y + 5, { align: 'right' })
  doc.text('P. UNIT.', 140, y + 5, { align: 'right' })
  doc.text('DESC.', 160, y + 5, { align: 'right' })
  doc.text('SUBTOTAL', 195, y + 5, { align: 'right' })
  y += 12

  // Items
  items?.forEach((item, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(22, 27, 39)
      doc.rect(10, y - 4, 190, 8, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(226, 232, 240)
    doc.setFontSize(9)
    doc.text(item.producto?.nombre || `Producto #${item.producto_id}`, 15, y + 1)
    doc.setTextColor(148, 163, 184)
    doc.text(String(item.cantidad), 110, y + 1, { align: 'right' })
    doc.text(formatMoney(item.precio_unitario), 140, y + 1, { align: 'right' })
    doc.text(item.descuento > 0 ? `${item.descuento}%` : '-', 160, y + 1, { align: 'right' })
    doc.setTextColor(226, 232, 240)
    doc.text(formatMoney(item.subtotal), 195, y + 1, { align: 'right' })
    y += 9
  })

  return y
}

function addTotales(doc: jsPDF, doc_data: Factura | Presupuesto, y: number) {
  y += 8
  doc.setFillColor(22, 27, 39)
  doc.rect(120, y, 80, 32, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('Neto:', 125, y + 8)
  doc.text('IVA (19%):', 125, y + 16)

  doc.setTextColor(226, 232, 240)
  doc.text(formatMoney(doc_data.subtotal), 195, y + 8, { align: 'right' })
  doc.text(formatMoney(doc_data.iva), 195, y + 16, { align: 'right' })

  // Total
  doc.setFillColor(14, 165, 233)
  doc.rect(120, y + 20, 80, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('TOTAL:', 125, y + 27)
  doc.text(formatMoney(doc_data.total), 195, y + 27, { align: 'right' })
}

export function generarPDFFactura(factura: Factura): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  addHeader(doc, 'FACTURA', factura.numero)
  addClienteSection(doc, factura.cliente, factura.fecha,
    factura.fecha_vencimiento ? `Vence: ${formatDate(factura.fecha_vencimiento)}` : undefined)
  const y = addItemsTable(doc, factura.items, 85)
  addTotales(doc, factura, y)
  if (factura.notas) {
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(8)
    doc.text(`Notas: ${factura.notas}`, 15, y + 50)
  }
  doc.save(`factura-${factura.numero}.pdf`)
}

export function generarPDFPresupuesto(presupuesto: Presupuesto): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  addHeader(doc, 'PRESUPUESTO', presupuesto.numero)
  addClienteSection(doc, presupuesto.cliente, presupuesto.fecha,
    `Válido: ${presupuesto.validez_dias} días`)
  const y = addItemsTable(doc, presupuesto.items, 85)
  addTotales(doc, presupuesto, y)
  doc.save(`presupuesto-${presupuesto.numero}.pdf`)
}
