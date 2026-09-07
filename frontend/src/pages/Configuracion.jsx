import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'

export default function Configuracion() {
  const { perfil } = useAuth()
  const [reglas, setReglas] = useState(null)
  const [regimen, setRegimen] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const cargar = async () => {
    const [{ data: reglasData }, { data: regimenData }] = await Promise.all([
      supabase.from('reglas_organizacion').select('*').single(),
      supabase.from('regimen_vacaciones').select('*').order('antiguedad_minima_anios')
    ])
    setReglas(reglasData)
    setRegimen(regimenData ?? [])
  }

  useEffect(() => {
    cargar()
  }, [])

  const guardarReglas = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)

    const { error } = await supabase
      .from('reglas_organizacion')
      .update({
        francos_por_semana: reglas.francos_por_semana,
        requiere_aprobacion_franco: reglas.requiere_aprobacion_franco,
        requiere_aprobacion_vacaciones: reglas.requiere_aprobacion_vacaciones,
        dias_aviso_previo_franco: reglas.dias_aviso_previo_franco,
        dias_aviso_previo_vacaciones: reglas.dias_aviso_previo_vacaciones
      })
      .eq('organizacion_id', perfil.organizacion_id)

    setGuardando(false)
    setMensaje(error ? error.message : 'Reglas actualizadas correctamente.')
  }

  const actualizarTramo = (id, campo, valor) => {
    setRegimen((prev) => prev.map((t) => (t.id === id ? { ...t, [campo]: valor } : t)))
  }

  const guardarTramo = async (tramo) => {
    await supabase
      .from('regimen_vacaciones')
      .update({
        antiguedad_minima_anios: tramo.antiguedad_minima_anios,
        antiguedad_maxima_anios: tramo.antiguedad_maxima_anios || null,
        dias_vacaciones: tramo.dias_vacaciones
      })
      .eq('id', tramo.id)
  }

  const agregarTramo = async () => {
    const { data } = await supabase
      .from('regimen_vacaciones')
      .insert({
        organizacion_id: perfil.organizacion_id,
        antiguedad_minima_anios: 0,
        antiguedad_maxima_anios: null,
        dias_vacaciones: 14
      })
      .select()
      .single()
    setRegimen((prev) => [...prev, data])
  }

  const eliminarTramo = async (id) => {
    await supabase.from('regimen_vacaciones').delete().eq('id', id)
    setRegimen((prev) => prev.filter((t) => t.id !== id))
  }

  if (!reglas) return <p className="text-sm text-gray-500">Cargando configuración…</p>

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-1">Configuración de reglas de negocio</h1>
      <p className="text-sm text-gray-500 mb-6">
        Esto es el motor de reglas configurable: cada organización define sus propias políticas
        sin que haga falta tocar código.
      </p>

      <form onSubmit={guardarReglas} className="card space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Francos por semana</label>
            <input
              type="number"
              min="0"
              className="input-field"
              value={reglas.francos_por_semana}
              onChange={(e) => setReglas({ ...reglas, francos_por_semana: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label-field">Días de aviso previo para franco</label>
            <input
              type="number"
              min="0"
              className="input-field"
              value={reglas.dias_aviso_previo_franco}
              onChange={(e) => setReglas({ ...reglas, dias_aviso_previo_franco: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label-field">Días de aviso previo para vacaciones</label>
            <input
              type="number"
              min="0"
              className="input-field"
              value={reglas.dias_aviso_previo_vacaciones}
              onChange={(e) => setReglas({ ...reglas, dias_aviso_previo_vacaciones: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reglas.requiere_aprobacion_franco}
              onChange={(e) => setReglas({ ...reglas, requiere_aprobacion_franco: e.target.checked })}
            />
            Los francos requieren aprobación
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reglas.requiere_aprobacion_vacaciones}
              onChange={(e) => setReglas({ ...reglas, requiere_aprobacion_vacaciones: e.target.checked })}
            />
            Las vacaciones requieren aprobación
          </label>
        </div>

        <button type="submit" disabled={guardando} className="btn-primary">
          {guardando ? 'Guardando…' : 'Guardar reglas'}
        </button>
        {mensaje && <p className="text-sm text-accent">{mensaje}</p>}
      </form>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium">Régimen de vacaciones por antigüedad</p>
          <button onClick={agregarTramo} className="btn-secondary text-xs py-1">+ Agregar tramo</button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Desde (años)</th>
              <th className="pb-2">Hasta (años)</th>
              <th className="pb-2">Días de vacaciones</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {regimen.map((t) => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="py-2">
                  <input
                    type="number"
                    className="input-field w-20"
                    value={t.antiguedad_minima_anios}
                    onChange={(e) => actualizarTramo(t.id, 'antiguedad_minima_anios', Number(e.target.value))}
                    onBlur={() => guardarTramo(t)}
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    placeholder="Sin tope"
                    className="input-field w-24"
                    value={t.antiguedad_maxima_anios ?? ''}
                    onChange={(e) => actualizarTramo(t.id, 'antiguedad_maxima_anios', e.target.value ? Number(e.target.value) : null)}
                    onBlur={() => guardarTramo(t)}
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    className="input-field w-20"
                    value={t.dias_vacaciones}
                    onChange={(e) => actualizarTramo(t.id, 'dias_vacaciones', Number(e.target.value))}
                    onBlur={() => guardarTramo(t)}
                  />
                </td>
                <td className="py-2 text-right">
                  <button onClick={() => eliminarTramo(t.id)} className="text-danger text-xs hover:underline">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
