import type { Gsap, ScrollTriggerT } from '../../motion/types';
import { dispose } from '../dispose';
import type { Extra, ExtraCtx } from '../extras';

// Atardecer: un sol baja y el cielo se oscurece a medida que se lee la página.
//   - El cielo (`.fx-sky`) y el sol (`.fx-sun`) son dos capas fijas detrás del contenido. Las mueve
//     el avance de toda la página (0 arriba, 1 al final): el CSS (styles/extras.css) convierte ese
//     número en color de cielo, altura del sol y paso del sol de amarillo a naranja. Acá solo se lo
//     escribe en `--fx-p`; todo lo demás es CSS y solo toca color, transform y opacity.
//   - Junto a cada título de sección brota una plantita que crece una vez, de abajo hacia arriba,
//     cuando el título entra en la vista (guiño al campo de Lotecito).
// Qué comunica: el paso del tiempo (cuánto se leyó y cuánto falta) y cuidado por lo que recién
// empieza. Las capas son decoración: no tienen texto, no capturan el puntero y el contraste del
// texto sobre ellas está medido en los tests (ver el comentario de Atardecer en extras.css).

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Al cambiar a Atardecer la cortina todavía se está abriendo: los brotes visibles esperan a que se vea. */
const SWITCH_LEAD_S = 0.45;
const GROW_S = 0.9;

/**
 * Títulos cuyo brote ya creció. Vive con el módulo: al volver a la paleta los brotes ya vistos
 * aparecen crecidos, sin repetir la entrada.
 */
const grown = new WeakSet<Element>();
/** Si el cielo ya se fundió en esta carga: un rearmado de motion (por tamaño de ventana) no lo repite. */
let skyFaded = false;

function layer(className: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = className;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

/**
 * El cielo y el sol. Mientras están, <html> lleva `fx-sky-on`: el body deja de pintar --bg y el
 * fondo es el cielo. <html> sigue pintando --bg (ver el CSS), así que detrás del cielo nunca hay
 * blanco: ni en el rebote de scroll, ni mientras el cielo se funde al entrar.
 */
function sky(ScrollTrigger: ScrollTriggerT, reason: ExtraCtx['reason']): () => void {
  const root = document.documentElement;
  const heaven = layer('fx-sky');
  const sun = layer('fx-sun');
  sun.append(layer('fx-sun-dusk'));
  // Una vez que el cielo se mostró no se vuelve a fundir, salvo que el usuario recién lo eligió.
  if (skyFaded && reason === 'load') {
    heaven.style.animation = 'none';
    sun.style.animation = 'none';
  }
  skyFaded = true;
  document.body.append(heaven, sun);
  root.classList.add('fx-sky-on');

  let trigger: ReturnType<ScrollTriggerT['create']> | undefined;
  const undo = () => {
    trigger?.kill();
    root.classList.remove('fx-sky-on');
    heaven.remove();
    sun.remove();
  };

  let last = Number.NaN;
  const paint = (progress: number) => {
    // Cuatro decimales: menos de 0.1 px de paso para el sol y ningún escalón de color visible.
    const value = Math.round(progress * 1e4) / 1e4;
    if (value === last) return;
    last = value;
    heaven.style.setProperty('--fx-p', String(value));
    sun.style.setProperty('--fx-p', String(value));
  };
  try {
    // Todo el recorrido de la página, como la barra de progreso (motion/progress.ts). `max` sigue
    // al alto real: el pin de Lotecito, las fuentes que cargan y el zoom de texto lo recalculan.
    trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => paint(self.progress),
      onRefresh: (self) => paint(self.progress),
    });
    paint(trigger.progress);
  } catch (err) {
    undo();
    throw err;
  }
  return undo;
}

/**
 * La plantita: un tallo con dos hojas (el color del segundo acento de la paleta) y un capullo del
 * acento. Se dibuja en una grilla de 24x40 con la base abajo, de donde crece. Los colores salen
 * del CSS (`currentColor` y el selector `ellipse` de extras.css), no de acá.
 */
function sprout(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const shape = (tag: string, attrs: Record<string, string>) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    return node;
  };
  svg.setAttribute('class', 'fx-sprout');
  svg.setAttribute('viewBox', '0 0 24 40');
  svg.setAttribute('preserveAspectRatio', 'xMaxYMax meet');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.append(
    shape('path', {
      d: 'M12 40C12 31 13 25 12 15',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
    }),
    shape('path', {
      d: 'M12.4 30C6 30.5 2.5 26 2 20C8.5 19.5 12.2 23.5 12.4 30Z',
      fill: 'currentColor',
    }),
    shape('path', {
      d: 'M12.8 22C18.5 22 22 18 22.5 12.5C16.5 12 13 15.5 12.8 22Z',
      fill: 'currentColor',
    }),
    shape('ellipse', { cx: '12', cy: '10.5', rx: '3.2', ry: '4.6' }),
  );
  return svg;
}

/**
 * Un brote por título de sección. Va dentro del `h2`, fuera del flujo (posición absoluta en el
 * margen izquierdo, ver el CSS): no cambia la caja del título ni su nombre accesible (el SVG es
 * `aria-hidden` y no tiene texto). Crece una vez al entrar su título en la vista; el que ya quedó
 * atrás al cargar (recarga a mitad de página) o ya creció antes aparece entero.
 */
function sprouts(
  gsap: Gsap,
  ScrollTrigger: ScrollTriggerT,
  reason: ExtraCtx['reason'],
): () => void {
  const born = performance.now();
  const offs: Array<() => void> = [];

  // Si algo tira a mitad de camino, se deshace lo que ya se armó: el que llama no recibe el cleanup.
  try {
    document.querySelectorAll<HTMLElement>('h2.section__title').forEach((title) => {
      const plant = sprout();
      title.prepend(plant);
      offs.push(() => plant.remove());

      if (grown.has(title) || title.getBoundingClientRect().bottom < 0) {
        grown.add(title);
        return;
      }

      gsap.set(plant, { scaleY: 0, transformOrigin: '50% 100%' });
      let growing: ReturnType<Gsap['to']> | null = null;
      const trigger = ScrollTrigger.create({
        trigger: title,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          grown.add(title);
          // Al cambiar de paleta, lo que ya se ve espera a que la cortina termine de abrirse.
          const lead =
            reason === 'switch'
              ? Math.max(0, SWITCH_LEAD_S - (performance.now() - born) / 1000)
              : 0;
          growing = gsap.to(plant, { scaleY: 1, duration: GROW_S, ease: 'sine.out', delay: lead });
        },
      });
      offs.push(() => {
        trigger.kill();
        growing?.kill();
      });
    });
  } catch (err) {
    dispose(offs);
    throw err;
  }

  return () => dispose(offs);
}

const atardecer: Extra = ({ gsap, ScrollTrigger, reason }) => {
  const parts = [() => sky(ScrollTrigger, reason), () => sprouts(gsap, ScrollTrigger, reason)];
  const offs: Array<() => void> = [];
  // Una pieza que falla no se lleva puesta a la otra.
  for (const start of parts) {
    try {
      offs.push(start());
    } catch (err) {
      console.error('[extras]', err);
    }
  }
  return () => dispose(offs);
};

export default atardecer;
