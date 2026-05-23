import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productosApi } from '@/lib/api'
import { formatMoney } from '@/lib/utils'
import { Plus, Search, Edit2, Trash2, AlertTriangle, Package } from 'lucide-react'
import type { Producto } from '@/types'

const DEFAULT_FORM: Omit<Producto, 'id' | 'created_at'> = {
  codigo: '', nombre: '', descripcion: '', precio1: 0, precio2: 0, precio3: 0,
  stock: 0, stock_minimo: 5, unidad: 'un', activo: true
}

export default function Productos() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [soloStock, setSoloStock] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; editing?: Producto }>({ open: false })
  const [form, setForm] = useState(DEFAULT_FORM)
  const [stockModal, setStockModal] = useState<{ open: boolean; producto?: Producto }>({ open: false })
  const [stockAdj, setStockAdj] = useState({ tipo: 'entrada', cantidad: 0, notas: '' })

  const { data: productos = [], isLoading } = useQuery({
    queryKey: ['productos', soloStock],
    queryFn: () => productosApi.list(soloStock ? { bajo_stock: true } : undefined)
  })

  const createMut = useMutation({ mutationFn: productosApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); closeModal() } })
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<Producto> }) => productosApi.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); closeModal() } })
  const deleteMut = useMutation({ mutationFn: productosApi.delete, onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }) })
  const stockMut = useMutation({ mutationFn: ({ id, data }: { id: number; data: typeof stockAdj }) => productosApi.ajustarStock(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); setStockModal({ open: false }) } })

  function openCreate() { setForm(DEFAULT_FORM); setModal({ open: true }) }
  function openEdit(p: Producto) { setForm({ ...p }); setModal({ open: true, editing: p }) }
  function closeModal() { setModal({ open: false }) }
  function handleSubmit() {
    if (modal.editing) updateMut.mutate({ id: modal.editing.id, data: form })
    else createMut.mutate(form)
  }

  const filtered = productos.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Productos</h1>
          <p className="text-sm text-[var(--text-muted)]">{productos.length} productos</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input className="input pl-9" placeholder="Buscar por nombre o código…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={`btn-ghost flex items-center gap-2 ${soloStock ? 'text-[var(--warning)]' : ''}`} onClick={() => setSoloStock(s => !s)}>
          <AlertTriangle size={15} /> Stock bajo
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['Código', 'Nombre', 'Stock', 'Precio L1', 'Precio L2', 'Precio L3', 'Unidad', ''].map(h => (
                <th key={h} className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="text-center py-8 text-[var(--text-muted)] text-sm">Cargando…</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-[var(--text-muted)] text-sm">Sin resultados</td></tr>
              : filtered.map(p => (
                <tr key={p.id} className="table-row">
                  <td className="px-4 py-3 text-sm font-mono text-[var(--text-muted)]">{p.codigo}</td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text)]">
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-[var(--text-muted)]" />
                      {p.nombre}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={p.stock <= p.stock_minimo ? 'badge-red' : 'badge-green'}>
                      {p.stock} {p.unidad}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text)] font-mono">{formatMoney(p.precio1)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text)] font-mono">{formatMoney(p.precio2)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text)] font-mono">{formatMoney(p.precio3)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{p.unidad}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => { setStockAdj({ tipo: 'entrada', cantidad: 0, notas: '' }); setStockModal({ open: true, producto: p }) }}>Stock</button>
                      <button className="btn-ghost px-2 py-1" onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                      <button className="btn-danger px-2 py-1" onClick={() => deleteMut.mutate(p.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal producto */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="card w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-[var(--text)]">{modal.editing ? 'Editar producto' : 'Nuevo producto'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Código</label>
                <input className="input" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} />
              </div>
              <div>
                <label className="label">Unidad</label>
                <select className="input" value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
                  {['un', 'kg', 'lt', 'mt', 'caja', 'pack'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Nombre</label>
                <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Descripción</label>
                <input className="input" value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
              <div>
                <label className="label">Precio Lista 1</label>
                <input className="input" type="number" value={form.precio1} onChange={e => setForm(f => ({ ...f, precio1: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Precio Lista 2</label>
                <input className="input" type="number" value={form.precio2} onChange={e => setForm(f => ({ ...f, precio2: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Precio Lista 3</label>
                <input className="input" type="number" value={form.precio3} onChange={e => setForm(f => ({ ...f, precio3: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Stock mínimo</label>
                <input className="input" type="number" value={form.stock_minimo} onChange={e => setForm(f => ({ ...f, stock_minimo: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button className="btn-ghost" onClick={closeModal}>Cancelar</button>
              <button className="btn-primary" onClick={handleSubmit}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajuste stock */}
      {stockModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setStockModal({ open: false })}>
          <div className="card w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-[var(--text)]">Ajustar stock — {stockModal.producto?.nombre}</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={stockAdj.tipo} onChange={e => setStockAdj(s => ({ ...s, tipo: e.target.value }))}>
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                  <option value="ajuste">Ajuste manual</option>
                </select>
              </div>
              <div>
                <label className="label">Cantidad</label>
                <input className="input" type="number" value={stockAdj.cantidad} onChange={e => setStockAdj(s => ({ ...s, cantidad: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Notas</label>
                <input className="input" value={stockAdj.notas} onChange={e => setStockAdj(s => ({ ...s, notas: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setStockModal({ open: false })}>Cancelar</button>
              <button className="btn-primary" onClick={() => stockMut.mutate({ id: stockModal.producto!.id, data: stockAdj })}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
