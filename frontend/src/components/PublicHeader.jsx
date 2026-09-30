import { Link, NavLink } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const enlaces = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/nosotros', label: 'Sobre Nosotros' },
  { to: '/precios', label: 'Precios' }
]

// Barra superior del sitio público. En el login el botón "Ingresar"
// se reemplaza por "Volver", como en el diseño.
export default function PublicHeader({ modo = 'sitio' }) {
  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-line/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <Link to="/" className="text-xl font-extrabold text-primary tracking-tight justify-self-start">
          HRManager
        </Link>

        {modo !== 'minimo' ? (
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            {enlaces.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  isActive ? 'text-info font-medium' : 'text-ink/80 font-medium hover:text-ink'
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        ) : (
          <span />
        )}

        <div className="justify-self-end">
          {modo === 'sitio' && (
            <Link to="/login" className="btn-primary py-1.5 px-4 text-xs">Ingresar</Link>
          )}
          {modo === 'login' && (
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/80 hover:text-ink">
              <ArrowLeft size={15} aria-hidden="true" /> Volver
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
