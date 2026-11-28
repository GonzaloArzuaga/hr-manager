import { store } from "../lib/store";
import { saveRules } from "../lib/api";
import {
  MIN_DAYS_OFF_NOTICE,
  MIN_HIRING_AGE,
  VACATION_BASE_NOTICE,
  addMonths,
  hasMinimumHiringAge,
  seniorityLabel,
  seniorityParts,
  vacationDaysFor,
} from "./legal";

// Las reglas de negocio viven en la base de datos (tablas business_rules y
// vacation_entitlement_ranges) y se leen al iniciar sesión. Lo que fija la ley
// y no es configurable está en data/legal.js y se reexporta acá para que las
// pantallas tengan un único lugar del que importar.
export {
  MIN_DAYS_OFF_NOTICE,
  MIN_HIRING_AGE,
  VACATION_BASE_NOTICE,
  addMonths,
  hasMinimumHiringAge,
  seniorityLabel,
  seniorityParts,
  vacationDaysFor,
};

export const defaultBusinessRules = {
  weeklyDaysOff: 2,
  daysOffNotice: MIN_DAYS_OFF_NOTICE,
  vacationExtraNotice: 0,
  daysOffBacklogFrom: null,
  vacationRanges: [],
};

export function getBusinessRules() {
  const rules = store.rules ?? defaultBusinessRules;
  return {
    ...rules,
    daysOffNotice: Math.max(rules.daysOffNotice ?? MIN_DAYS_OFF_NOTICE, MIN_DAYS_OFF_NOTICE),
    vacationNotice: vacationNoticeOf(rules),
    vacationRanges: (rules.vacationRanges ?? []).map((range) => ({ ...range })),
  };
}

// Días de aviso previo que rigen para pedir o asignar vacaciones.
export function vacationNoticeOf(rules) {
  return VACATION_BASE_NOTICE + Math.max(rules?.vacationExtraNotice ?? 0, 0);
}

// Guarda las reglas en la base. Devuelve una promesa.
export function saveBusinessRules(rules) {
  return saveRules(rules);
}

// Compatibilidad con el nombre anterior de la función de cálculo.
export function getVacationEntitlement(hireDate, vacationRanges, year) {
  return vacationDaysFor(hireDate, vacationRanges, year);
}

// Francos que corresponden a un empleado en un mes: los francos semanales de la
// empresa multiplicados por las semanas que tiene ese mes (días del mes / 7),
// redondeado. Con 2 francos por semana: 8 en febrero y 9 en los meses de 30 o 31 días.
// Sin mes, se toma un mes de 4 semanas (criterio anterior).
export function getMonthlyFrancoAllowance(weeklyDaysOff, month) {
  if (!month) return weeklyDaysOff * 4;
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  return Math.round((weeklyDaysOff * daysInMonth) / 7);
}

// Tramos de antigüedad escritos para una pantalla.
export function rangeLabel(range) {
  const desde = range.monthsFrom ?? 0;
  const hasta = range.monthsTo ?? null;
  const enMeses = (meses) =>
    meses % 12 === 0
      ? `${meses / 12} ${meses / 12 === 1 ? "año" : "años"}`
      : `${meses} meses`;
  if (desde === 0 && hasta === null) return "cualquier antigüedad";
  if (desde === 0) return `hasta ${enMeses(hasta)}`;
  if (hasta === null) return `más de ${enMeses(desde)}`;
  return `más de ${enMeses(desde)} y hasta ${enMeses(hasta)}`;
}
