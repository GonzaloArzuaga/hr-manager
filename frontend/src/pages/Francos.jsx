import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import EstadoBadge from '../components/EstadoBadge'

export default function Francos() {
  const { rol, empleado } = useAuth()
  const [solicitudes, setSolicitudes] = useState([])
  const [fecha, setFecha] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const cargar = async () => {
    let query = supabase
      .from('solicitudes_franco')
      .select('*, empleados(perfiles(nombre_completo))')
      .order('fecha', { ascending: false })

    if (rol === 'empleado' && empleado) {
      query = query.eq('empleado_id', empleado.id)
    }

    const { data } = await query
    setSolicitudes(data ?? [])
  }

  useEffect(() => {
    if (rol === 'empleador' || empleado) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol, empleado])

  const handleSolicitar = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)

    const { error } = await supabase.rpc('solicitar_franco', {
      p_empleado_id: empleado.id,
      p_fecha: fecha
    })

    setCargando(false)
    if (error) {
      setError(error.message.replace('%', ''))
      return
    }
    setFecha('')
    cargar()
  }

  const actualizarEstado = async (id, estado) => {
    await supabase.from('solicitudes_franco').update({ estado }).eq('id', id)
    cargar()
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">{rol === 'empleador' ? 'Solicitudes de franco' : 'Mis francos'}</h1>

      {rol === 'empleado' && (
        <form onSubmit={handleSolicitar} className="card mb-6 flex items-end gap-3">
          <div>
            <label className="label-field">Fecha solicitada</label>
            <input
              type="date"
              required
              className="input-field"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <button type="submit" disabled={cargando} className="btn-primary">
            {cargando ? 'Enviando…' : 'Solicitar franco'}
          </button>
          {error && <span className="text-sm text-danger">{error}</span>}
        </form>
      )}

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              {rol === 'empleador' && <th className="pb-2">Empleado</th>}
              <th className="pb-2">Fecha</th>
              <th className="pb-2">Estado</th>
              {rol === 'empleador' && <th className="pb-2"></th>}
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                {rol === 'empleador' && <td className="py-2">{s.empleados?.perfiles?.nombre_completo}</td>}
                <td className="py-2">{s.fecha}</td>
                <td className="py-2"><EstadoBadge estado={s.estado} /></td>
                {rol === 'empleador' && (
                  <td className="py-2 text-right space-x-3">
                    {s.estado === 'pendiente' && (
                      <>
                        <button onClick={() => actualizarEstado(s.id, 'aprobado')} className="text-accent text-xs hover:underline">
                          Aprobar
                        </button>
                        <button onClick={() => actualizarEstado(s.id, 'rechazado')} className="text-danger text-xs hover:underline">
                          Rechazar
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {solicitudes.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-gray-400">
                  No hay solicitudes de franco todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
