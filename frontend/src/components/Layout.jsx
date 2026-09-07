import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const enlacesEmpleador = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/horarios', label: 'Horarios' },
  { to: '/francos', label: 'Francos' },
  { to: '/vacaciones', label: 'Vacaciones' },
  { to: '/sueldos', label: 'Sueldos' },
  { to: '/estadisticas', label: 'Estadísticas' },
  { to: '/configuracion', label: 'Configuración' }
]

const enlacesEmpleado = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/horarios', label: 'Mi horario' },
  { to: '/francos', label: 'Mis francos' },
  { to: '/vacaciones', label: 'Mis vacaciones' },
  { to: '/sueldos', label: 'Mi sueldo' }
]

export default function Layout() {
  const { perfil, rol, cerrarSesion } = useAuth()
  const enlaces = rol === 'empleador' ? enlacesEmpleador : enlacesEmpleado

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-primary text-white flex flex-col">
        <div className="px-5 py-6 border-b border-white/10">
          <p className="text-lg font-semibold">HR Manager</p>
          <p className="text-xs text-white/60 mt-1 truncate">
            {perfil?.organizaciones?.nombre ?? '...'}
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {enlaces.map((enlace) => (
            <NavLink
              key={enlace.to}
              to={enlace.to}
              end={enlace.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {enlace.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-sm font-medium truncate">{perfil?.nombre_completo}</p>
          <p className="text-xs text-white/60 capitalize">{rol}</p>
          <button
            onClick={cerrarSesion}
            className="mt-3 text-xs text-white/70 hover:text-white underline"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
