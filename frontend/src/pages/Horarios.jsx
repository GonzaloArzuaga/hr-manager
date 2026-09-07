import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function Horarios() {
  const { rol, empleado } = useAuth()
  const [empleados, setEmpleados] = useState([])
  const [horarios, setHorarios] = useState([])
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('')
  const [diaSemana, setDiaSemana] = useState('1')
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFin, setHoraFin] = useState('17:00')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const cargarHorarios = async () => {
    let query = supabase
      .from('horarios')
      .select('*, empleados(perfil_id, perfiles(nombre_completo))')
      .order('dia_semana')

    if (rol === 'empleado' && empleado) {
      query = query.eq('empleado_id', empleado.id)
    }

    const { data } = await query
    setHorarios(data ?? [])
  }

  const cargarEmpleados = async () => {
    const { data } = await supabase
      .from('empleados')
      .select('id, perfiles(nombre_completo)')
      .eq('activo', true)
    setEmpleados(data ?? [])
  }

  useEffect(() => {
    if (rol === 'empleador') cargarEmpleados()
    if (rol === 'empleador' || empleado) cargarHorarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol, empleado])

  const handleAsignar = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)

    const { error } = await supabase.from('horarios').insert({
      empleado_id: empleadoSeleccionado,
      dia_semana: Number(diaSemana),
      hora_inicio: horaInicio,
      hora_fin: horaFin
    })

    setCargando(false)
    if (error) {
      setError(error.message)
      return
    }
    cargarHorarios()
  }

  const eliminarHorario = async (id) => {
    await supabase.from('horarios').delete().eq('id', id)
    cargarHorarios()
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">{rol === 'empleador' ? 'Horarios del equipo' : 'Mi horario'}</h1>

      {rol === 'empleador' && (
        <form onSubmit={handleAsignar} className="card mb-6 grid grid-cols-5 gap-3 items-end">
          <div className="col-span-2">
            <label className="label-field">Empleado</label>
            <select
              required
              className="input-field"
              value={empleadoSeleccionado}
              onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.perfiles?.nombre_completo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Día</label>
            <select className="input-field" value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)}>
              {DIAS.map((dia, i) => (
                <option key={i} value={i}>{dia}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Desde</label>
            <input type="time" className="input-field" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Hasta</label>
            <input type="time" className="input-field" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
          </div>
          <div className="col-span-5">
            <button type="submit" disabled={cargando} className="btn-primary">
              {cargando ? 'Asignando…' : 'Asignar horario'}
            </button>
            {error && <span className="text-sm text-danger ml-3">{error}</span>}
          </div>
        </form>
      )}

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              {rol === 'empleador' && <th className="pb-2">Empleado</th>}
              <th className="pb-2">Día</th>
              <th className="pb-2">Desde</th>
              <th className="pb-2">Hasta</th>
              {rol === 'empleador' && <th className="pb-2"></th>}
            </tr>
          </thead>
          <tbody>
            {horarios.map((h) => (
              <tr key={h.id} className="border-b last:border-0">
                {rol === 'empleador' && <td className="py-2">{h.empleados?.perfiles?.nombre_completo}</td>}
                <td className="py-2">{DIAS[h.dia_semana]}</td>
                <td className="py-2">{h.hora_inicio}</td>
                <td className="py-2">{h.hora_fin}</td>
                {rol === 'empleador' && (
                  <td className="py-2 text-right">
                    <button onClick={() => eliminarHorario(h.id)} className="text-danger text-xs hover:underline">
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {horarios.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">
                  Todavía no hay horarios cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
