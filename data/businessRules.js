import { store } from "../lib/store";
import { saveRules } from "../lib/api";

// Las reglas de negocio viven en la base de datos (tablas business_rules y
// vacation_entitlement_ranges) y se leen al iniciar sesión.
export const defaultBusinessRules = {
  weeklyDaysOff: 2,
  daysOffNotice: 2,
  vacationNotice: 15,
  requiresDaysOffApproval: true,
  requiresVacationApproval: true,
  vacationRanges: [],
};

export function getBusinessRules() {
  const rules = store.rules ?? defaultBusinessRules;
  return {
    ...rules,
    vacationRanges: rules.vacationRanges.map((range) => ({ ...range })),
  };
}

// Guarda las reglas en la base. Devuelve una promesa.
export function saveBusinessRules(rules) {
  return saveRules(rules);
}

export function getVacationEntitlement(seniority, vacationRanges) {
  let seniorityYears = seniority;
  if (typeof seniority === "string") {
    if (!seniority) return 0;
    const hiredAt = new Date(`${seniority}T00:00:00`);
    if (Number.isNaN(hiredAt.getTime())) return 0;

    const today = new Date();
    seniorityYears = today.getFullYear() - hiredAt.getFullYear();
    const anniversaryHasPassed =
      today.getMonth() > hiredAt.getMonth() ||
      (today.getMonth() === hiredAt.getMonth() &&
        today.getDate() >= hiredAt.getDate());
    if (!anniversaryHasPassed) seniorityYears -= 1;
  }
  if (!Number.isInteger(seniorityYears) || seniorityYears < 0) return 0;

  const range = vacationRanges.find(
    ({ from, to }) =>
      seniorityYears >= from && (to === null || seniorityYears <= to),
  );

  return range?.days ?? 0;
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
