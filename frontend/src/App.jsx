import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import CambiarPassword from './pages/CambiarPassword'
import Dashboard from './pages/Dashboard'
import Horarios from './pages/Horarios'
import Francos from './pages/Francos'
import Vacaciones from './pages/Vacaciones'
import Sueldos from './pages/Sueldos'
import Estadisticas from './pages/Estadisticas'
import Configuracion from './pages/Configuracion'
import EnConstruccion from './pages/EnConstruccion'
import PublicLayout from './components/PublicLayout'
import Landing from './pages/publico/Landing'
import SobreNosotros from './pages/publico/SobreNosotros'
import Precios from './pages/publico/Precios'

export default function App() {
  const { rol } = useAuth()

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/nosotros" element={<SobreNosotros />} />
        <Route path="/precios" element={<Precios />} />
      </Route>
      <Route path="/login" element={<Login />} />

      <Route
        path="/cambiar-password"
        element={
          <ProtectedRoute esCambioPassword>
            <CambiarPassword />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="horarios" element={<Horarios />} />
        <Route path="francos" element={<Francos />} />
        <Route path="vacaciones" element={<Vacaciones />} />
        <Route path="sueldos" element={<Sueldos />} />
        {rol === 'empleador' && (
          <>
            <Route path="empleados" element={<EnConstruccion titulo="Empleados" />} />
            <Route path="estadisticas" element={<Estadisticas />} />
            <Route path="configuracion" element={<Configuracion />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
