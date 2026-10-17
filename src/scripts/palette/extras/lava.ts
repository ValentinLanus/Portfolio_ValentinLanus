import type { Gsap } from '../../motion/types';
import { dispose } from '../dispose';
import type { Extra } from '../extras';
import { fitZone } from '../zone';

// Lava: una lámpara de lava.
//   - Un filtro SVG "goo" (#fx-goo) funde entre sí las burbujas de una capa detrás del hero cuando
//     se cruzan, como cera caliente. El filtro se crea una sola vez y se aplica a la capa, no a cada
//     burbuja; las burbujas se mueven solo con transform (CSS en styles/extras.css).
//   - Con mouse, los botones del hero se estiran hacia el puntero cuando se acerca, como si el
//     calor los hiciera ceder, y vuelven con un rebote al alejarse.
// Qué comunica: calor y materia blanda en un sitio oscuro. Las burbujas viven en la zona libre del
// hero y se frenan cuando el hero sale de la vista.

const SVG_NS = 'http://www.w3.org/2000/svg';
const GOO_ID = 'fx-goo';

const noop = () => {};

// El estiramiento de los botones.
/** Distancia (px) desde el borde del botón a la que el puntero empieza a hacerlo ceder. */
const REACH = 140;
/**
 * Desplazamiento máximo en x o en y (px) y estiramiento máximo en x. Quedan por debajo de los
 * topes del diseño (10 px y 1.08): entre los dos botones hay 12 px y, con 6 px y 1.07, el que cede
 * avanza como mucho 6 + 5.5 = 11.5 px (el ghost, el más ancho): nunca pisa a su vecino.
 */
const MAX_MOVE = 6;
const MAX_STRETCH = 0.07;
/** Cuánto del desplazamiento del puntero (respecto del centro) se traduce en movimiento. */
const PULL = 0.12;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * El filtro: desenfoca la capa, endurece el canal alfa (todo lo que quedó por encima de ~45 % de
 * opacidad pasa a opaco, lo demás a transparente: ahí es donde dos burbujas cercanas se unen) y
 * pone los colores originales encima. `sRGB` evita que el desenfoque mezcle en espacio lineal
 * y vire los colores. La región del filtro es más grande que la capa para que no recorte.
 */
function gooFilter(): () => void {
  // Defensa: nunca dos filtros con el mismo id (el segundo quedaría sin efecto o pisaría al primero).
  document.getElementById(GOO_ID)?.closest('svg')?.remove();

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'fx-defs');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');

  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', GOO_ID);
  filter.setAttribute('x', '-20%');
  filter.setAttribute('y', '-20%');
  filter.setAttribute('width', '140%');
  filter.setAttribute('height', '140%');
  filter.setAttribute('color-interpolation-filters', 'sRGB');

  const blur = document.createElementNS(SVG_NS, 'feGaussianBlur');
  blur.setAttribute('in', 'SourceGraphic');
  blur.setAttribute('stdDeviation', '12');
  blur.setAttribute('result', 'blur');

  const threshold = document.createElementNS(SVG_NS, 'feColorMatrix');
  threshold.setAttribute('in', 'blur');
  threshold.setAttribute('mode', 'matrix');
  threshold.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9');
  threshold.setAttribute('result', 'goo');

  const paint = document.createElementNS(SVG_NS, 'feComposite');
  paint.setAttribute('in', 'SourceGraphic');
  paint.setAttribute('in2', 'goo');
  paint.setAttribute('operator', 'atop');

  filter.append(blur, threshold, paint);
  svg.append(filter);
  document.body.append(svg);
  return () => svg.remove();
}

/**
 * La capa de burbujas, primer hijo del hero. Se frena cuando el hero sale de la vista: el filtro
 * se vuelve a calcular en cada fotograma mientras algo se mueve debajo, y fuera de pantalla eso
 * sería trabajo perdido.
 */
function bubbles(): () => void {
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero) return noop;
  const layer = document.createElement('div');
  layer.className = 'fx-lava';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 4; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'fx-bubble';
    layer.append(bubble);
  }
  hero.prepend(layer);
  // La columna de la derecha solo existe mientras haya lugar a la derecha del texto (zone.ts).
  const fit = fitZone(hero, layer);

  // Si el navegador junta varios avisos de una vez, vale el último: es el estado actual del hero.
  const watcher = new IntersectionObserver((entries) => {
    layer.toggleAttribute('data-paused', !entries[entries.length - 1].isIntersecting);
  });
  watcher.observe(hero);
  return () => {
    fit();
    watcher.disconnect();
    layer.remove();
  };
}

/**
 * Los botones del hero ceden hacia el puntero. Todo es `transform` (x, y y scaleX) sobre el botón
 * mismo: no cambia el layout, el foco sigue siendo el del botón y el clic cae donde se ve. El
 * centro de referencia es el del botón quieto (a la caja actual se le resta lo que ya se movió),
 * así el estiramiento no se realimenta. Al alejarse, vuelve a `transform: none` de verdad
 * (`clearProps`), no a un `translate(0)`.
 */
function stretchButtons(gsap: Gsap): () => void {
  const hero = document.querySelector<HTMLElement>('.hero');
  const buttons = hero ? Array.from(hero.querySelectorAll<HTMLElement>('.btn')) : [];
  if (!hero || !buttons.length) return noop;

  // GSAP deja `translate: none; rotate: none; scale: none` inline al tomar el control del botón:
  // al soltarlo se quita, y con él el atributo style si quedó vacío.
  const tidy = (btn: HTMLElement) => {
    for (const prop of ['translate', 'rotate', 'scale']) btn.style.removeProperty(prop);
    if (!btn.getAttribute('style')) btn.removeAttribute('style');
  };
  const pulled = new Set<HTMLElement>();
  const release = (btn: HTMLElement) => {
    if (!pulled.delete(btn)) return;
    gsap.to(btn, {
      x: 0,
      y: 0,
      scaleX: 1,
      duration: 0.8,
      ease: 'elastic.out(1, 0.45)',
      overwrite: 'auto',
      clearProps: 'transform',
      onComplete: () => tidy(btn),
    });
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const probes = buttons.map((btn) => {
      const box = btn.getBoundingClientRect();
      const dx = e.clientX - (box.left + box.width / 2 - Number(gsap.getProperty(btn, 'x')));
      const dy = e.clientY - (box.top + box.height / 2 - Number(gsap.getProperty(btn, 'y')));
      // Distancia del puntero al borde del botón (0 si está encima).
      const gap = Math.hypot(
        Math.max(Math.abs(dx) - box.width / 2, 0),
        Math.max(Math.abs(dy) - box.height / 2, 0),
      );
      return { btn, dx, dy, gap };
    });
    // Cede solo el más cercano: con los dos tirando hacia el mismo puntero se pisarían (entre ellos
    // hay 12 px y cada uno puede avanzar casi todo eso).
    const nearest = probes.reduce((a, b) => (b.gap < a.gap ? b : a));
    for (const { btn, dx, dy, gap } of probes) {
      const near = btn === nearest.btn ? clamp(1 - gap / REACH, 0, 1) : 0;
      if (near === 0) {
        release(btn);
        continue;
      }
      pulled.add(btn);
      gsap.to(btn, {
        x: clamp(dx * PULL, -MAX_MOVE, MAX_MOVE) * near,
        y: clamp(dy * PULL, -MAX_MOVE, MAX_MOVE) * near,
        scaleX: 1 + MAX_STRETCH * near * Math.min(1, Math.abs(dx) / 60),
        duration: 0.4,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    }
  };
  const onLeave = () => buttons.forEach(release);
  hero.addEventListener('pointermove', onMove, { passive: true });
  hero.addEventListener('pointerleave', onLeave);
  return () => {
    hero.removeEventListener('pointermove', onMove);
    hero.removeEventListener('pointerleave', onLeave);
    gsap.killTweensOf(buttons);
    // Sin animación: el botón queda exactamente como lo dejó el CSS.
    gsap.set(buttons, { clearProps: 'transform' });
    buttons.forEach(tidy);
  };
}

const lava: Extra = ({ gsap, finePointer }) => {
  // El filtro va primero: la capa lo referencia por id.
  const parts = [gooFilter, bubbles, ...(finePointer ? [() => stretchButtons(gsap)] : [])];
  const offs: Array<() => void> = [];
  // Una pieza que falla no se lleva puestas a las otras.
  for (const start of parts) {
    try {
      offs.push(start());
    } catch (err) {
      console.error('[extras]', err);
    }
  }
  return () => dispose(offs);
};

export default lava;
