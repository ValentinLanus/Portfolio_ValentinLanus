import { startExtras } from '../palette/extras';
import { about } from './about';
import { contact } from './contact';
import { initLenis } from './lenis';
import { lotecito } from './lotecito';
import { restoreReadingPosition, trackReadingPosition } from './position';
import { progress } from './progress';
import { projects } from './projects';
import { stack } from './stack';
import { bindToTopFocus, toTop, watchToTop } from './totop';
import type { MotionModule } from './types';

// lotecito va antes de projects: el pin agrega altura y los triggers posteriores deben medirla.
const modules: MotionModule[] = [progress, toTop, about, stack, lotecito, projects, contact];

const root = document.documentElement;

const whenIdle = (cb: () => void) =>
  'requestIdleCallback' in window
    ? requestIdleCallback(cb, { timeout: 1500 })
    : setTimeout(cb, 200);

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
      // Extras de la paleta activa (tipeo de Terminal, scanlines de Arcade...). Van después de los
      // módulos: sus triggers se miden con el pin de Lotecito ya armado. Con reduced motion no
      // se llega acá (se sale antes), así que no se crea ni se descarga nada.
      try {
        cleanups.push(startExtras({ gsap, ScrollTrigger, desktop }));
      } catch (err) {
        console.error('[motion]', err);
      }
      return () => cleanups.forEach((off) => off());
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
