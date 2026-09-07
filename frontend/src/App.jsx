import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Horarios from './pages/Horarios'
import Francos from './pages/Francos'
import Vacaciones from './pages/Vacaciones'
import Sueldos from './pages/Sueldos'
import Estadisticas from './pages/Estadisticas'
import Configuracion from './pages/Configuracion'

export default function App() {
  const { rol } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Signup />} />

      <Route
        path="/"
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
        {rol === 'empleador' && <Route path="estadisticas" element={<Estadisticas />} />}
        {rol === 'empleador' && <Route path="configuracion" element={<Configuracion />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
