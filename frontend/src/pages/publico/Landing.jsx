import { Link } from 'react-router-dom'
import { SlidersHorizontal, CalendarDays, Plane, Banknote, BarChart3, ShieldCheck } from 'lucide-react'
import { Etiqueta, Encabezado, Tarjeta, BandaAzul } from '../../components/Seccion'

const modulos = [
  {
    icono: SlidersHorizontal,
    titulo: 'Reglas de negocio configurables',
    texto: 'Cada organización define sus francos por semana, los días de aviso previo y si las solicitudes necesitan aprobación, sin tocar el código.',
    pie: 'Motor de reglas'
  },
  {
    icono: CalendarDays,
    titulo: 'Horarios y francos',
    texto: 'El empleador asigna horarios por día de la semana y el empleado solicita francos que el sistema valida contra las reglas vigentes.',
    pie: 'Validación automática'
  },
  {
    icono: Plane,
    titulo: 'Vacaciones según antigüedad',
    texto: 'Los días disponibles se calculan solos a partir de la fecha de ingreso y de los tramos de antigüedad que configura cada organización.',
    pie: 'Cálculo automático'
  },
  {
    icono: Banknote,
    titulo: 'Sueldos y recibos',
    texto: 'El empleador registra cada pago y adjunta el recibo. El empleado consulta sus pagos y ve si ya fueron acreditados.',
    pie: 'Registro de pagos'
  }
]

const pasos = [
  { titulo: 'Se da de alta la organización', texto: 'El administrador del sistema crea la organización y la cuenta de su empleador, con reglas iniciales basadas en la Ley de Contrato de Trabajo.' },
  { titulo: 'El empleador carga a su equipo', texto: 'Crea la cuenta de cada empleado, le asigna horarios y ajusta las reglas a la política de su organización.' },
  { titulo: 'Cada empleado gestiona lo suyo', texto: 'Ingresa, cambia su contraseña provisoria y desde ahí consulta horarios, solicita francos y vacaciones y ve sus recibos.' }
]

export default function Landing() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute -top-24 right-[-10%] h-80 w-80 rounded-full bg-info-light/60 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-16">
          <Etiqueta>Gestión de personal para organizaciones medianas y pequeñas</Etiqueta>
          <h1 className="mt-5 text-3xl sm:text-4xl font-bold text-ink tracking-tight max-w-3xl leading-tight">
            Horarios, francos, vacaciones y sueldos de tu equipo en un solo lugar
          </h1>
          <p className="mt-4 text-base text-muted max-w-2xl leading-relaxed">
            Dejá las planillas y los mensajes sueltos. HRManager centraliza las solicitudes del personal,
            las valida según las reglas de tu organización y deja registro de cada decisión.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/login" className="btn-primary">Ingresar al sistema</Link>
            <Link to="/precios" className="btn-secondary bg-white">Ver planes</Link>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-muted">
            <ShieldCheck size={15} className="text-info" aria-hidden="true" />
            Los datos de cada organización quedan separados y solo los ven sus propios usuarios.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-2xl bg-soft/70 p-5 sm:p-8">
          <Encabezado
            antetitulo="Qué resuelve"
            titulo="Pensado para las reglas de cada organización"
            descripcion="No todas las empresas trabajan igual. Turnos fijos o rotativos, distintos plazos de aviso y distintos regímenes de vacaciones se configuran desde el propio sistema."
          />
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modulos.map((m) => (
              <Tarjeta key={m.titulo} icono={m.icono} titulo={m.titulo} pie={m.pie}>{m.texto}</Tarjeta>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="bg-white rounded-2xl border border-line/70 shadow-card p-6 sm:p-10 grid lg:grid-cols-[1fr_1.4fr] gap-10">
          <div>
            <Encabezado antetitulo="Cómo funciona" titulo="De la alta de la organización a la primera solicitud" />
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-soft p-4">
              <BarChart3 size={18} className="text-info shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-muted leading-relaxed">
                Con los datos cargados, el empleador ve qué días y franjas horarias concentran más turnos y en qué meses se piden más vacaciones.
              </p>
            </div>
          </div>
          <ol className="space-y-6">
            {pasos.map((p, i) => (
              <li key={p.titulo} className="flex gap-4">
                <span className="h-8 w-8 shrink-0 rounded-full bg-primary text-white grid place-items-center text-sm font-bold">{i + 1}</span>
                <div>
                  <h3 className="text-sm font-bold text-ink">{p.titulo}</h3>
                  <p className="text-sm text-muted mt-1 leading-relaxed">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <BandaAzul
        antetitulo="Empezá hoy"
        titulo="Ordená la gestión de tu equipo"
        descripcion="Si tu organización ya tiene una cuenta, ingresá con el email y la contraseña que te entregaron."
      >
        <Link to="/login" className="btn-primary bg-white text-primary hover:bg-primary-50">Ingresar</Link>
        <Link to="/nosotros" className="btn-primary bg-primary-light hover:bg-info">Conocer el proyecto</Link>
      </BandaAzul>
    </>
  )
}
