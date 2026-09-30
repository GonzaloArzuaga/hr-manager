import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutGrid, CalendarDays, CalendarCheck, Plane, Banknote,
  Users, BarChart3, SlidersHorizontal, LogOut, Menu, X
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const enlacesEmpleador = [
  { to: '/app', label: 'Inicio', icono: LayoutGrid, end: true },
  { to: '/app/horarios', label: 'Horarios', icono: CalendarDays },
  { to: '/app/francos', label: 'Francos', icono: CalendarCheck },
  { to: '/app/vacaciones', label: 'Vacaciones', icono: Plane },
  { to: '/app/sueldos', label: 'Sueldos', icono: Banknote },
  { to: '/app/empleados', label: 'Empleados', icono: Users },
  { to: '/app/estadisticas', label: 'Estadísticas', icono: BarChart3 },
  { to: '/app/configuracion', label: 'Configuración', icono: SlidersHorizontal }
]

const enlacesEmpleado = [
  { to: '/app', label: 'Inicio', icono: LayoutGrid, end: true },
  { to: '/app/horarios', label: 'Horarios', icono: CalendarDays },
  { to: '/app/francos', label: 'Francos', icono: CalendarCheck },
  { to: '/app/vacaciones', label: 'Vacaciones', icono: Plane },
  { to: '/app/sueldos', label: 'Sueldos', icono: Banknote }
]

function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

function ContenidoMenu({ perfil, rol, enlaces, cerrarSesion, alNavegar }) {
  return (
    <>
      <div className="px-5 pt-6 pb-5 flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-primary-light text-white grid place-items-center text-sm font-semibold ring-2 ring-white/20">
          {iniciales(perfil?.nombre_completo)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{perfil?.nombre_completo}</p>
          <p className="text-xs text-white/60 truncate">
            {rol === 'empleador' ? 'Empleador' : 'Empleado'} · {perfil?.organizaciones?.nombre}
          </p>
        </div>
      </div>

      <p className="px-5 mt-2 mb-2 text-[11px] font-semibold text-white/50">Módulos</p>

      <nav className="flex-1 px-3 space-y-1">
        {enlaces.map(({ to, label, icono: Icono, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={alNavegar}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icono size={17} strokeWidth={1.9} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={cerrarSesion}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/10"
        >
          <LogOut size={14} aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </>
  )
}

export default function Layout() {
  const { perfil, rol, cerrarSesion } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const location = useLocation()
  const enlaces = rol === 'empleador' ? enlacesEmpleador : enlacesEmpleado
  const props = { perfil, rol, enlaces, cerrarSesion, alNavegar: () => setMenuAbierto(false) }

  return (
    <div className="min-h-screen lg:flex">
      {/* Menú lateral fijo en escritorio */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-sidebar flex-col sticky top-0 h-screen">
        <ContenidoMenu {...props} />
      </aside>

      {/* Barra superior y menú desplegable en pantallas chicas */}
      <header className="lg:hidden sticky top-0 z-30 bg-sidebar text-white h-14 px-4 flex items-center justify-between">
        <span className="font-extrabold tracking-tight">HRManager</span>
        <button
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          className="p-2 rounded-lg hover:bg-white/10"
        >
          <Menu size={20} />
        </button>
      </header>

      {menuAbierto && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setMenuAbierto(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar flex flex-col">
            <button
              onClick={() => setMenuAbierto(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-3 p-2 rounded-lg text-white/70 hover:bg-white/10"
            >
              <X size={18} />
            </button>
            <ContenidoMenu {...props} />
          </aside>
        </div>
      )}

      <main key={location.pathname} className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
