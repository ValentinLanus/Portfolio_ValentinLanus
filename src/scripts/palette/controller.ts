import { loadDisplayFont } from './fonts';
import {
  PALETTE_EVENT,
  STORAGE_KEY,
  currentPalette,
  type PaletteChangeDetail,
  type PaletteId,
} from './palettes';

type Origin = { x: number; y: number };
type Request = { id: PaletteId; origin: Origin };

/** Si las cortinas (su descarga o su animación) tardan más que esto, el cambio sigue sin ellas. */
const CURTAIN_LIMIT_MS = 2000;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const screenCentre = (): Origin => ({ x: innerWidth / 2, y: innerHeight / 2 });

// Las cortinas, y motion con ellas, no se bajan al cargar: quien no cambia de paleta, o la cambia
// con reduced motion, no las descarga.
const loadCurtains = () => import('./curtains');

/**
 * Adelanta la descarga de las cortinas cuando se abre el selector (el popover de la barra o el
 * menú mobile): para cuando se elige, ya están, y la primera cortina no espera a la red. Con
 * reduced motion no hay cortinas y no se baja nada.
 */
export function prefetchCurtains(): void {
  if (reducedMotion()) return;
  loadCurtains().catch(() => {
    // Sin red: el cambio las vuelve a pedir y, si tampoco llegan, es instantáneo.
  });
}

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

/** El resultado de `work`, o `undefined` si no llegó a tiempo. Un rechazo se propaga. */
async function within<T>(work: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: number | undefined;
  const late = new Promise<undefined>((resolve) => {
    timer = window.setTimeout(resolve, ms);
  });
  try {
    return await Promise.race([work, late]);
  } finally {
    clearTimeout(timer);
  }
}

async function transition({ id, origin }: Request) {
  let swapped = false;
  const swap = () => {
    if (swapped) return;
    swapped = true;
    applyPalette(id);
  };
  if (reducedMotion()) return swap();
  // La tipografía de títulos de la paleta nueva empieza a bajar ya, mientras la cortina tapa. No se
  // la espera: si llega después de la cortina, los títulos se reacomodan solos y motion vuelve a
  // medir (motion/index.ts).
  void loadDisplayFont(id);
  // Pasa a las cortinas para que cancelen su animación y se saquen del DOM si el controlador se
  // cansa de esperarlas.
  const abort = new AbortController();
  try {
    // Si el chunk no llega o no carga, el cambio es instantáneo.
    const curtains = await within(loadCurtains(), CURTAIN_LIMIT_MS);
    if (curtains)
      await within(curtains.playCurtain(id, origin, swap, abort.signal), CURTAIN_LIMIT_MS);
  } catch (err) {
    console.error('[palette]', err);
  } finally {
    // Una cortina rota o colgada no puede dejar el sitio en la paleta vieja, ni su velo tapando
    // la página, ni el selector sin responder: la cola sigue con el pedido que viene.
    abort.abort();
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
