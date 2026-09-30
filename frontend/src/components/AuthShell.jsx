import PublicHeader from './PublicHeader'

// Marco común de las pantallas de acceso: barra superior con el logo
// y una tarjeta centrada, tal como el diseño de Inicio de Sesión.
export default function AuthShell({ titulo, descripcion, children, modoEncabezado = 'login' }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#EDF1F6]">
      <PublicHeader modo={modoEncabezado} />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[360px]">
          <h1 className="text-2xl font-bold text-ink text-center tracking-tight">{titulo}</h1>
          {descripcion && <p className="text-sm text-muted text-center mt-2">{descripcion}</p>}
          <div className="bg-white rounded-xl shadow-card p-6 mt-6">{children}</div>
        </div>
      </main>
    </div>
  )
}
