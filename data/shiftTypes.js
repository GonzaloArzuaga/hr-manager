import { store } from "../lib/store";
import { syncShiftTypes } from "../lib/api";

// Los tipos de turno viven en la tabla shift_types de la base de datos.
export function getShiftDuration(start, end) {
  const [startHours, startMinutes] = start.split(":").map(Number);
  const [endHours, endMinutes] = end.split(":").map(Number);
  const duration = (endHours * 60 + endMinutes - startHours * 60 - startMinutes) / 60;
  return duration > 0 ? duration : duration + 24;
}

export function getShiftTypes() {
  return store.shiftTypes.map((shift) => ({ ...shift }));
}

// Sincroniza la lista editada con la base. Devuelve una promesa.
export function saveShiftTypes(shiftTypes) {
  return syncShiftTypes(shiftTypes);
}
