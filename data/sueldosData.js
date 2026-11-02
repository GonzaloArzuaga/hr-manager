const spanishMonths = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function getPayrollStatus(payroll, today = new Date()) {
  if (payroll.status === "Pendiente" || !payroll.paymentDate) {
    return "Pendiente";
  }

  const [periodMonth, periodYear] = payroll.period.toLocaleLowerCase("es").split(" ");
  const periodMonthIndex = spanishMonths.indexOf(periodMonth);
  if (periodMonthIndex === -1 || !periodYear) {
    throw new Error(`El período de sueldo "${payroll.period}" no tiene un formato válido.`);
  }

  const [day, month, year] = payroll.paymentDate.split("/").map(Number);
  const paymentDate = new Date(year, month - 1, day);
  if (
    paymentDate.getFullYear() !== year ||
    paymentDate.getMonth() !== month - 1 ||
    paymentDate.getDate() !== day
  ) {
    throw new Error(`La fecha de pago "${payroll.paymentDate}" no es válida.`);
  }

  const isCurrentPeriod =
    Number(periodYear) === today.getFullYear() &&
    periodMonthIndex === today.getMonth();
  return isCurrentPeriod && today < paymentDate ? "Pendiente" : payroll.status;
}

// Se completa con datos reales en lib/store.js (buildSueldosData).
export const sueldosData = {
  period: "",
  totals: { pendingByDepartment: [] },
  employees: [],
  payrolls: [],
  departments: [],
  historicalPayrolls: [],
};
