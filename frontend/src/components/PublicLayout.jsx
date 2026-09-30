import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import PublicHeader from './PublicHeader'

export default function PublicLayout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-xs text-muted">
          <p>
            <span className="font-extrabold text-primary">HRManager</span>
            <span className="mx-2 text-line">|</span>
            Proyecto Final de Licenciatura en Informática, Universidad Atlántida
          </p>
          <p>© 2026 HRManager</p>
        </div>
      </footer>
    </div>
  )
}
