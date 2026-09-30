import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Protege las rutas privadas. Si el usuario todavía tiene la contraseña
// provisoria, solo puede acceder a la pantalla de cambio de contraseña (RF-03).
export default function ProtectedRoute({ children, esCambioPassword = false }) {
  const { session, perfil, cargando, debeCambiarPassword } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm">
        Cargando…
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (!perfil) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center text-sm text-muted">
        Tu cuenta no tiene un perfil asociado. Contactá al administrador del sistema.
      </div>
    )
  }

  if (debeCambiarPassword && !esCambioPassword) {
    return <Navigate to="/cambiar-password" replace />
  }

  if (!debeCambiarPassword && esCambioPassword) {
    return <Navigate to="/app" replace />
  }

  return children
}
