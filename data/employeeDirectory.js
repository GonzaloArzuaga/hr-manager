// Directorio de empleados. Se completa con los datos reales de Supabase
// (ver lib/store.js) antes de mostrar cualquier pantalla.
export const employeeDirectory = [];

export function getEmployeeById(employeeId) {
  const employee = employeeDirectory.find((entry) => entry.id === String(employeeId));
  if (!employee) {
    throw new Error(`No se encontró el empleado con legajo ${employeeId}.`);
  }
  return employee;
}

export function sortByEmployeeDirectory(items) {
  const employeeOrder = new Map(
    employeeDirectory.map((employee, index) => [employee.id, index]),
  );

  return items
    .map((item, originalIndex) => ({
      item,
      originalIndex,
      employeeIndex: employeeOrder.get(String(item.employeeId)) ?? Infinity,
    }))
    .sort(
      (left, right) =>
        left.employeeIndex - right.employeeIndex ||
        left.originalIndex - right.originalIndex,
    )
    .map(({ item }) => item);
}
