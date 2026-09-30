import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import AuthShell from '../components/AuthShell'

const LONGITUD_MINIMA = 8

// RF-03: el empleado debe reemplazar la contraseña provisoria en su primer ingreso.
export default function CambiarPassword() {
  const { perfil, recargarPerfil, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < LONGITUD_MINIMA) {
      setError(`La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres.`)
      return
    }
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setEnviando(true)
    const { error: errorAuth } = await supabase.auth.updateUser({ password })
    if (errorAuth) {
      setEnviando(false)
      setError(
        errorAuth.message?.toLowerCase().includes('different')
          ? 'La nueva contraseña tiene que ser distinta de la provisoria.'
          : 'No se pudo actualizar la contraseña. Intentá de nuevo.'
      )
      return
    }

    const { error: errorMarca } = await supabase.rpc('marcar_password_cambiada')
    if (errorMarca) {
      setEnviando(false)
      setError('La contraseña se cambió, pero no se pudo registrar el cambio. Volvé a intentarlo.')
      return
    }

    await recargarPerfil()
    setEnviando(false)
    navigate('/app', { replace: true })
  }

  const nombre = perfil?.nombre_completo?.split(' ')[0]

  return (
    <AuthShell
      modoEncabezado="minimo"
      titulo="Creá tu contraseña"
      descripcion={`${nombre ? `${nombre}, antes` : 'Antes'} de continuar tenés que reemplazar la contraseña provisoria que te entregó tu empleador.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="nueva" className="label-field">Nueva contraseña</label>
          <input
            id="nueva"
            type="password"
            required
            autoComplete="new-password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="ayuda-password"
          />
          <p id="ayuda-password" className="text-xs text-muted mt-1.5">
            Mínimo {LONGITUD_MINIMA} caracteres.
          </p>
        </div>

        <div>
          <label htmlFor="confirmacion" className="label-field">Repetí la contraseña</label>
          <input
            id="confirmacion"
            type="password"
            required
            autoComplete="new-password"
            className="input-field"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger bg-danger-light px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="btn-primary w-full bg-sidebar hover:bg-slate-700 mt-2"
        >
          {enviando ? 'Guardando…' : 'Guardar y continuar'}
        </button>

        <button
          type="button"
          onClick={cerrarSesion}
          className="w-full text-center text-xs text-muted hover:text-ink"
        >
          Cerrar sesión
        </button>
      </form>
    </AuthShell>
  )
}
