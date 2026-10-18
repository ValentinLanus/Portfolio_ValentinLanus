import type { Gsap, ScrollTriggerT } from '../motion/types';
import { dispose } from './dispose';
import {
  PALETTE_EVENT,
  currentPalette,
  type PaletteChangeDetail,
  type PaletteId,
} from './palettes';

// Extras de paleta: animaciones y decoración propias de cada una (el tipeo de Terminal, las
// scanlines de Arcade...). Se suman a las entradas de sección de motion/reveal.ts, no las tocan.
//
//   - Cada paleta es un módulo con `export default` de un `Extra`. El mapa de abajo tiene un
//     import dinámico estático por paleta: el bundler hace un chunk por extra y solo se baja el de
//     la paleta activa (y el de la siguiente, si se cambia).
//   - `Record<PaletteId, ...>` obliga a que toda paleta nueva tenga su entrada: un archivo en
//     extras/ con su `Extra` (si una paleta no tuviera adornos propios, uno que devuelva un cleanup
//     vacío).
//   - Reglas para quien escriba un extra: todo elemento decorativo lleva `aria-hidden="true"` y
//     una clase `fx-*`; todo lo que se crea (nodos, triggers, tweens, listeners, clases) se
//     deshace en el cleanup; el texto que se anima pasa por `visualClone` (a11y.ts).
//   - Con prefers-reduced-motion no se llama a nada de esto: motion/index.ts sale antes.

export interface ExtraCtx {
  gsap: Gsap;
  ScrollTrigger: ScrollTriggerT;
  /** Mismo valor que reciben los módulos de motion: pantalla ancha con puntero fino. */
  desktop: boolean;
  /** Hay un puntero preciso (mouse) disponible. */
  finePointer: boolean;
  /**
   * Por qué arranca el extra: `load` es el arranque inicial (la página cargó con esta paleta, o
   * motion volvió a armar su contexto); `switch` es que el usuario acaba de cambiar a esta paleta.
   * En `load` la página puede estar ya a medio mostrar: un extra no tiene que deshacer a la vista
   * lo que el usuario ya está viendo.
   */
  reason: 'load' | 'switch';
}

export type Extra = (ctx: ExtraCtx) => () => void;

const EXTRAS: Record<PaletteId, () => Promise<{ default: Extra }>> = {
  terminal: () => import('./extras/terminal'),
  arcade: () => import('./extras/arcade'),
  caramelo: () => import('./extras/caramelo'),
  lava: () => import('./extras/lava'),
  atardecer: () => import('./extras/atardecer'),
};

const noop = () => {};

/**
 * Arranca el extra de la paleta activa y lo cambia cuando cambia la paleta. Se llama desde el
 * contexto de matchMedia de motion/index.ts (no en la rama de reduced motion). Devuelve el
 * cleanup total: saca el listener y deshace el extra que esté corriendo.
 */
export function startExtras(ctx: Omit<ExtraCtx, 'finePointer' | 'reason'>): () => void {
  const base = { ...ctx, finePointer: matchMedia('(pointer: fine)').matches };
  let stop = noop;
  // Cada pedido de arranque tiene su número: si la paleta cambia mientras el chunk baja, el
  // pedido viejo se descarta al llegar en vez de pisar al nuevo.
  let turn = 0;
  let alive = true;

  const undo = () => {
    const off = stop;
    stop = noop;
    dispose([off]);
  };

  const run = async (id: PaletteId, reason: ExtraCtx['reason']) => {
    const mine = ++turn;
    // Primero se limpia el anterior, con el evento recién despachado (la pantalla sigue tapada
    // por la cortina); recién después se carga el nuevo. Un cleanup que tira no puede impedir
    // que arranque el siguiente ni dejarse como el que hay que volver a correr.
    undo();
    try {
      const { default: extra } = await EXTRAS[id]();
      if (!alive || mine !== turn) return;
      stop = extra({ ...base, reason });
    } catch (err) {
      // Un extra roto o un chunk que no llega no tumban el sitio: queda sin ese adorno.
      console.error('[extras]', err);
    }
  };

  const onChange = (e: Event) =>
    void run((e as CustomEvent<PaletteChangeDetail>).detail.id, 'switch');
  document.addEventListener(PALETTE_EVENT, onChange);
  void run(currentPalette(), 'load');

  return () => {
    alive = false;
    turn++;
    document.removeEventListener(PALETTE_EVENT, onChange);
    undo();
  };
}
