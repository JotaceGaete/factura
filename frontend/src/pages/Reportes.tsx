import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/lib/api'
import { formatMoney } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const COLORS = ['#0ea5e9','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899']

export default function Reportes() {
  const year = new Date().getFullYear()
  const { data: stats } = useQuery({ queryKey: ['dashboard'], queryFn: statsApi.dashboard })

  const ventasData = stats?.ventas_mensuales?.map(v => ({
    mes: MESES[parseInt(v.mes.split('-')[1]) - 1],
    total: v.total,
    cantidad: v.cantidad,
  })) || []

  const topProductos = stats?.top_productos?.slice(0, 8) || []
  const topClientes = stats?.top_clientes?.slice(0, 6) || []

  const totalAnual = ventasData.reduce((acc, v) => acc + v.total, 0)
  const totalFacturas = ventasData.reduce((acc, v) => acc + v.cantidad, 0)
  const promedio = totalFacturas > 0 ? totalAnual / totalFacturas : 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Reportes</h1>
        <p className="text-sm text-[var(--text-muted)]">Estadísticas del negocio — {year}</p>
      </div>

      {/* Resumen anual */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="label">Ventas totales {year}</p>
          <p className="text-2xl font-bold font-mono text-[var(--accent)]">{formatMoney(totalAnual)}</p>
        </div>
        <div className="card p-4">
          <p className="label">Facturas emitidas</p>
          <p className="text-2xl font-bold font-mono text-[var(--text)]">{totalFacturas}</p>
        </div>
        <div className="card p-4">
          <p className="label">Ticket promedio</p>
          <p className="text-2xl font-bold font-mono text-[var(--text)]">{formatMoney(promedio)}</p>
        </div>
      </div>

      {/* Ventas por mes - barras */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Ventas mensuales {year}</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={ventasData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252d3d" />
            <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: '#161b27', border: '1px solid #252d3d', borderRadius: 8 }}
              formatter={(v: number) => [formatMoney(v), 'Ventas']}
            />
            <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Top productos - horizontal */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Productos más vendidos</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topProductos} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#252d3d" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nombre" tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false} tickLine={false} width={90}
                tickFormatter={v => v.length > 12 ? v.slice(0, 12) + '…' : v} />
              <Tooltip contentStyle={{ background: '#161b27', border: '1px solid #252d3d', borderRadius: 8 }}
                formatter={(v: number, name: string) => [name === 'total_vendido' ? formatMoney(v) : v, name === 'total_vendido' ? 'Total' : 'Unidades']} />
              <Bar dataKey="cantidad_vendida" fill="#22c55e" radius={[0, 4, 4, 0]} name="Unidades" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top clientes - pie */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Clientes por volumen</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={topClientes} dataKey="total_compras" nameKey="nombre"
                cx="50%" cy="50%" outerRadius={90} innerRadius={45}
                paddingAngle={3}>
                {topClientes.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#161b27', border: '1px solid #252d3d', borderRadius: 8 }}
                formatter={(v: number) => [formatMoney(v), 'Total compras']} />
              <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla detalle top clientes */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Ranking de clientes</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left text-xs text-[var(--text-muted)] pb-2 font-medium">#</th>
              <th className="text-left text-xs text-[var(--text-muted)] pb-2 font-medium">Cliente</th>
              <th className="text-right text-xs text-[var(--text-muted)] pb-2 font-medium">Facturas</th>
              <th className="text-right text-xs text-[var(--text-muted)] pb-2 font-medium">Total compras</th>
              <th className="text-right text-xs text-[var(--text-muted)] pb-2 font-medium">% del total</th>
            </tr>
          </thead>
          <tbody>
            {topClientes.map((c, i) => (
              <tr key={c.cliente_id} className="table-row">
                <td className="py-2.5 text-sm text-[var(--text-muted)] pr-4">{i + 1}</td>
                <td className="py-2.5 text-sm font-medium text-[var(--text)]">{c.nombre}</td>
                <td className="py-2.5 text-sm text-[var(--text-muted)] text-right">{c.cantidad_facturas}</td>
                <td className="py-2.5 text-sm font-mono text-[var(--text)] text-right">{formatMoney(c.total_compras)}</td>
                <td className="py-2.5 text-sm text-[var(--text-muted)] text-right">
                  {totalAnual > 0 ? ((c.total_compras / totalAnual) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
