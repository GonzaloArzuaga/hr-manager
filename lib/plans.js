import { store } from "./store";

// Módulos que se habilitan según el plan de la empresa (columna plans.modules).
// El resto (horarios, francos, vacaciones, empleados y configuración) está en todos los planes.
export const planModules = [
  { key: "fichajes", label: "Fichajes", detail: "Control de asistencia del empleador e importación desde Excel" },
  { key: "sueldos", label: "Sueldos", detail: "Carga de sueldos y recibos; el empleado ve los suyos" },
  { key: "estadisticas", label: "Estadísticas", detail: "Gráficos de demanda de personal y vacaciones" },
];

export const allModuleKeys = planModules.map((module) => module.key);

// Módulo al que pertenece cada ruta del panel
export function moduleForPath(path) {
  const section = path.split("/")[2];
  return allModuleKeys.includes(section) ? section : null;
}

// El administrador no tiene empresa: ve todo. Una empresa sin datos de plan
// (versión anterior de la base) también conserva todos los módulos.
export function hasModule(key) {
  if (!key) return true;
  const modules = store.company?.plan?.modules;
  if (!Array.isArray(modules)) return true;
  return modules.includes(key);
}
