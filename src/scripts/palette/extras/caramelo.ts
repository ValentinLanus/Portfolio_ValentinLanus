import type { Gsap } from '../../motion/types';
import { visualClone } from '../a11y';
import { dispose } from '../dispose';
import type { Extra, ExtraCtx } from '../extras';
import { fitZone } from '../zone';

// Caramelo: golosina, todo rebota.
//   - Las letras del nombre hacen una ola con un resorte de motion: una por una, hacia arriba y de
//     vuelta con rebote. Corre al arrancar y cada vez que el mouse pasa por el nombre.
//   - Tres blobs de colores flotan detrás del hero (CSS en styles/extras.css; acá solo se crea la
//     capa).
//   - Con mouse, una estela de diez puntos sigue al puntero cada uno un poco más tarde.
// Qué comunica: la ola avisa quién es el protagonista de la página y le responde al que lo toca; los
// blobs y la estela son el color y el juego de la paleta, sin tapar texto (ver el CSS).

type Motion = typeof import('motion');

const noop = () => {};

// La ola. Cada letra sube `RISE` em y vuelve con rebote; las letras salen con `STAGGER` s entre sí.
const RISE = 0.2;
const STAGGER = 0.055;
const TILT = 5;
/** Después de una ola, el mouse tiene que esperar esto para disparar otra. */
const COOLDOWN_MS = 500;
/** Al cambiar a Caramelo la cortina todavía se está abriendo: la ola espera a que se vea. */
const SWITCH_LEAD_MS = 450;

// La estela.
const TRAIL_DOTS = 10;
const TRAIL_BASE_S = 0.12;
const TRAIL_STEP_S = 0.045;

/** Si la ola ya corrió en esta carga. Vive con el módulo: motion rearmando su contexto no la repite. */
let waved = false;

/** Un grafema por vez: una letra con tilde en forma descompuesta no se parte en dos. */
function graphemes(text: string): string[] {
  if ('Segmenter' in Intl)
    return Array.from(
      new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
      (s) => s.segment,
    );
  return Array.from(text);
}

/**
 * Parte una palabra del nombre en letras que se pueden mover (`inline-block`). Sin cuidado, el
 * texto cambiaría de lugar: entre dos `inline-block` no hay kerning ("Va" se separaría 10 px) y el
 * nombre se ensancharía al arrancar la ola y se angostaría al terminar. Por eso se mide dónde cae
 * cada letra en el texto original y se compensa la diferencia con un margen: la palabra mide lo
 * mismo antes, durante y después. El texto real queda intacto en un `span.visually-hidden`.
 */
function split(word: HTMLElement) {
  const textNode = word.childNodes.length === 1 ? word.firstChild : null;
  const letters = graphemes(word.textContent ?? '');
  const left = word.getBoundingClientRect().left;
  const want: number[] = [];
  if (textNode?.nodeType === Node.TEXT_NODE) {
    const range = document.createRange();
    let offset = 0;
    for (const letter of letters) {
      range.setStart(textNode, offset);
      range.setEnd(textNode, offset + letter.length);
      want.push(range.getBoundingClientRect().left - left);
      offset += letter.length;
    }
  }

  const { visual, restore } = visualClone(word);
  const chars = letters.map((letter) => {
    const char = document.createElement('span');
    char.className = 'fx-char';
    char.textContent = letter;
    return char;
  });
  visual.replaceChildren(...chars);

  if (want.length === chars.length) {
    // Primero se mide todo (sin tocar nada) y después se escribe: nada de leer y escribir a la vez.
    const got = chars.map((char) => char.getBoundingClientRect().left - left);
    let applied = 0;
    chars.forEach((char, i) => {
      const shift = want[i] - got[i];
      if (Math.abs(shift - applied) > 0.01) char.style.marginLeft = `${shift - applied}px`;
      applied = shift;
    });
  }
  return { chars, restore };
}

/**
 * La ola del nombre. Corre sobre las letras ya visibles, sin ocultarlas ni desarmarlas antes: lo que
 * el usuario está leyendo no desaparece para volver a aparecer.
 */
function nameWave({ reason, finePointer }: ExtraCtx): () => void {
  const title = document.querySelector<HTMLElement>('#hero-title');
  const words = title ? Array.from(title.querySelectorAll<HTMLElement>('.line__inner')) : [];
  if (!title || !words.length) return noop;

  let alive = true;
  let running = false;
  let lastEnd = Number.NEGATIVE_INFINITY;
  let motion: Motion | null = null;
  let lead: number | undefined;
  let undo: Array<() => void> = [];
  const playing = new Set<{ cancel: () => void }>();

  /** Deja el nombre como estaba: sin animaciones, sin letras sueltas, sin texto escondido. */
  const finish = () => {
    if (!running) return;
    running = false;
    lastEnd = performance.now();
    playing.forEach((animation) => animation.cancel());
    playing.clear();
    const offs = undo;
    undo = [];
    dispose(offs);
    title.classList.remove('fx-wave');
  };

  const bounce = async ({ animate }: Motion, char: HTMLElement, order: number, rise: number) => {
    const tilt = order % 2 ? TILT : -TILT;
    const up = animate(
      char,
      { y: -rise, rotate: tilt },
      { type: 'spring', stiffness: 520, damping: 24, delay: order * STAGGER },
    );
    playing.add(up);
    await up;
    if (!running) return;
    // La vuelta es un resorte flojo: pasa de largo la línea de base y rebota hasta quedarse.
    const down = animate(char, { y: 0, rotate: 0 }, { type: 'spring', stiffness: 230, damping: 7 });
    playing.add(down);
    await down;
  };

  const wave = async () => {
    if (!alive || running || !motion) return;
    running = true;
    // Las letras suben por encima de la línea: el recorte de `.line` (para la entrada) se levanta.
    title.classList.add('fx-wave');
    try {
      const jumps: Array<[HTMLElement, number]> = [];
      for (const word of words) {
        const rise = parseFloat(getComputedStyle(word).fontSize) * RISE;
        const parts = split(word);
        undo.push(parts.restore);
        for (const char of parts.chars) jumps.push([char, rise]);
      }
      await Promise.all(jumps.map(([char, rise], i) => bounce(motion!, char, i, rise)));
    } finally {
      finish();
    }
  };

  /** Se resuelve cuando termina la entrada CSS del nombre (enseguida, si ya terminó). */
  const entranceDone = () =>
    Promise.all(
      words.flatMap((word) => word.getAnimations().map((a) => a.finished.catch(() => null))),
    );

  // El mouse puede entrar mientras el nombre todavía sube (la entrada dura ~1.2 s): la ola espera a
  // que termine, igual que la del arranque. Si empezara antes, se levantaría el recorte de `.line`
  // (que esconde la palabra mientras sube) y se la vería asomar sin recortar.
  let pending = false;
  const onEnter = async () => {
    if (running || pending || performance.now() - lastEnd < COOLDOWN_MS) return;
    pending = true;
    try {
      await entranceDone();
      // El puntero pudo irse mientras tanto: sin nadie encima no hay a quién responderle.
      if (alive && title.matches(':hover')) await wave();
    } finally {
      pending = false;
    }
  };
  const onPointerEnter = () => void onEnter().catch((err) => console.error('[extras]', err));
  if (finePointer) title.addEventListener('pointerenter', onPointerEnter);

  // Se espera a que termine la entrada CSS del nombre (si la carga fue lenta, todavía está subiendo)
  // y, al cambiar de paleta, a que la cortina se abra. Si el nombre quedó fuera de la vista (recarga
  // a mitad de página) no hay nada que ver y la ola no corre.
  const start = async () => {
    motion = await import('motion');
    if (!alive) return;
    const { top, bottom } = title.getBoundingClientRect();
    const visible = bottom > 0 && top < innerHeight;
    if (!visible || (reason === 'load' && waved)) return;
    await entranceDone();
    if (reason === 'switch')
      await new Promise((resolve) => {
        lead = window.setTimeout(resolve, SWITCH_LEAD_MS);
      });
    if (!alive) return;
    waved = true;
    await wave();
  };
  start().catch((err) => console.error('[extras]', err));

  return () => {
    alive = false;
    clearTimeout(lead);
    title.removeEventListener('pointerenter', onPointerEnter);
    finish();
  };
}

/** Tres blobs detrás del hero. Decorativos: sin puntero, sin lector de pantalla. */
function blobs(): () => void {
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero) return noop;
  const layer = document.createElement('div');
  layer.className = 'fx-blobs';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    const blob = document.createElement('div');
    blob.className = 'fx-blob';
    layer.append(blob);
  }
  hero.prepend(layer);
  // La columna de la derecha solo existe mientras haya lugar a la derecha del texto (zone.ts).
  const fit = fitZone(hero, layer);
  return () => {
    fit();
    layer.remove();
  };
}

/**
 * Diez puntos que siguen al puntero. Cada uno va un poco más atrás que el anterior: lo que cambia
 * es cuánto tarda en llegar (`quickTo` con una duración mayor), no el momento en que sale. Se
 * ocultan cuando el puntero sale de la ventana y reaparecen junto a él, sin cruzar la pantalla.
 */
function trail(gsap: Gsap): () => void {
  const dots = Array.from({ length: TRAIL_DOTS }, (_, i) => {
    const dot = document.createElement('div');
    dot.className = 'fx-trail';
    dot.dataset.tone = i % 2 ? 'b' : 'a';
    dot.style.setProperty('--i', String(i));
    dot.setAttribute('aria-hidden', 'true');
    return dot;
  });
  document.body.append(...dots);
  // El punto se centra en su posición con xPercent/yPercent: x e y son la del puntero.
  gsap.set(dots, { xPercent: -50, yPercent: -50 });
  const follow = dots.map((dot, i) => {
    const options = { duration: TRAIL_BASE_S + i * TRAIL_STEP_S, ease: 'power3.out' };
    return [gsap.quickTo(dot, 'x', options), gsap.quickTo(dot, 'y', options)] as const;
  });

  let shown = false;
  const hide = () => {
    shown = false;
    dots.forEach((dot) => dot.removeAttribute('data-on'));
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    // La primera vez (y la primera tras salir de la ventana) los puntos aparecen ya junto al puntero:
    // se les da el mismo valor de partida y de llegada. quickTo calcula el valor actual con su propio
    // recorrido, no leyendo el estilo, así que sin esto saldrían desde donde quedaron.
    const start = shown ? undefined : e.clientX;
    const startY = shown ? undefined : e.clientY;
    if (!shown) {
      shown = true;
      dots.forEach((dot) => dot.setAttribute('data-on', ''));
    }
    for (const [x, y] of follow) {
      x(e.clientX, start);
      y(e.clientY, startY);
    }
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('mouseleave', hide);
  return () => {
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('mouseleave', hide);
    gsap.killTweensOf(dots);
    dots.forEach((dot) => dot.remove());
  };
}

const caramelo: Extra = (ctx) => {
  const parts = [() => nameWave(ctx), blobs, ...(ctx.finePointer ? [() => trail(ctx.gsap)] : [])];
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

export default caramelo;
