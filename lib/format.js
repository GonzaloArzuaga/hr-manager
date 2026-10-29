// Utilidades de formato compartidas por la capa de datos.

export const spanishMonths = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function capitalize(text) {
  return text ? text[0].toLocaleUpperCase("es") + text.slice(1) : text;
}

// Fecha local en formato YYYY-MM-DD, sin desfases por zona horaria.
export function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function parseDateKey(value) {
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

// YYYY-MM-DD -> DD/MM/YYYY
export function toDisplayDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

// DD/MM/YYYY -> YYYY-MM-DD
export function fromDisplayDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const [day, month, year] = value.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function toTime(value) {
  return value ? String(value).slice(0, 5) : value;
}

export function todayKey() {
  return toDateKey(new Date());
}

export function getWeekStart(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  return start;
}

export function getIsoWeekNumber(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
}

export function formatWeekLabel(weekStartKey) {
  const start = parseDateKey(weekStartKey);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const range = sameMonth
    ? `${start.getDate()} al ${end.getDate()} de ${spanishMonths[end.getMonth()]}`
    : `${start.getDate()} de ${spanishMonths[start.getMonth()]} al ${end.getDate()} de ${spanishMonths[end.getMonth()]}`;
  return `Semana ${getIsoWeekNumber(start)} • ${range} ${end.getFullYear()}`;
}

export function formatShortWeek(weekStartKey) {
  const start = parseDateKey(weekStartKey);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `Semana ${getIsoWeekNumber(start)} (${fmt(start)} - ${fmt(end)})`;
}

export function formatWeekPeriod(weekStartKey) {
  const start = parseDateKey(weekStartKey);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startMonth = capitalize(spanishMonths[start.getMonth()]);
  const endMonth = capitalize(spanishMonths[end.getMonth()]);
  return startMonth === endMonth
    ? `${endMonth} ${end.getFullYear()}`
    : `${startMonth} / ${endMonth} ${end.getFullYear()}`;
}

// "2026-10-01" -> "Octubre 2026"
export function toPeriodLabel(dateKey) {
  const date = parseDateKey(dateKey);
  return `${capitalize(spanishMonths[date.getMonth()])} ${date.getFullYear()}`;
}

// "Octubre 2026" -> "2026-10-01"
export function fromPeriodLabel(label) {
  const [monthName, year] = String(label).toLocaleLowerCase("es").split(" ");
  const month = spanishMonths.indexOf(monthName);
  if (month < 0 || !year) throw new Error(`El período "${label}" no es válido.`);
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

export function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es"))
    .join("");
}

export function formatCuil(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

export function yearsBetween(fromKey, to = new Date()) {
  const from = parseDateKey(fromKey);
  let years = to.getFullYear() - from.getFullYear();
  const passed =
    to.getMonth() > from.getMonth() ||
    (to.getMonth() === from.getMonth() && to.getDate() >= from.getDate());
  if (!passed) years -= 1;
  return Math.max(years, 0);
}

export function tenureLabel(hireKey, to = new Date()) {
  const from = parseDateKey(hireKey);
  let months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
  if (to.getDate() < from.getDate()) months -= 1;
  months = Math.max(months, 0);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years) parts.push(`${years} ${years === 1 ? "año" : "años"}`);
  if (rest || !years) parts.push(`${rest} ${rest === 1 ? "mes" : "meses"}`);
  return parts.join(" ");
}
