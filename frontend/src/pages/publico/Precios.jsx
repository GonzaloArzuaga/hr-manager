import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, Building, Building2, Landmark } from 'lucide-react'
import { Etiqueta, BandaAzul, Encabezado } from '../../components/Seccion'

// Precios de referencia en USD por mes, definidos en el diseño.
const DESCUENTO_ANUAL = 0.2

const planes = [
  {
    nombre: 'Pyme',
    icono: Building,
    descripcion: 'Para equipos chicos que dejan atrás las planillas.',
    precio: 39,
    limite: 'Hasta 50 empleados',
    extras: ['Soporte por email'],
    accion: 'Consultar'
  },
  {
    nombre: 'Profesional',
    icono: Building2,
    descripcion: 'Para organizaciones con varios turnos y más personal.',
    precio: 103,
    limite: 'Hasta 250 empleados',
    extras: ['Soporte prioritario', 'Ayuda para configurar las reglas iniciales'],
    accion: 'Consultar',
    destacado: true
  },
  {
    nombre: 'A medida',
    icono: Landmark,
    descripcion: 'Para organizaciones con más de 250 empleados.',
    precio: null,
    limite: 'Más de 250 empleados',
    extras: ['Acompañamiento en la puesta en marcha', 'Carga inicial de empleados'],
    accion: 'Hablar con nosotros'
  }
]

const incluidoEnTodos = [
  'Horarios, francos y vacaciones',
  'Motor de reglas configurable',
  'Sueldos y recibos',
  'Estadísticas de demanda de personal'
]

const matriz = [
  { grupo: 'Capacidad', filas: [['Cantidad de empleados', 'Hasta 50', 'Hasta 250', 'Más de 250']] },
  {
    grupo: 'Módulos',
    filas: [
      ['Asignación y consulta de horarios', true, true, true],
      ['Solicitud y aprobación de francos', true, true, true],
      ['Vacaciones calculadas por antigüedad', true, true, true],
      ['Registro de pagos y carga de recibos', true, true, true],
      ['Estadísticas por día, franja horaria y mes', true, true, true],
      ['Reglas de negocio configurables', true, true, true]
    ]
  },
  {
    grupo: 'Acompañamiento',
    filas: [
      ['Soporte', 'Email', 'Prioritario', 'Dedicado'],
      ['Ayuda con la configuración inicial', false, true, true],
      ['Carga inicial de empleados', false, false, true]
    ]
  }
]

const preguntas = [
  {
    p: '¿Cómo se configuran las reglas de mi organización?',
    r: 'Desde la pantalla de Configuración el empleador define cuántos francos por semana corresponden, con cuántos días de aviso se piden francos y vacaciones, si necesitan aprobación y los tramos de antigüedad para las vacaciones. Los cambios se aplican a las solicitudes nuevas.'
  },
  {
    p: '¿Quién crea las cuentas de los empleados?',
    r: 'El empleador. Carga los datos de cada empleado y le entrega una contraseña provisoria, que el empleado tiene que cambiar la primera vez que ingresa. No existe el registro abierto.'
  },
  {
    p: '¿El sistema liquida los sueldos?',
    r: 'No. HRManager registra cada pago, guarda el recibo y muestra si el pago ya fue acreditado. El cálculo de la liquidación, con impuestos y aportes, se sigue haciendo por fuera.'
  },
  {
    p: '¿Puedo usar reglas distintas de las de la Ley de Contrato de Trabajo?',
    r: 'Sí. Los valores iniciales siguen la ley, pero cada organización puede ajustarlos a su convenio o a su política interna.'
  }
]

function Celda({ valor, destacado }) {
  const base = `px-4 py-3 text-center text-sm ${destacado ? 'bg-info-light/30 font-semibold text-primary' : 'text-ink/80'}`
  if (valor === true) return <td className={base}><Check size={16} className="inline text-info" aria-label="Incluido" /></td>
  if (valor === false) return <td className={base}><span className="text-slate-300" aria-label="No incluido">—</span></td>
  return <td className={base}>{valor}</td>
}

export default function Precios() {
  const [anual, setAnual] = useState(false)
  const precioMostrado = (p) => (anual ? Math.round(p * (1 - DESCUENTO_ANUAL)) : p)

  return (
    <>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-12 text-center">
        <Etiqueta>Planes</Etiqueta>
        <h1 className="mt-5 text-3xl font-bold text-ink tracking-tight">Un plan según el tamaño de tu equipo</h1>
        <p className="mt-3 text-base text-muted max-w-xl mx-auto leading-relaxed">
          Todos los planes incluyen todos los módulos. Cambian la cantidad de empleados y el acompañamiento.
        </p>

        <div role="group" aria-label="Tipo de facturación" className="mt-7 inline-flex rounded-lg bg-soft p-1 text-xs font-semibold">
          <button
            onClick={() => setAnual(false)}
            aria-pressed={!anual}
            className={`px-4 py-2 rounded-md ${!anual ? 'bg-white text-ink shadow-card' : 'text-muted'}`}
          >
            Mensual
          </button>
          <button
            onClick={() => setAnual(true)}
            aria-pressed={anual}
            className={`px-4 py-2 rounded-md inline-flex items-center gap-2 ${anual ? 'bg-white text-ink shadow-card' : 'text-muted'}`}
          >
            Anual <span className="rounded-full bg-info-light px-2 py-0.5 text-[10px] text-primary">20 % menos</span>
          </button>
        </div>

        <div className="mt-10 grid md:grid-cols-3 gap-5 text-left items-start">
          {planes.map(({ nombre, icono: Icono, descripcion, precio, limite, extras, accion, destacado }) => (
            <article
              key={nombre}
              className={`relative bg-white rounded-xl p-6 ${destacado ? 'border-2 border-primary shadow-lg md:-mt-3' : 'border border-line/70 shadow-card'}`}
            >
              {destacado && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-white">
                  El más elegido
                </span>
              )}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-ink">{nombre}</h2>
                <Icono size={18} className="text-info" aria-hidden="true" />
              </div>
              <p className="text-xs text-muted mt-1">{descripcion}</p>

              <p className="mt-5 flex items-baseline gap-1">
                {precio ? (
                  <>
                    <span className="text-3xl font-bold text-ink">USD {precioMostrado(precio)}</span>
                    <span className="text-xs text-muted">/ mes</span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-ink">A medida</span>
                )}
              </p>
              <p className="text-[11px] text-muted mt-1">
                {precio ? (anual ? 'Facturado una vez por año' : 'Facturado mes a mes') : 'Cotización según la organización'}
              </p>

              <ul className="mt-5 space-y-2 text-sm text-ink/85">
                {[limite, ...incluidoEnTodos, ...extras].map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check size={16} className="text-info shrink-0 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <Link to="/nosotros" className={`mt-6 w-full ${destacado ? 'btn-primary' : 'btn-secondary'}`}>{accion}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <Encabezado titulo="Comparación de planes" descripcion="Qué incluye cada uno, en detalle." />
        <div className="mt-5 overflow-x-auto rounded-xl border border-line/70 bg-white shadow-card">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="bg-soft text-xs font-semibold text-muted">
                <th className="px-4 py-3">Funcionalidad</th>
                <th className="px-4 py-3 text-center">Pyme</th>
                <th className="px-4 py-3 text-center bg-info-light/50 text-primary">Profesional</th>
                <th className="px-4 py-3 text-center">A medida</th>
              </tr>
            </thead>
            {matriz.map(({ grupo, filas }) => (
              <tbody key={grupo}>
                <tr>
                  <th colSpan={4} className="px-4 pt-5 pb-2 text-[11px] font-bold text-primary">{grupo}</th>
                </tr>
                {filas.map(([nombre, ...valores]) => (
                  <tr key={nombre} className="border-t border-line/60">
                    <td className="px-4 py-3 text-sm text-ink">{nombre}</td>
                    {valores.map((v, i) => <Celda key={i} valor={v} destacado={i === 1} />)}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <Encabezado centrado titulo="Preguntas frecuentes" />
        <div className="mt-6 space-y-3">
          {preguntas.map(({ p, r }) => (
            <details key={p} className="group bg-white rounded-xl border border-line/70 shadow-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-ink">
                {p}
                <ChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="px-5 pb-4 text-sm text-muted leading-relaxed">{r}</p>
            </details>
          ))}
        </div>
      </section>

      <BandaAzul
        antetitulo="¿Ya tenés cuenta?"
        titulo="Ingresá con los datos que te entregaron"
        descripcion="Las cuentas de empleador las crea el administrador del sistema, y las de los empleados, su empleador."
      >
        <Link to="/login" className="btn-primary bg-white text-primary hover:bg-primary-50">Ingresar</Link>
      </BandaAzul>
    </>
  )
}
