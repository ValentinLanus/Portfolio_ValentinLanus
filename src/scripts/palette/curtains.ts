import type { PaletteId } from './palettes';

/**
 * Cortina que tapa el cambio de paleta. Versión mínima: no anima nada y solo aplica el cambio.
 * La reemplaza la cortina de cada paleta (misma firma): `swap` se llama una vez, con la pantalla
 * ya cubierta, y la promesa se resuelve cuando la cortina terminó de irse.
 */
export function playCurtain(
  _id: PaletteId,
  _origin: { x: number; y: number },
  swap: () => void,
): Promise<void> {
  swap();
  return Promise.resolve();
}
