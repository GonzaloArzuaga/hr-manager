import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Signup() {
  const [tipoCuenta, setTipoCuenta] = useState('empleador') // 'empleador' | 'empleado'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [nombreOrganizacion, setNombreOrganizacion] = useState('')
  const [codigoInvitacion, setCodigoInvitacion] = useState('')
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [tipoTurno, setTipoTurno] = useState('fijo')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)

    // 1. Crear el usuario en Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    })

    if (signUpError) {
      setError(signUpError.message)
      setCargando(false)
      return
    }

    // Si el proyecto de Supabase tiene confirmación de email activada, todavía
    // no hay sesión activa acá. Para simplificar la demo de tesis, se recomienda
    // desactivar "Confirm email" en Authentication -> Providers -> Email.
    if (!signUpData.session) {
      setError(
        'Cuenta creada. Si tu proyecto de Supabase pide confirmar el email, revisá tu casilla ' +
        'y después iniciá sesión normalmente.'
      )
      setCargando(false)
      return
    }

    // 2. Completar el alta según el tipo de cuenta, usando las funciones del motor de reglas
    let rpcError = null
    if (tipoCuenta === 'empleador') {
      const { error } = await supabase.rpc('registrar_empleador', {
        p_nombre_organizacion: nombreOrganizacion,
        p_nombre_completo: nombreCompleto
      })
      rpcError = error
    } else {
      const { error } = await supabase.rpc('registrar_empleado', {
        p_codigo_invitacion: codigoInvitacion,
        p_nombre_completo: nombreCompleto,
        p_fecha_ingreso: fechaIngreso,
        p_tipo_turno: tipoTurno
      })
      rpcError = error
    }

    setCargando(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-primary">Crear cuenta</h1>
        </div>

        <div className="flex rounded-md border border-gray-300 overflow-hidden mb-6">
          <button
            type="button"
            onClick={() => setTipoCuenta('empleador')}
            className={`flex-1 py-2 text-sm font-medium ${
              tipoCuenta === 'empleador' ? 'bg-primary text-white' : 'bg-white text-gray-600'
            }`}
          >
            Soy empleador
          </button>
          <button
            type="button"
            onClick={() => setTipoCuenta('empleado')}
            className={`flex-1 py-2 text-sm font-medium ${
              tipoCuenta === 'empleado' ? 'bg-primary text-white' : 'bg-white text-gray-600'
            }`}
          >
            Soy empleado
          </button>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label-field">Nombre completo</label>
            <input
              required
              className="input-field"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
            />
          </div>

          <div>
            <label className="label-field">Email</label>
            <input
              type="email"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="label-field">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {tipoCuenta === 'empleador' ? (
            <div>
              <label className="label-field">Nombre de tu organización</label>
              <input
                required
                className="input-field"
                value={nombreOrganizacion}
                onChange={(e) => setNombreOrganizacion(e.target.value)}
                placeholder="Ej: Panadería San Martín"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se va a generar un código de invitación para que tus empleados se registren.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="label-field">Código de organización</label>
                <input
                  required
                  className="input-field uppercase"
                  value={codigoInvitacion}
                  onChange={(e) => setCodigoInvitacion(e.target.value)}
                  placeholder="Te lo pasa tu empleador"
                />
              </div>
              <div>
                <label className="label-field">Fecha de ingreso</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                />
              </div>
              <div>
                <label className="label-field">Tipo de turno</label>
                <select
                  className="input-field"
                  value={tipoTurno}
                  onChange={(e) => setTipoTurno(e.target.value)}
                >
                  <option value="fijo">Fijo</option>
                  <option value="rotativo">Rotativo</option>
                </select>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-danger bg-danger-light px-3 py-2 rounded-md">{error}</p>
          )}

          <button type="submit" disabled={cargando} className="btn-primary w-full">
            {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Ingresá
          </Link>
        </p>
      </div>
    </div>
  )
}
