import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, FileText,
  Receipt, BarChart3, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/presupuestos', label: 'Presupuestos', icon: FileText },
  { to: '/facturas', label: 'Facturas', icon: Receipt },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
]

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg-card)]">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <Receipt size={14} className="text-white" />
            </div>
            <span className="font-bold text-[var(--text)] tracking-tight">FacturaApp</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group',
                isActive
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-[var(--accent)]' : ''} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={12} className="text-[var(--accent)]" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)]">v1.0.0</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-[var(--bg)]">
        <Outlet />
      </main>
    </div>
  )
}
