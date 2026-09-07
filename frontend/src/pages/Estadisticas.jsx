import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../supabaseClient'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
]

export default function Estadisticas() {
  const [porDia, setPorDia] = useState([])
  const [porHorario, setPorHorario] = useState([])
  const [porMes, setPorMes] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const [dia, horario, mes] = await Promise.all([
        supabase.from('vista_demanda_por_dia').select('*'),
        supabase.from('vista_demanda_por_horario').select('*'),
        supabase.from('vista_vacaciones_mas_solicitadas').select('*')
      ])

      const diaCompleto = DIAS.map((nombre, i) => ({
        dia: nombre,
        turnos: dia.data?.find((d) => d.dia_semana === i)?.cantidad_turnos ?? 0
      }))

      const horarioOrdenado = (horario.data ?? [])
        .map((h) => ({ hora: `${h.hora}:00`, turnos: h.cantidad_turnos }))
        .sort((a, b) => parseInt(a.hora) - parseInt(b.hora))

      const mesCompleto = MESES.map((nombre, i) => ({
        mes: nombre,
        solicitudes: mes.data?.find((m) => m.mes === i + 1)?.cantidad_solicitudes ?? 0
      }))

      setPorDia(diaCompleto)
      setPorHorario(horarioOrdenado)
      setPorMes(mesCompleto)
      setCargando(false)
    }
    cargar()
  }, [])

  if (cargando) {
    return <p className="text-sm text-gray-500">Cargando estadísticas…</p>
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Estadísticas de demanda de personal</h1>
      <p className="text-sm text-gray-500 mb-6">
        Basado en los horarios asignados y las solicitudes de vacaciones registradas.
      </p>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <p className="text-sm font-medium mb-4">Turnos asignados por día de la semana</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAECEF" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="turnos" fill="#1D3557" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <p className="text-sm font-medium mb-4">Turnos asignados por franja horaria</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porHorario}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAECEF" />
              <XAxis dataKey="hora" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="turnos" fill="#2A9D8F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card col-span-2">
          <p className="text-sm font-medium mb-4">Meses con más solicitudes de vacaciones</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAECEF" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="solicitudes" fill="#E9C46A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
