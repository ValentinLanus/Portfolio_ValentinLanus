/** El cleanup de lo que no llegó a armar nada. */
export const noop = () => {};

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

/**
 * Arranca las piezas de un extra en orden, cada una por su cuenta: una que tira al arrancar se
 * registra y no se lleva puestas a las otras. Devuelve un cleanup que deshace las que arrancaron.
 */
export function startParts(parts: Array<() => () => void>): () => void {
  const offs: Array<() => void> = [];
  for (const start of parts) {
    try {
      offs.push(start());
    } catch (err) {
      console.error('[extras]', err);
    }
  }
  return () => dispose(offs);
}
