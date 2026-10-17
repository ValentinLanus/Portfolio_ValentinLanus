import { playCurtain } from './curtains';
import {
  PALETTE_EVENT,
  STORAGE_KEY,
  currentPalette,
  type PaletteChangeDetail,
  type PaletteId,
} from './palettes';

type Origin = { x: number; y: number };
type Request = { id: PaletteId; origin: Origin };

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const screenCentre = (): Origin => ({ x: innerWidth / 2, y: innerHeight / 2 });

/** Copia el fondo de la paleta activa a <meta name="theme-color"> (barra del navegador mobile). */
export function syncThemeColor() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
}

/**
 * El cambio en sí. El atributo se pone ANTES de despachar el evento: quien lo recibe (la
 * animación de "Sobre mí", `personality()`) lee `data-palette` para saber cuál es la nueva.
 */
function applyPalette(id: PaletteId) {
  const prev = currentPalette();
  document.documentElement.dataset.palette = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage bloqueado o lleno: la paleta vale para esta visita, solo no se recuerda.
  }
  syncThemeColor();
  document.dispatchEvent(
    new CustomEvent<PaletteChangeDetail>(PALETTE_EVENT, { detail: { id, prev } }),
  );
}

async function transition({ id, origin }: Request) {
  let swapped = false;
  const swap = () => {
    if (swapped) return;
    swapped = true;
    applyPalette(id);
  };
  if (reducedMotion()) return swap();
  try {
    await playCurtain(id, origin, swap);
  } catch (err) {
    console.error('[palette]', err);
  } finally {
    // Una cortina rota no puede dejar el sitio en la paleta vieja.
    swap();
  }
}

let running: Promise<void> | null = null;
let latest: Request | null = null;

async function drain(first: Request) {
  try {
    for (let next: Request | null = first; next; next = latest) {
      latest = null;
      if (next.id !== currentPalette()) await transition(next);
    }
  } finally {
    running = null;
  }
}

/**
 * Cambia la paleta del sitio. No hace nada si ya está activa. Si llega otro pedido mientras corre
 * una cortina, se guarda y al terminar se aplica solo el último; la promesa se resuelve cuando
 * ya no queda nada pendiente.
 */
export function setPalette(id: PaletteId, origin?: Origin): Promise<void> {
  const request = { id, origin: origin ?? screenCentre() };
  if (running) {
    latest = request;
    return running;
  }
  if (id === currentPalette()) return Promise.resolve();
  running = drain(request);
  return running;
}
