// Contraseñas provisorias. Siempre cumplen la política del sistema (RNF-03): al menos
// 8 caracteres y un carácter especial. Además llevan mayúscula, minúscula y número, y
// evitan letras que se confunden al dictarlas (I, l, O, 0, 1).
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";

function randomIndex(max) {
  const value = new Uint32Array(1);
  window.crypto.getRandomValues(value);
  return value[0] % max;
}

export function generatePassword(length = 12) {
  const all = UPPER + LOWER + DIGITS + SYMBOLS;
  const characters = [UPPER, LOWER, DIGITS, SYMBOLS].map((set) => set[randomIndex(set.length)]);
  while (characters.length < length) characters.push(all[randomIndex(all.length)]);
  // Mezcla para que el carácter especial no quede siempre en el mismo lugar
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const other = randomIndex(index + 1);
    [characters[index], characters[other]] = [characters[other], characters[index]];
  }
  return characters.join("");
}
