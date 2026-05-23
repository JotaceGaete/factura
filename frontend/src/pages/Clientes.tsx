import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientesApi } from '@/lib/api'
import { formatRut } from '@/lib/utils'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import type { Cliente } from '@/types'

const LISTA_LABELS: Record<number, string> = { 1: 'Lista 1', 2: 'Lista 2', 3: 'Lista 3' }
const LISTA_BADGE: Record<number, string> = { 1: 'badge-blue', 2: 'badge-green', 3: 'badge-yellow' }

const DEFAULT_FORM: Omit<Cliente, 'id' | 'created_at'> = {
  nombre: '', rut: '', email: '', telefono: '', direccion: '', lista_precio: 1
}

export default function Clientes() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ open: boolean; editing?: Cliente }>({ open: false })
  const [form, setForm] = useState(DEFAULT_FORM)

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'], queryFn: clientesApi.list
  })

  const createMut = useMutation({
    mutationFn: clientesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); closeModal() }
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Cliente> }) => clientesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clientes'] }); closeModal() }
  })
  const deleteMut = useMutation({
    mutationFn: clientesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] })
  })

  function openCreate() { setForm(DEFAULT_FORM); setModal({ open: true }) }
  function openEdit(c: Cliente) {
    setForm({ nombre: c.nombre, rut: c.rut, email: c.email || '', telefono: c.telefono || '', direccion: c.direccion || '', lista_precio: c.lista_precio })
    setModal({ open: true, editing: c })
  }
  function closeModal() { setModal({ open: false }) }

  function handleSubmit() {
    if (modal.editing) updateMut.mutate({ id: modal.editing.id, data: form })
    else createMut.mutate(form)
  }

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.rut.includes(search)
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Clientes</h1>
          <p className="text-sm text-[var(--text-muted)]">{clientes.length} clientes registrados</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input className="input pl-9" placeholder="Buscar por nombre o RUT…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {['Nombre', 'RUT', 'Email', 'Teléfono', 'Lista precio', ''].map(h => (
                <th key={h} className="text-left text-xs text-[var(--text-muted)] font-medium px-4 py-3 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-[var(--text-muted)] text-sm">Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-[var(--text-muted)] text-sm">Sin resultados</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="table-row">
                <td className="px-4 py-3 text-sm font-medium text-[var(--text)]">{c.nombre}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)] font-mono">{formatRut(c.rut)}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{c.email || '—'}</td>
                <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{c.telefono || '—'}</td>
                <td className="px-4 py-3">
                  <span className={LISTA_BADGE[c.lista_precio]}>{LISTA_LABELS[c.lista_precio]}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button className="btn-ghost px-2 py-1" onClick={() => openEdit(c)}><Edit2 size={14} /></button>
                    <button className="btn-danger px-2 py-1" onClick={() => deleteMut.mutate(c.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="card w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-[var(--text)]">{modal.editing ? 'Editar cliente' : 'Nuevo cliente'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Nombre</label>
                <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div>
                <label className="label">RUT</label>
                <input className="input" value={form.rut} onChange={e => setForm(f => ({ ...f, rut: e.target.value }))} placeholder="12.345.678-9" />
              </div>
              <div>
                <label className="label">Lista de precio</label>
                <select className="input" value={form.lista_precio} onChange={e => setForm(f => ({ ...f, lista_precio: Number(e.target.value) as 1|2|3 }))}>
                  <option value={1}>Lista 1</option>
                  <option value={2}>Lista 2</option>
                  <option value={3}>Lista 3</option>
                </select>
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={form.telefono || ''} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Dirección</label>
                <input className="input" value={form.direccion || ''} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button className="btn-ghost" onClick={closeModal}>Cancelar</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
