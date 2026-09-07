import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'

export default function Dashboard() {
  const { rol, perfil, empleado } = useAuth()
  const [resumen, setResumen] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      if (rol === 'empleador') {
        const [{ count: totalEmpleados }, { count: francosPendientes }, { count: vacacionesPendientes }] =
          await Promise.all([
            supabase.from('empleados').select('*', { count: 'exact', head: true }),
            supabase.from('solicitudes_franco').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
            supabase.from('solicitudes_vacaciones').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente')
          ])
        setResumen({ totalEmpleados, francosPendientes, vacacionesPendientes })
      } else if (empleado) {
        const { data } = await supabase.rpc('calcular_dias_vacaciones', { p_empleado_id: empleado.id })
        setResumen({ diasVacaciones: data })
      }
    }
    cargar()
  }, [rol, empleado])

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Hola, {perfil?.nombre_completo?.split(' ')[0]}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {rol === 'empleador'
          ? `Panel de ${perfil?.organizaciones?.nombre}`
          : 'Este es tu resumen personal'}
      </p>

      {rol === 'empleador' && resumen && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card">
            <p className="text-sm text-gray-500">Empleados activos</p>
            <p className="text-3xl font-semibold mt-1">{resumen.totalEmpleados ?? 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Francos pendientes de aprobar</p>
            <p className="text-3xl font-semibold mt-1">{resumen.francosPendientes ?? 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Vacaciones pendientes de aprobar</p>
            <p className="text-3xl font-semibold mt-1">{resumen.vacacionesPendientes ?? 0}</p>
          </div>
        </div>
      )}

      {rol === 'empleado' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card">
            <p className="text-sm text-gray-500">Días de vacaciones disponibles este año</p>
            <p className="text-3xl font-semibold mt-1">{resumen?.diasVacaciones ?? '—'}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Tipo de turno</p>
            <p className="text-3xl font-semibold mt-1 capitalize">{empleado?.tipo_turno ?? '—'}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Código de tu organización</p>
            <p className="text-3xl font-semibold mt-1">{perfil?.organizaciones?.codigo_invitacion ?? '—'}</p>
          </div>
        </div>
      )}

      {rol === 'empleador' && (
        <div className="card mt-6">
          <p className="text-sm font-medium mb-1">Código de invitación para tus empleados</p>
          <p className="text-2xl font-mono tracking-wider text-primary">
            {perfil?.organizaciones?.codigo_invitacion}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Compartí este código con tu equipo — lo van a necesitar para registrarse como empleados.
          </p>
        </div>
      )}
    </div>
  )
}
