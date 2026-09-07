import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import EstadoBadge from '../components/EstadoBadge'

export default function Sueldos() {
  const { rol, empleado, perfil } = useAuth()
  const [pagos, setPagos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [monto, setMonto] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const cargarPagos = async () => {
    let query = supabase
      .from('pagos_sueldo')
      .select('*, empleados(perfiles(nombre_completo))')
      .order('periodo', { ascending: false })

    if (rol === 'empleado' && empleado) {
      query = query.eq('empleado_id', empleado.id)
    }

    const { data } = await query
    setPagos(data ?? [])
  }

  const cargarEmpleados = async () => {
    const { data } = await supabase.from('empleados').select('id, perfiles(nombre_completo)').eq('activo', true)
    setEmpleados(data ?? [])
  }

  useEffect(() => {
    if (rol === 'empleador') cargarEmpleados()
    if (rol === 'empleador' || empleado) cargarPagos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol, empleado])

  const handleRegistrarPago = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)

    const { data: pago, error: errorInsert } = await supabase
      .from('pagos_sueldo')
      .upsert(
        { empleado_id: empleadoSeleccionado, periodo, monto: Number(monto) },
        { onConflict: 'empleado_id,periodo' }
      )
      .select()
      .single()

    if (errorInsert) {
      setError(errorInsert.message)
      setCargando(false)
      return
    }

    if (archivo) {
      const extension = archivo.name.split('.').pop()
      const ruta = `${perfil.organizacion_id}/${empleadoSeleccionado}/${periodo}.${extension}`

      const { error: errorUpload } = await supabase.storage
        .from('recibos-sueldo')
        .upload(ruta, archivo, { upsert: true })

      if (errorUpload) {
        setError(`Pago guardado, pero falló la subida del recibo: ${errorUpload.message}`)
      } else {
        await supabase.from('pagos_sueldo').update({ recibo_path: ruta }).eq('id', pago.id)
      }
    }

    setCargando(false)
    setPeriodo('')
    setMonto('')
    setArchivo(null)
    cargarPagos()
  }

  const marcarAcreditado = async (id) => {
    await supabase.from('pagos_sueldo').update({ estado: 'acreditado', fecha_pago: new Date().toISOString().slice(0, 10) }).eq('id', id)
    cargarPagos()
  }

  const verRecibo = async (path) => {
    const { data, error } = await supabase.storage.from('recibos-sueldo').createSignedUrl(path, 60)
    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">{rol === 'empleador' ? 'Sueldos y recibos' : 'Mi sueldo'}</h1>

      {rol === 'empleador' && (
        <form onSubmit={handleRegistrarPago} className="card mb-6 grid grid-cols-4 gap-3 items-end">
          <div>
            <label className="label-field">Empleado</label>
            <select
              required
              className="input-field"
              value={empleadoSeleccionado}
              onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.perfiles?.nombre_completo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Período</label>
            <input
              type="month"
              required
              className="input-field"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Monto</label>
            <input
              type="number"
              step="0.01"
              required
              className="input-field"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Recibo (PDF/imagen)</label>
            <input
              type="file"
              accept=".pdf,image/*"
              className="text-xs"
              onChange={(e) => setArchivo(e.target.files[0])}
            />
          </div>
          <div className="col-span-4">
            <button type="submit" disabled={cargando} className="btn-primary">
              {cargando ? 'Guardando…' : 'Registrar pago'}
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
              <th className="pb-2">Período</th>
              <th className="pb-2">Monto</th>
              <th className="pb-2">Estado</th>
              <th className="pb-2">Recibo</th>
              {rol === 'empleador' && <th className="pb-2"></th>}
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                {rol === 'empleador' && <td className="py-2">{p.empleados?.perfiles?.nombre_completo}</td>}
                <td className="py-2">{p.periodo}</td>
                <td className="py-2">${Number(p.monto).toLocaleString('es-AR')}</td>
                <td className="py-2"><EstadoBadge estado={p.estado} /></td>
                <td className="py-2">
                  {p.recibo_path ? (
                    <button onClick={() => verRecibo(p.recibo_path)} className="text-primary text-xs hover:underline">
                      Ver recibo
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Sin cargar</span>
                  )}
                </td>
                {rol === 'empleador' && (
                  <td className="py-2 text-right">
                    {p.estado === 'pendiente' && (
                      <button onClick={() => marcarAcreditado(p.id)} className="text-accent text-xs hover:underline">
                        Marcar acreditado
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {pagos.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-400">
                  No hay pagos registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
