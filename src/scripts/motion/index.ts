import { dispose } from '../palette/dispose';
import { startExtras } from '../palette/extras';
import { loadDisplayFont } from '../palette/fonts';
import { PALETTE_EVENT, currentPalette, type PaletteChangeDetail } from '../palette/palettes';
import { about } from './about';
import { contact } from './contact';
import { initLenis } from './lenis';
import { lotecito } from './lotecito';
import { restoreReadingPosition, trackReadingPosition } from './position';
import { progress } from './progress';
import { projects } from './projects';
import { stack } from './stack';
import { bindToTopFocus, toTop, watchToTop } from './totop';
import type { MotionModule, ScrollTriggerT } from './types';

// lotecito va antes de projects: el pin agrega altura y los triggers posteriores deben medirla.
const modules: MotionModule[] = [progress, toTop, about, stack, lotecito, projects, contact];

const root = document.documentElement;

const whenIdle = (cb: () => void) =>
  'requestIdleCallback' in window
    ? requestIdleCallback(cb, { timeout: 1500 })
    : setTimeout(cb, 200);

/**
 * Lo que el lector tiene delante: el elemento del contenido que está a un tercio de la altura de
 * la pantalla (o en el centro, si ahí no hay nada). Se descartan la cortina y la barra, que están
 * fijas encima. Puede ser un elemento del bloque pineado de Lotecito: se mide donde se ve.
 */
function readingAnchor(): Element | null {
  const x = innerWidth / 2;
  for (const y of [innerHeight / 3, innerHeight / 2]) {
    for (const el of document.elementsFromPoint(x, y)) {
      if (el.closest('.curtain, .confetti, .nav')) continue;
      if (el.closest('main, footer')) return el;
    }
  }
  return null;
}

/**
 * `ScrollTrigger.refresh()` sin que se mueva lo que se está leyendo. El refresh devuelve el
 * scroll al mismo número, pero si cambió dónde empieza el pin (o si el bloque dejó de entrar y se
 * despinea) el contenido puede quedar corrido: se mide el ancla en pantalla antes y después y se
 * compensa la diferencia.
 */
function refreshInPlace(ScrollTrigger: ScrollTriggerT) {
  const anchor = readingAnchor();
  const before = anchor?.getBoundingClientRect().top ?? 0;
  ScrollTrigger.refresh();
  if (!anchor?.isConnected) return;
  const shift = anchor.getBoundingClientRect().top - before;
  if (Math.abs(shift) < 1) return;
  window.scrollTo({ top: window.scrollY + shift, behavior: 'instant' });
  ScrollTrigger.update();
}

/**
 * Cambiar de paleta cambia la métrica de los títulos (Arcade: Silkscreen, más altura de línea y
 * tamaños redondeados a 8px), y con ella dónde empieza el pin de Lotecito y el largo de la página
 * (barra de progreso, anillo de volver arriba, cielo de Atardecer). ScrollTrigger vuelve a medir
 * en el cuadro siguiente al cambio (la cortina todavía tapa) y otra vez cuando llega la tipografía
 * de la paleta nueva, que con una red lenta puede tardar más que la cortina.
 */
function remeasureOnPalette(ScrollTrigger: ScrollTriggerT): () => void {
  let frame = 0;
  let alive = true;
  const remeasure = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => refreshInPlace(ScrollTrigger));
  };
  const onChange = (e: Event) => {
    const { id } = (e as CustomEvent<PaletteChangeDetail>).detail;
    remeasure();
    void loadDisplayFont(id).then(() => {
      if (alive && currentPalette() === id) remeasure();
    });
  };
  document.addEventListener(PALETTE_EVENT, onChange);
  return () => {
    alive = false;
    cancelAnimationFrame(frame);
    document.removeEventListener(PALETTE_EVENT, onChange);
  };
}

async function start() {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const mm = gsap.matchMedia();
  mm.add(
    {
      desktop: '(min-width: 900px) and (pointer: fine)',
      // Complemento exacto de desktop (sin huecos con anchos fraccionarios por zoom).
      mobile: 'not all and (min-width: 900px) and (pointer: fine)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const { desktop, reduce } = context.conditions as Record<string, boolean>;
      if (reduce) {
        root.dataset.motion = 'off';
        return;
      }
      root.dataset.motion = desktop ? 'desktop' : 'mobile';
      const cleanups: Array<() => void> = [];
      if (desktop) cleanups.push(initLenis(gsap, ScrollTrigger));
      for (const init of modules) {
        // Un módulo roto no debe tumbar al resto ni dejar Lenis sin cleanup.
        try {
          const off = init(gsap, ScrollTrigger, { desktop });
          if (off) cleanups.push(off);
        } catch (err) {
          console.error('[motion]', err);
        }
      }
      cleanups.push(remeasureOnPalette(ScrollTrigger));
      // Extras de la paleta activa (tipeo de Terminal, scanlines de Arcade...). Van después de los
      // módulos: sus triggers se miden con el pin de Lotecito ya armado. Con reduced motion no
      // se llega acá (se sale antes), así que no se crea ni se descarga nada.
      try {
        cleanups.push(startExtras({ gsap, ScrollTrigger, desktop }));
      } catch (err) {
        console.error('[motion]', err);
      }
      // Un cleanup que tira no puede saltear a los siguientes: el de los extras va último y, si no
      // corre, al rearmar el contexto quedarían dos extras vivos.
      return () => dispose(cleanups, '[motion]');
    },
  );

  // Con el pin ya medido, devolver al lector a su hash o a la posición previa a la recarga.
  // Se repite tras el refresh por fuentes (el swap cambia alturas); no actúa si ya scrolleó.
  ScrollTrigger.refresh();
  restoreReadingPosition(root.dataset.motion ?? '');

  document.fonts.ready.then(() => {
    ScrollTrigger.refresh();
    restoreReadingPosition(root.dataset.motion ?? '');
  });
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

// El botón de volver arriba no depende de GSAP: su visibilidad y su foco corren en las dos ramas.
bindToTopFocus();
watchToTop();

if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  root.dataset.motion = 'off';
} else {
  trackReadingPosition();
  // Si falla la carga de GSAP (red), el sitio queda estático y legible.
  whenIdle(() => start().catch((err) => console.error('[motion]', err)));
}
