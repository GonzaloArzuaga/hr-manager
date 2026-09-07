const estilos = {
  pendiente: 'bg-warn-light text-warn',
  aprobado: 'bg-accent-light text-accent',
  acreditado: 'bg-accent-light text-accent',
  rechazado: 'bg-danger-light text-danger'
}

export default function EstadoBadge({ estado }) {
  return (
    <span className={`badge ${estilos[estado] ?? 'bg-gray-100 text-gray-600'}`}>
      {estado}
    </span>
  )
}
