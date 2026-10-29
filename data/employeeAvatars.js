import { employeeDirectory } from "./employeeDirectory";

// Foto de perfil de un empleado, si subió una. Si no, se muestran las iniciales.
export function getEmployeeAvatar(name) {
  return employeeDirectory.find((employee) => employee.name === name)?.avatarUrl;
}
