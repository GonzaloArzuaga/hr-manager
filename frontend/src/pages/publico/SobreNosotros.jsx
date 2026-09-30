import { Link } from 'react-router-dom'
import { SlidersHorizontal, Eye, FileSpreadsheet, Building2, KeyRound, Lock, History } from 'lucide-react'
import { Etiqueta, Encabezado, Tarjeta, BandaAzul } from '../../components/Seccion'

const principios = [
  { icono: SlidersHorizontal, titulo: 'Reglas propias, sin programar', texto: 'Las políticas de francos y vacaciones son datos que cada organización configura, no condiciones fijas en el código.', pie: 'Configurable por organización' },
  { icono: Eye, titulo: 'Transparencia para el empleado', texto: 'Cada persona ve sus horarios, el estado de sus solicitudes, los días de vacaciones que le corresponden y sus recibos.', pie: 'Información a la vista' },
  { icono: FileSpreadsheet, titulo: 'Menos planillas y mensajes', texto: 'Las solicitudes se cargan, se validan y se aprueban en el mismo lugar, con un historial que queda registrado.', pie: 'Todo centralizado' }
]

const cuidados = [
  { icono: Building2, titulo: 'Datos separados por organización', texto: 'Cada organización accede únicamente a su propia información.' },
  { icono: KeyRound, titulo: 'Acceso según el rol', texto: 'Empleador y empleado ven y hacen cosas distintas. Las cuentas las crea el empleador, no hay registro abierto.' },
  { icono: Lock, titulo: 'Recibos privados', texto: 'Un empleado nunca puede ver los pagos ni los recibos de otro.' },
  { icono: History, titulo: 'Historial de solicitudes', texto: 'Cada franco y período de vacaciones conserva su estado y su resolución.' }
]

export default function SobreNosotros() {
  return (
    <>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-12">
        <Etiqueta>Nuestro proyecto</Etiqueta>
        <h1 className="mt-5 text-3xl font-bold text-ink tracking-tight max-w-3xl leading-tight">
          Una herramienta simple para un problema de todos los días
        </h1>
        <p className="mt-4 text-base text-muted max-w-3xl leading-relaxed">
          HRManager es el Proyecto Final de Gonzalo Arzuaga y Maximo Galo Maguna Thumm, estudiantes de la
          Licenciatura en Informática de la Universidad Atlántida. Surge de una pregunta concreta: cómo gestionar
          horarios, francos y vacaciones en organizaciones que hoy lo hacen con planillas y que no pueden pagar
          un sistema corporativo.
        </p>
      </section>

      <section className="bg-soft/60 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Encabezado
            antetitulo="Cómo lo pensamos"
            titulo="Tres ideas detrás del sistema"
            descripcion="En lugar de construir un sistema atado a las reglas de una sola empresa, lo diseñamos para que cada organización defina las suyas."
          />
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {principios.map((p) => (
              <Tarjeta key={p.titulo} icono={p.icono} titulo={p.titulo} pie={p.pie}>{p.texto}</Tarjeta>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <Encabezado
          centrado
          antetitulo="Cuidado de los datos"
          titulo="Cada organización ve solo lo suyo"
          descripcion="El sistema maneja información sensible, como montos y recibos de sueldo, así que el acceso se controla en cada consulta."
        />
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cuidados.map((c) => (
            <Tarjeta key={c.titulo} icono={c.icono} titulo={c.titulo}>{c.texto}</Tarjeta>
          ))}
        </div>
      </section>

      <BandaAzul
        antetitulo="Seguí recorriendo"
        titulo="Mirá qué incluye cada plan"
        descripcion="Todos los planes tienen los mismos módulos. Lo que cambia es la cantidad de empleados y el acompañamiento."
      >
        <Link to="/precios" className="btn-primary bg-white text-primary hover:bg-primary-50">Ver planes</Link>
      </BandaAzul>
    </>
  )
}
