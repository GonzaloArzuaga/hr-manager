import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import EstadoBadge from '../components/EstadoBadge'

export default function Vacaciones() {
  const { rol, empleado } = useAuth()
  const [solicitudes, setSolicitudes] = useState([])
  const [diasDisponibles, setDiasDisponibles] = useState(null)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const cargar = async () => {
    let query = supabase
      .from('solicitudes_vacaciones')
      .select('*, empleados(perfiles(nombre_completo))')
      .order('fecha_inicio', { ascending: false })

    if (rol === 'empleado' && empleado) {
      query = query.eq('empleado_id', empleado.id)
    }

    const { data } = await query
    setSolicitudes(data ?? [])

    if (empleado) {
      const { data: dias } = await supabase.rpc('calcular_dias_vacaciones', { p_empleado_id: empleado.id })
      setDiasDisponibles(dias)
    }
  }

  useEffect(() => {
    if (rol === 'empleador' || empleado) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol, empleado])

  const handleSolicitar = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)

    const { error } = await supabase.rpc('solicitar_vacaciones', {
      p_empleado_id: empleado.id,
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin
    })

    setCargando(false)
    if (error) {
      setError(error.message)
      return
    }
    setFechaInicio('')
    setFechaFin('')
    cargar()
  }

  const actualizarEstado = async (id, estado) => {
    await supabase.from('solicitudes_vacaciones').update({ estado }).eq('id', id)
    cargar()
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">
        {rol === 'empleador' ? 'Solicitudes de vacaciones' : 'Mis vacaciones'}
      </h1>
      {rol === 'empleado' && (
        <p className="text-sm text-gray-500 mb-6">
          Tenés <span className="font-semibold text-primary">{diasDisponibles ?? '—'} días</span> disponibles este año,
          según tu antigüedad.
        </p>
      )}
      {rol === 'empleador' && <div className="mb-6" />}

      {rol === 'empleado' && (
        <form onSubmit={handleSolicitar} className="card mb-6 flex items-end gap-3">
          <div>
            <label className="label-field">Desde</label>
            <input
              type="date"
              required
              className="input-field"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Hasta</label>
            <input
              type="date"
              required
              className="input-field"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
          <button type="submit" disabled={cargando} className="btn-primary">
            {cargando ? 'Enviando…' : 'Solicitar vacaciones'}
          </button>
        </form>
      )}
      {error && <p className="text-sm text-danger bg-danger-light px-3 py-2 rounded-md mb-4">{error}</p>}

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              {rol === 'empleador' && <th className="pb-2">Empleado</th>}
              <th className="pb-2">Desde</th>
              <th className="pb-2">Hasta</th>
              <th className="pb-2">Estado</th>
              {rol === 'empleador' && <th className="pb-2"></th>}
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                {rol === 'empleador' && <td className="py-2">{s.empleados?.perfiles?.nombre_completo}</td>}
                <td className="py-2">{s.fecha_inicio}</td>
                <td className="py-2">{s.fecha_fin}</td>
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
                <td colSpan={5} className="py-6 text-center text-gray-400">
                  No hay solicitudes de vacaciones todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
