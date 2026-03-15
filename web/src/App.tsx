import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TunnelsList from './pages/TunnelsList'
import TunnelDetail from './pages/TunnelDetail'
import CreateTunnel from './pages/CreateTunnel'
import ZonesDNS from './pages/ZonesDNS'
import PrivateRoutes from './pages/PrivateRoutes'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tunnels" element={<TunnelsList />} />
          <Route path="tunnels/new" element={<CreateTunnel />} />
          <Route path="tunnels/:id" element={<TunnelDetail />} />
          <Route path="dns" element={<ZonesDNS />} />
          <Route path="routes" element={<PrivateRoutes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
