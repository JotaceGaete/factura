import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { facturasApi, clientesApi, productosApi } from '@/lib/api'
import { formatMoney, formatDate, ESTADO_FACTURA_LABEL, ESTADO_FACTURA_BADGE, getPrecioByLista, calcularSubtotal, calcularIVA } from '@/lib/utils'
import { generarPDFFactura } from '@/lib/pdf'
import { Plus, Search, FileDown, Printer, X, Trash2 } from 'lucide-react'
import type { FacturaItem } from '@/types'

type ItemForm = { producto_id: number; cantidad: number; precio_unitario: number; descuento: number }

export default function Facturas() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [modal, setModal] = useState(false)
  const [items, setItems] = useState<ItemForm[]>([])
  const [form, setForm] = useState({ cliente_id: 0, fecha: new Date().toISOString().slice(0, 10), fecha_vencimiento: '', notas: '', descuento_global: 0 })

  const { data: facturas = [], isLoading } = useQuery({ queryKey: ['facturas', estado], queryFn: () => facturasApi.list(estado ? { estado } : undefined) })
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: clientesApi.list })
  const { data: productos = [] } = useQuery({ queryKey: ['productos'], queryFn: () => productosApi.list() })

  const createMut = useMutation({
    mutationFn: facturasApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facturas'] }); qc.invalidateQueries({ queryKey: ['productos'] }); setModal(false) }
  })
  const anularMut = useMutation({ mutationFn: facturasApi.anular, onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas'] }) })

  const cliente = clientes.find(c => c.id === form.cliente_id)

  function addItem() {
    if (!productos[0]) return
    const p = productos[0]
    const precio = getPrecioByLista(p, cliente?.lista_precio || 1)
    setItems(prev => [...prev, { producto_id: p.id, cantidad: 1, precio_unitario: precio, descuento: 0 }])
  }

  function updateItem(i: number, field: keyof ItemForm, value: number) {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      if (field === 'producto_id') {
        const p = productos.find(p => p.id === value)
        return { ...item, producto_id: value, precio_unitario: p ? getPrecioByLista(p, cliente?.lista_precio || 1) : item.precio_unitario }
      }
      return { ...item, [field]: value }
    }))
  }

  const subtotal = items.reduce((acc, it) => acc + calcularSubtotal(it.cantidad, it.precio_unitario, it.descuento), 0)
  const subtotalConDesc = subtotal * (1 - form.descuento_global / 100)
  const iva = calcularIVA(subtotalConDesc)
  const total = subtotalConDesc + iva

  function handleSubmit() {
    if (!form.cliente_id || items.length === 0) return
    createMut.mutate({
      cliente_id: form.cliente_id,
      fecha: form.fecha,
      fecha_vencimiento: form.fecha_vencimiento || null,
      notas: form.notas || null,
      descuento_global: form.descuento_global,
      subtotal: subtotalConDesc,
      iva, total,
      presupuesto_id: null,
      estado: 'pendiente',
      items: items.map(it => ({ ...it, subtotal: calcularSubtotal(it.cantidad, it.precio_unitario, it.descuento) })) as FacturaItem[],
    })
  }

  const filtered = facturas.filter(f =>
    (f.cliente?.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
    f.numero.includes(search)
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Facturas</h1>
          <p className="text-sm text-[var(--text-muted)]">{facturas.length} facturas</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setItems([]); setForm({ cliente_id: 0, fecha: new Date().toISOString().slice(0,10), fecha_vencimiento: '', notas: '', descuento_global: 0 }); setModal(true) }}>
          <Plus size={16} /> Nueva factura
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input className="input pl-9" placeholder="Buscar por N° o cliente…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={estado} onChange={e => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagada">Pagada</option>
          <option value="anulada">Anulada</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['N°', 'Cliente', 'Fecha', 'Vencimiento', 'Total', 'Estado', ''].map(h => (
                <th key={h} className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="text-center py-8 text-[var(--text-muted)] text-sm">Cargando…</td></tr>
              : filtered.map(f => (
                <tr key={f.id} className="table-row">
                  <td className="px-4 py-3 text-sm font-mono text-[var(--accent)]">{f.numero}</td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text)]">{f.cliente?.nombre}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{formatDate(f.fecha)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{f.fecha_vencimiento ? formatDate(f.fecha_vencimiento) : '—'}</td>
                  <td className="px-4 py-3 text-sm font-bold font-mono text-[var(--text)]">{formatMoney(f.total)}</td>
                  <td className="px-4 py-3"><span className={ESTADO_FACTURA_BADGE[f.estado]}>{ESTADO_FACTURA_LABEL[f.estado]}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button className="btn-ghost px-2 py-1" title="Descargar PDF" onClick={() => generarPDFFactura(f)}><FileDown size={14} /></button>
                      <button className="btn-ghost px-2 py-1" title="Imprimir" onClick={() => { generarPDFFactura(f); window.print() }}><Printer size={14} /></button>
                      {f.estado !== 'anulada' && (
                        <button className="btn-danger px-2 py-1" title="Anular" onClick={() => anularMut.mutate(f.id)}><X size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal nueva factura */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 pt-8 overflow-y-auto" onClick={() => setModal(false)}>
          <div className="card w-full max-w-3xl p-6 space-y-5 mb-8" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-[var(--text)] text-lg">Nueva factura</h2>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="label">Cliente</label>
                <select className="input" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: Number(e.target.value) }))}>
                  <option value={0}>Seleccionar cliente…</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Fecha</label>
                <input className="input" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div>
                <label className="label">Vencimiento</label>
                <input className="input" type="date" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} />
              </div>
              <div>
                <label className="label">Descuento global %</label>
                <input className="input" type="number" min={0} max={100} value={form.descuento_global} onChange={e => setForm(f => ({ ...f, descuento_global: Number(e.target.value) }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Notas</label>
                <input className="input" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="label mb-0">Productos</span>
                <button className="btn-ghost text-xs px-2 py-1 flex items-center gap-1" onClick={addItem}><Plus size={12} /> Agregar</button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => {
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <select className="input text-xs" value={item.producto_id} onChange={e => updateItem(i, 'producto_id', Number(e.target.value))}>
                          {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input className="input text-xs" type="number" min={1} value={item.cantidad} onChange={e => updateItem(i, 'cantidad', Number(e.target.value))} placeholder="Cant." />
                      </div>
                      <div className="col-span-2">
                        <input className="input text-xs" type="number" value={item.precio_unitario} onChange={e => updateItem(i, 'precio_unitario', Number(e.target.value))} placeholder="Precio" />
                      </div>
                      <div className="col-span-1">
                        <input className="input text-xs" type="number" min={0} max={100} value={item.descuento} onChange={e => updateItem(i, 'descuento', Number(e.target.value))} placeholder="%" />
                      </div>
                      <div className="col-span-1 text-right text-xs font-mono text-[var(--text-muted)]">
                        {formatMoney(calcularSubtotal(item.cantidad, item.precio_unitario, item.descuento))}
                      </div>
                      <button className="col-span-1 btn-danger px-1 py-1 flex items-center justify-center" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Totales */}
            <div className="flex justify-end">
              <div className="space-y-1 text-right text-sm w-48">
                <div className="flex justify-between text-[var(--text-muted)]"><span>Neto:</span><span className="font-mono">{formatMoney(subtotalConDesc)}</span></div>
                <div className="flex justify-between text-[var(--text-muted)]"><span>IVA 19%:</span><span className="font-mono">{formatMoney(iva)}</span></div>
                <div className="flex justify-between text-[var(--text)] font-bold text-base border-t border-[var(--border)] pt-1"><span>Total:</span><span className="font-mono text-[var(--accent)]">{formatMoney(total)}</span></div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-[var(--border)]">
              <button className="btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={createMut.isPending}>
                {createMut.isPending ? 'Guardando…' : 'Emitir factura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
