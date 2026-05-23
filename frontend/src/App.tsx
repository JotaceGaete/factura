import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Clientes from '@/pages/Clientes'
import Productos from '@/pages/Productos'
import Presupuestos from '@/pages/Presupuestos'
import Facturas from '@/pages/Facturas'
import Reportes from '@/pages/Reportes'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
})

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/presupuestos" element={<Presupuestos />} />
            <Route path="/facturas" element={<Facturas />} />
            <Route path="/reportes" element={<Reportes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
