import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { presupuestosApi, clientesApi, productosApi } from '@/lib/api'
import { formatMoney, formatDate, ESTADO_PRESUPUESTO_LABEL, ESTADO_PRESUPUESTO_BADGE, getPrecioByLista, calcularSubtotal, calcularIVA } from '@/lib/utils'
import { generarPDFPresupuesto } from '@/lib/pdf'
import { Plus, Search, FileDown, ArrowRight, Trash2 } from 'lucide-react'
import type { PresupuestoItem } from '@/types'

type ItemForm = { producto_id: number; cantidad: number; precio_unitario: number; descuento: number }

export default function Presupuestos() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [items, setItems] = useState<ItemForm[]>([])
  const [form, setForm] = useState({ cliente_id: 0, fecha: new Date().toISOString().slice(0, 10), validez_dias: 15, notas: '', descuento_global: 0 })

  const { data: presupuestos = [], isLoading } = useQuery({ queryKey: ['presupuestos'], queryFn: () => presupuestosApi.list() })
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: clientesApi.list })
  const { data: productos = [] } = useQuery({ queryKey: ['productos'], queryFn: () => productosApi.list() })

  const createMut = useMutation({ mutationFn: presupuestosApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['presupuestos'] }); setModal(false) } })
  const convertirMut = useMutation({ mutationFn: presupuestosApi.convertirAFactura, onSuccess: () => { qc.invalidateQueries({ queryKey: ['presupuestos'] }); qc.invalidateQueries({ queryKey: ['facturas'] }) } })
  const deleteMut = useMutation({ mutationFn: presupuestosApi.delete, onSuccess: () => qc.invalidateQueries({ queryKey: ['presupuestos'] }) })

  const cliente = clientes.find(c => c.id === form.cliente_id)

  function addItem() {
    if (!productos[0]) return
    const p = productos[0]
    setItems(prev => [...prev, { producto_id: p.id, cantidad: 1, precio_unitario: getPrecioByLista(p, cliente?.lista_precio || 1), descuento: 0 }])
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
      validez_dias: form.validez_dias,
      notas: form.notas || null,
      descuento_global: form.descuento_global,
      subtotal: subtotalConDesc,
      iva, total, estado: 'borrador',
      items: items.map(it => ({ ...it, subtotal: calcularSubtotal(it.cantidad, it.precio_unitario, it.descuento) })) as PresupuestoItem[],
    })
  }

  const filtered = presupuestos.filter(p =>
    (p.cliente?.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
    p.numero.includes(search)
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Presupuestos</h1>
          <p className="text-sm text-[var(--text-muted)]">{presupuestos.length} presupuestos</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setItems([]); setModal(true) }}>
          <Plus size={16} /> Nuevo presupuesto
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input className="input pl-9" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['N°', 'Cliente', 'Fecha', 'Validez', 'Total', 'Estado', ''].map(h => (
                <th key={h} className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="text-center py-8 text-sm text-[var(--text-muted)]">Cargando…</td></tr>
              : filtered.map(p => (
                <tr key={p.id} className="table-row">
                  <td className="px-4 py-3 text-sm font-mono text-[var(--accent)]">{p.numero}</td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text)]">{p.cliente?.nombre}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{formatDate(p.fecha)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{p.validez_dias} días</td>
                  <td className="px-4 py-3 text-sm font-bold font-mono text-[var(--text)]">{formatMoney(p.total)}</td>
                  <td className="px-4 py-3"><span className={ESTADO_PRESUPUESTO_BADGE[p.estado]}>{ESTADO_PRESUPUESTO_LABEL[p.estado]}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button className="btn-ghost px-2 py-1" title="PDF" onClick={() => generarPDFPresupuesto(p)}><FileDown size={14} /></button>
                      {p.estado === 'aceptado' && (
                        <button className="btn-ghost px-2 py-1 text-green-400" title="Convertir a factura" onClick={() => convertirMut.mutate(p.id)}>
                          <ArrowRight size={14} />
                        </button>
                      )}
                      <button className="btn-danger px-2 py-1" onClick={() => deleteMut.mutate(p.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 pt-8 overflow-y-auto" onClick={() => setModal(false)}>
          <div className="card w-full max-w-3xl p-6 space-y-5 mb-8" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-[var(--text)] text-lg">Nuevo presupuesto</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="label">Cliente</label>
                <select className="input" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: Number(e.target.value) }))}>
                  <option value={0}>Seleccionar…</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} (L{c.lista_precio})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Fecha</label>
                <input className="input" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div>
                <label className="label">Validez (días)</label>
                <input className="input" type="number" value={form.validez_dias} onChange={e => setForm(f => ({ ...f, validez_dias: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Descuento global %</label>
                <input className="input" type="number" value={form.descuento_global} onChange={e => setForm(f => ({ ...f, descuento_global: Number(e.target.value) }))} />
              </div>
              <div className="col-span-3">
                <label className="label">Notas</label>
                <input className="input" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="label mb-0">Productos</span>
                <button className="btn-ghost text-xs px-2 py-1 flex items-center gap-1" onClick={addItem}><Plus size={12} /> Agregar</button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
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
                      <input className="input text-xs" type="number" value={item.precio_unitario} onChange={e => updateItem(i, 'precio_unitario', Number(e.target.value))} />
                    </div>
                    <div className="col-span-1">
                      <input className="input text-xs" type="number" value={item.descuento} onChange={e => updateItem(i, 'descuento', Number(e.target.value))} placeholder="%" />
                    </div>
                    <div className="col-span-1 text-right text-xs font-mono text-[var(--text-muted)]">
                      {formatMoney(calcularSubtotal(item.cantidad, item.precio_unitario, item.descuento))}
                    </div>
                    <button className="col-span-1 btn-danger px-1 py-1 flex items-center justify-center" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

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
                {createMut.isPending ? 'Guardando…' : 'Crear presupuesto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
