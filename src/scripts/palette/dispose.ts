/**
 * Corre todos los cleanups en orden. Uno que tira se registra y no frena a los demás: si no, lo que
 * quedó sin deshacer (un trigger, un timer, una capa) seguiría vivo en una paleta que ya no es la
 * suya.
 */
export function dispose(offs: Array<() => void>, label = '[palette]'): void {
  for (const off of offs) {
    try {
      off();
    } catch (err) {
      console.error(label, err);
    }
  }
}
