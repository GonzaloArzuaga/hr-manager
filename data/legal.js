// Reglas que fija la Ley 20.744 y que, por eso, no son configurables por la
// empresa. Este módulo no depende de ningún otro para que lo pueda usar
// cualquier parte de la aplicación sin generar importaciones circulares.
//
// La base de datos aplica exactamente estas mismas reglas y es la que decide:
// lo de acá sirve para que la interfaz muestre los mismos números sin ir y
// volver al servidor.

// Las vacaciones se cargan con dos semanas de anticipación como mínimo. Cada
// empresa puede exigir más días, nunca menos.
export const VACATION_BASE_NOTICE = 14;

// Un franco se pide o se asigna desde mañana en adelante: el empleado ya está
// trabajando el día en que lo pediría.
export const MIN_DAYS_OFF_NOTICE = 1;

// Edad mínima para celebrar un contrato de trabajo (artículo 32).
export const MIN_HIRING_AGE = 18;

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Suma meses a una fecha sin desbordar al mes siguiente: al 31 de enero más
// un mes le corresponde el 28 o el 29 de febrero, no el 2 o 3 de marzo.
export function addMonths(date, months) {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

// Antigüedad en años y meses cumplidos, para mostrarla en pantalla.
export function seniorityParts(hireDate, at = new Date()) {
  const hired = parseDate(hireDate);
  if (!hired || at < hired) return { years: 0, months: 0, totalMonths: 0 };
  let totalMonths =
    (at.getFullYear() - hired.getFullYear()) * 12 + (at.getMonth() - hired.getMonth());
  if (at.getDate() < hired.getDate()) totalMonths -= 1;
  if (totalMonths < 0) totalMonths = 0;
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12, totalMonths };
}

// Antigüedad escrita para una pantalla: "5 años y 3 meses".
export function seniorityLabel(hireDate, at = new Date()) {
  const { years, months } = seniorityParts(hireDate, at);
  const partes = [];
  if (years) partes.push(`${years} ${years === 1 ? "año" : "años"}`);
  if (months) partes.push(`${months} ${months === 1 ? "mes" : "meses"}`);
  if (!partes.length) return "menos de un mes";
  return partes.join(" y ");
}

// Días hábiles, de lunes a viernes, entre dos fechas inclusive. No contempla
// los feriados nacionales: el sistema no lleva calendario de feriados, así que
// se cuentan como hábiles. El artículo 152 los computa como trabajados, de
// modo que la diferencia nunca perjudica al empleado.
function workdaysBetween(from, to) {
  if (to < from) return 0;
  let count = 0;
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (cursor <= to) {
    const day = cursor.getDay();
    if (day >= 1 && day <= 5) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

// Días de vacaciones que corresponden según la antigüedad al 31 de diciembre
// del año indicado.
//
// Los tramos se expresan en meses. Un tramo cubre la antigüedad mayor a
// monthsFrom meses y hasta monthsTo meses inclusive, medida sobre la fecha
// exacta; el primer tramo, con monthsFrom en cero, incluye también el propio
// día de ingreso. Con la escala del artículo 150, cinco años exactos quedan en
// el primer tramo y cinco años y un día, en el segundo.
export function vacationDaysFor(hireDate, vacationRanges, year = new Date().getFullYear()) {
  const hired = parseDate(hireDate);
  if (!hired) return 0;

  const cutoff = new Date(year, 11, 31);
  if (hired > cutoff) return 0;

  // Artículo 150: la antigüedad se computa al 31 de diciembre del año al que
  // correspondan las vacaciones.
  const matching = (vacationRanges ?? [])
    .filter((range) => {
      const from = range.monthsFrom ?? 0;
      const to = range.monthsTo ?? null;
      const afterFrom = from === 0 || cutoff > addMonths(hired, from);
      const beforeTo = to === null || cutoff <= addMonths(hired, to);
      return afterFrom && beforeTo;
    })
    .sort((a, b) => (b.monthsFrom ?? 0) - (a.monthsFrom ?? 0));

  const days = matching[0]?.days ?? 0;
  if (!days) return 0;

  // Artículo 151: la licencia completa exige haber prestado servicios durante
  // la mitad, como mínimo, de los días hábiles del año calendario.
  const yearStart = new Date(year, 0, 1);
  const start = hired > yearStart ? hired : yearStart;
  const worked = workdaysBetween(start, cutoff);
  const total = workdaysBetween(yearStart, cutoff);
  if (worked * 2 >= total) return days;

  // Artículo 153: un día de descanso por cada veinte de trabajo efectivo.
  return Math.floor(worked / 20);
}

// ¿Tiene la edad mínima para ser contratado en la fecha de ingreso indicada?
export function hasMinimumHiringAge(birthDate, hireDate) {
  const born = parseDate(birthDate);
  const hired = parseDate(hireDate);
  if (!born || !hired) return true;
  return hired >= addMonths(born, MIN_HIRING_AGE * 12);
}
