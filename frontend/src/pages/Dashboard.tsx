import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/lib/api'
import { formatMoney } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { TrendingUp, Users, AlertTriangle, Receipt } from 'lucide-react'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: statsApi.dashboard,
    refetchInterval: 60_000,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const ventasData = stats?.ventas_mensuales?.map(v => ({
    mes: MESES[parseInt(v.mes.split('-')[1]) - 1],
    total: v.total,
    cantidad: v.cantidad,
  })) || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Resumen del negocio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Ventas del mes"
          value={formatMoney(stats?.ventas_mes || 0)}
          icon={<TrendingUp size={18} />}
          color="accent"
        />
        <KpiCard
          label="Facturas pendientes"
          value={String(stats?.facturas_pendientes || 0)}
          icon={<Receipt size={18} />}
          color="warning"
        />
        <KpiCard
          label="Clientes activos"
          value={String(stats?.total_clientes || 0)}
          icon={<Users size={18} />}
          color="success"
        />
        <KpiCard
          label="Stock bajo mínimo"
          value={String(stats?.productos_bajo_stock || 0)}
          icon={<AlertTriangle size={18} />}
          color="danger"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Ventas mensuales */}
        <div className="card p-5 col-span-2">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Ventas mensuales</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={ventasData}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#252d3d" />
              <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#161b27', border: '1px solid #252d3d', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v: number) => [formatMoney(v), 'Total']}
              />
              <Area type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top productos */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Top productos</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.top_productos?.slice(0, 5) || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#252d3d" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}`} />
              <YAxis type="category" dataKey="nombre" tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false} tickLine={false} width={80}
                tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v} />
              <Tooltip
                contentStyle={{ background: '#161b27', border: '1px solid #252d3d', borderRadius: 8 }}
                formatter={(v: number) => [v, 'Unidades']}
              />
              <Bar dataKey="cantidad_vendida" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top clientes */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Top clientes</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left text-xs text-[var(--text-muted)] pb-2 font-medium">Cliente</th>
              <th className="text-right text-xs text-[var(--text-muted)] pb-2 font-medium">Facturas</th>
              <th className="text-right text-xs text-[var(--text-muted)] pb-2 font-medium">Total compras</th>
            </tr>
          </thead>
          <tbody>
            {stats?.top_clientes?.slice(0, 5).map((c, i) => (
              <tr key={c.cliente_id} className="table-row">
                <td className="py-2.5 text-sm text-[var(--text)] flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-[var(--accent)]/10 text-[var(--accent)] text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  {c.nombre}
                </td>
                <td className="py-2.5 text-sm text-[var(--text-muted)] text-right">{c.cantidad_facturas}</td>
                <td className="py-2.5 text-sm font-medium text-[var(--text)] text-right">{formatMoney(c.total_compras)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon, color }: {
  label: string; value: string; icon: React.ReactNode
  color: 'accent' | 'warning' | 'success' | 'danger'
}) {
  const colors = {
    accent: 'text-[var(--accent)] bg-[var(--accent)]/10',
    warning: 'text-[var(--warning)] bg-[var(--warning)]/10',
    success: 'text-[var(--success)] bg-[var(--success)]/10',
    danger: 'text-[var(--danger)] bg-[var(--danger)]/10',
  }
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-[var(--text)] font-mono">{value}</p>
    </div>
  )
}
