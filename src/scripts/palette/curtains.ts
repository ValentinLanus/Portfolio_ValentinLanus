import type { PaletteId } from './palettes';

// Las cortinas tapan el cambio de paleta: cubren la pantalla, `swap()` cambia la paleta por
// debajo y se van. Cada paleta tiene la suya, con su personalidad (ver PERSONALITY en palettes.ts).
//
//   - Se anima con `animate` de motion (import dinámico: este módulo y motion solo se bajan al
//     cambiar de paleta). Nunca `animateView`: inyecta un <style> y la CSP lo bloquea.
//   - Todo se puede cancelar con la señal que da el controlador: si una cortina se cuelga, él
//     sigue sin ella y la señal le avisa que se saque del DOM (si no, el velo taparía la página).
//   - Colores y medidas fijas viven en styles/curtains.css. Acá solo geometría que depende del
//     tamaño de la pantalla o del botón desde donde se abre.
//   - Cubrir + descubrir tarda entre 700 y 830 ms según la paleta (tope de 900).

type Origin = { x: number; y: number };
type Motion = typeof import('motion');
type Keyframes = Parameters<Motion['animate']>[1];
type Options = NonNullable<Parameters<Motion['animate']>[2]>;

interface Stage {
  root: HTMLElement;
  /** Anima y se resuelve al terminar. Lo que quede corriendo se cancela al retirar la cortina. */
  play: (targets: Element | Element[], keyframes: Keyframes, options: Options) => Promise<void>;
  /** Para lo que tiene que seguir andando cuando la cortina ya se fue (el confeti). */
  animate: Motion['animate'];
  stagger: Motion['stagger'];
  /** Centro del botón que se tocó (o de la pantalla), en coordenadas de la ventana. */
  origin: Origin;
  /** Medidas de la ventana y distancia del origen a la esquina más lejana. */
  width: number;
  height: number;
  reach: number;
  /** Cambia la paleta. Se llama una sola vez, con la pantalla tapada. */
  swap: () => void;
  /** False cuando el controlador canceló la cortina. */
  alive: () => boolean;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  tone?: number,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (tone !== undefined) node.dataset.tone = String(tone);
  return node;
}

function shuffled(count: number) {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// ---------------------------------------------------------------------------------------------
// Terminal: ocho barras que crecen desde la izquierda y se retiran por la derecha.
// ---------------------------------------------------------------------------------------------
async function terminal({ root, play, stagger, swap, alive }: Stage) {
  const bars = Array.from({ length: 8 }, () => el('div', 'curtain__bar'));
  root.append(...bars);
  const cascade = stagger(0.025);

  await play(
    bars,
    { transform: ['translateX(-101%)', 'translateX(0%)'] },
    { duration: 0.2, delay: cascade, ease: [0.2, 0.7, 0, 1] },
  );
  if (!alive()) return;
  swap();
  await play(
    bars,
    { transform: ['translateX(0%)', 'translateX(101%)'] },
    { duration: 0.2, delay: cascade, ease: [0.7, 0, 0.9, 0.5] },
  );
}

// ---------------------------------------------------------------------------------------------
// Arcade: una grilla de bloques que aparecen a saltos, en orden aleatorio, y se van igual.
// ---------------------------------------------------------------------------------------------
async function arcade({ root, play, swap, alive, width, height }: Stage) {
  // Bloques cuadrados de px enteros (sin costuras): unas 12 columnas en escritorio, 6 en mobile.
  const columns = clamp(Math.round(width / 110), 6, 14);
  const cell = Math.ceil(width / columns);
  const rows = Math.ceil(height / cell);
  root.style.gridTemplateColumns = `repeat(${columns}, ${cell}px)`;
  root.style.gridTemplateRows = `repeat(${rows}, ${cell}px)`;

  const blocks = Array.from({ length: columns * rows }, () => {
    const r = Math.random();
    return el('div', 'curtain__block', r < 0.42 ? 0 : r < 0.62 ? 1 : r < 0.84 ? 2 : 3);
  });
  root.append(...blocks);

  // Cada bloque tiene un turno: salen todos dentro de 300 ms, sin tween (un salto de 40 ms).
  const turn = (order: number[]) => (i: number) => (order[i] / blocks.length) * 0.3;
  const pop = { duration: 0.04, ease: 'linear' } as const;

  await play(blocks, { opacity: [0, 1] }, { ...pop, delay: turn(shuffled(blocks.length)) });
  if (!alive()) return;
  swap();
  await play(blocks, { opacity: [1, 0] }, { ...pop, delay: turn(shuffled(blocks.length)) });
}

// ---------------------------------------------------------------------------------------------
// Caramelo: un círculo que se abre desde el botón con rebote; al irse suelta confeti.
// ---------------------------------------------------------------------------------------------
const CONFETTI_PIECES = 36;

async function caramelo(stage: Stage) {
  const { root, play, swap, alive, origin, reach } = stage;
  root.style.setProperty('--x', `${origin.x}px`);
  root.style.setProperty('--y', `${origin.y}px`);
  const rim = el('div', 'curtain__disc');
  const core = el('div', 'curtain__disc curtain__disc--core');
  root.append(rim, core);

  const circle = (radius: number) =>
    `circle(${Math.round(radius)}px at ${origin.x}px ${origin.y}px)`;
  const full = reach * 1.05;
  // Radios como fracción de `full`, un valor por fotograma clave.
  const radii = (steps: number[]) => ({ clipPath: steps.map((t) => circle(t * full)) });
  // Los dos discos hacen lo mismo; el de adentro rebota un poco más chico y deja un aro de
  // --accent-2 al frente. Los tramos van de salida rápida a freno (easeOut) y a la inversa.
  const eases = [[0.2, 0.8, 0.3, 1], 'easeInOut', 'easeIn'] as Options['ease'];

  // Se abre con rebote: llega al 62 %, se recoge al 50 % y recién ahí inunda la pantalla.
  const open = { duration: 0.38, times: [0, 0.38, 0.62, 1], ease: eases };
  await Promise.all([
    play(rim, radii([0, 0.62, 0.5, 1]), open),
    play(core, radii([0, 0.56, 0.45, 1]), open),
  ]);
  if (!alive()) return;
  swap();

  // Se cierra sobre el botón, también con rebote: la página aparece desde los bordes y el
  // confeti sale del botón. Primero se va el disco de adentro, después el aro.
  const close = { duration: 0.3, times: [0, 0.35, 0.62, 1], ease: eases };
  const leaving = Promise.all([
    play(core, radii([1, 0.46, 0.56, 0]), close),
    play(rim, radii([1, 0.5, 0.6, 0]), { ...close, delay: 0.04 }),
  ]);
  // El confeti no frena nada: no se espera.
  void confetti(stage);
  await leaving;
}

/** Papelitos con los colores de la paleta que salen del botón y caen. Se limpian solos. */
async function confetti({ animate, origin, height, alive }: Stage) {
  if (!alive()) return;
  const layer = el('div', 'confetti');
  layer.dataset.palette = 'caramelo';
  layer.setAttribute('aria-hidden', 'true');
  // Desde arriba (el botón está en la barra) se tira hacia abajo; desde abajo, hacia arriba.
  const down = origin.y < height * 0.4;
  const pieces = Array.from({ length: CONFETTI_PIECES }, (_, i) => {
    const piece = el('i', 'confetti__piece', i % 3);
    const round = i % 4 === 0; // uno de cada cuatro es redondo; el resto, tiras
    const side = Math.round(rand(8, 12));
    if (round) piece.dataset.round = '';
    piece.style.left = `${origin.x}px`;
    piece.style.top = `${origin.y}px`;
    piece.style.width = `${side}px`;
    piece.style.height = `${round ? side : Math.round(rand(14, 20))}px`;
    return piece;
  });
  layer.append(...pieces);
  document.body.append(layer);

  const finished = pieces.map((piece) => {
    // Abanico de 160 grados hacia donde se tira, con la fuerza al azar.
    const angle = ((down ? 10 : 190) + rand(0, 160)) * (Math.PI / 180);
    const force = rand(110, 340);
    const burstX = Math.cos(angle) * force;
    const burstY = Math.sin(angle) * force;
    const spin = rand(-540, 540);
    const at = (x: number, y: number, turns: number) =>
      `translate(${Math.round(x)}px, ${Math.round(y)}px) rotate(${Math.round(turns)}deg)`;
    return animate(
      piece,
      {
        transform: [
          at(0, 0, 0),
          at(burstX, burstY, spin / 2),
          at(burstX + rand(-70, 70), burstY + rand(260, 460), spin),
        ],
        opacity: [1, 1, 0],
      },
      {
        duration: rand(1.1, 1.6),
        delay: 0.12 + rand(0, 0.1),
        times: [0, 0.3, 1],
        ease: ['easeOut', 'easeIn'],
      },
    );
  });
  // Pase lo que pase, a los 4 s no queda nada.
  const failsafe = setTimeout(() => layer.remove(), 4000);
  await Promise.allSettled(finished);
  clearTimeout(failsafe);
  layer.remove();
}

// ---------------------------------------------------------------------------------------------
// Lava: una gota de borde ondulante que crece desde el botón hasta cubrir y después se escurre.
// ---------------------------------------------------------------------------------------------
const BLOB_POINTS = 200;
const BLOB_MIN = 0.8; // el borde ondula entre este radio (relativo al máximo) y 1

/** Radio del borde en la dirección `a`, relativo al máximo. `phase` hace correr las ondas. */
const wobble = (a: number, phase: number) =>
  0.9 + 0.07 * Math.sin(6 * a + phase) + 0.03 * Math.sin(3 * a + 2 * phase);

/** Polígono de una gota de radio máximo `radius` centrada en (cx, cy). */
function blob(cx: number, cy: number, radius: number, phase: number) {
  const points: string[] = [];
  for (let k = 0; k < BLOB_POINTS; k++) {
    const a = (k / BLOB_POINTS) * Math.PI * 2;
    const r = radius * wobble(a, phase);
    points.push(`${(cx + r * Math.cos(a)).toFixed(1)}px ${(cy + r * Math.sin(a)).toFixed(1)}px`);
  }
  return `polygon(${points.join(',')})`;
}

async function lava({ root, play, swap, alive, origin, width, height, reach }: Stage) {
  // Tres gotas, de afuera hacia adentro: naranja, magenta y ciruela. Con el radio máximo hasta el
  // punto más bajo del borde llega a la esquina más lejana: la pantalla queda tapada.
  const layers = [0, 1, 2].map((tone) => el('div', 'curtain__blob', tone));
  root.append(...layers);
  const max = reach / BLOB_MIN;
  const samples = Array.from({ length: 12 }, (_, j) => j / 11);
  const phaseOf = (i: number) => i * 2.1;

  // Crece rápido y se frena al llegar, como algo espeso; las ondas corren por el borde.
  const grow = (i: number) =>
    samples.map((p) =>
      blob(origin.x, origin.y, max * (1 - Math.pow(1 - p, 2)), phaseOf(i) + p * 2.4),
    );
  await Promise.all(
    layers.map((layer, i) =>
      play(layer, { clipPath: grow(i) }, { duration: 0.3, delay: i * 0.05, ease: 'linear' }),
    ),
  );
  if (!alive()) return;
  swap();

  // Se escurre hacia abajo acelerando, como una gota que cae. Sale primero la capa de adentro:
  // los aros de color quedan a la vista. El recorrido empieza cuando la gota deja de tapar una
  // esquina (antes sería tiempo perdido: es mucho más grande que la pantalla).
  const end = height - origin.y + max * 1.02;
  const drain = (i: number) => {
    const phase = phaseOf(i) + 2.4;
    const start = firstGap(origin, max, phase, width, height);
    return samples.map((p) =>
      blob(origin.x, origin.y + start + (end - start) * Math.pow(p, 1.4), max, phase + p * 1.6),
    );
  };
  await Promise.all(
    layers.map((layer, i) =>
      play(
        layer,
        { clipPath: drain(i) },
        { duration: 0.28, delay: (layers.length - 1 - i) * 0.05, ease: 'linear' },
      ),
    ),
  );
}

/** Cuánto hay que bajar la gota (ya abierta del todo) para que deje de tapar alguna esquina. */
function firstGap(origin: Origin, max: number, phase: number, width: number, height: number) {
  const corners = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ];
  for (let shift = 0; shift < height + max; shift += 10) {
    const open = corners.some(([x, y]) => {
      const dx = x - origin.x;
      const dy = y - origin.y - shift;
      return Math.hypot(dx, dy) > max * wobble(Math.atan2(dy, dx), phase);
    });
    if (open) return shift;
  }
  return 0;
}

// ---------------------------------------------------------------------------------------------
// Atardecer: surcos diagonales que barren la pantalla.
// ---------------------------------------------------------------------------------------------
// Surcos alternados: ámbar, coral, ciruela, coral, ámbar... (tonos: 0 ciruela, 1 coral, 2 ámbar).
const STRIP_TONES = [2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1];
const TILT = 24; // grados: los surcos suben inclinados hacia la derecha

async function atardecer({ root, play, stagger, swap, alive, width, height }: Stage) {
  // Un rectángulo girado cubre la pantalla si mide lo que ella mide proyectada sobre sus ejes:
  // a lo ancho de los surcos y a lo largo de ellos. Ni un píxel de más: cada surco recorre solo
  // lo necesario y no hay tiempo perdido con la pantalla ya tapada o ya libre.
  const tilt = (TILT * Math.PI) / 180;
  const across = width * Math.cos(tilt) + height * Math.sin(tilt) + 8;
  const along = height * Math.cos(tilt) + width * Math.sin(tilt) + 8;
  root.style.setProperty('--tilt', `${TILT}deg`);
  root.style.setProperty('--across', `${Math.ceil(across)}px`);
  root.style.setProperty('--along', `${Math.ceil(along)}px`);
  root.style.setProperty('--strips', String(STRIP_TONES.length));
  const furrows = el('div', 'curtain__furrows');
  const strips = STRIP_TONES.map((tone) => el('div', 'curtain__strip', tone));
  furrows.append(...strips);
  root.append(furrows);
  const sweep = stagger(0.016);

  await play(
    strips,
    { transform: ['translateY(101%)', 'translateY(0%)'] },
    { duration: 0.2, delay: sweep, ease: [0.3, 0.6, 0.2, 1] },
  );
  if (!alive()) return;
  swap();
  await play(
    strips,
    { transform: ['translateY(0%)', 'translateY(-101%)'] },
    { duration: 0.2, delay: sweep, ease: [0.55, 0, 0.8, 0.45] },
  );
}

const CURTAINS: Record<PaletteId, (stage: Stage) => Promise<void>> = {
  terminal,
  arcade,
  caramelo,
  lava,
  atardecer,
};

/**
 * Tapa la pantalla con la cortina de `id`, llama a `swap` con todo cubierto y la retira. Se
 * resuelve cuando la cortina ya no está en el DOM. Si `signal` se cancela, se detiene y se quita.
 */
export async function playCurtain(
  id: PaletteId,
  origin: Origin,
  swap: () => void,
  signal?: AbortSignal,
): Promise<void> {
  // Restos de una cortina o un confeti anterior: nunca hay dos.
  document.querySelectorAll('.curtain, .confetti').forEach((node) => node.remove());
  const { animate, stagger } = await import('motion');
  if (signal?.aborted) return;

  const root = el('div', `curtain curtain--${id}`);
  root.dataset.palette = id;
  root.setAttribute('aria-hidden', 'true');
  document.body.append(root);

  const running = new Set<{ cancel: () => void }>();
  const retire = () => {
    running.forEach((animation) => animation.cancel());
    running.clear();
    root.remove();
  };
  signal?.addEventListener('abort', retire, { once: true });

  const { width, height } = root.getBoundingClientRect();
  const stage: Stage = {
    root,
    play: async (targets, keyframes, options) => {
      const animation = animate(targets, keyframes, options);
      running.add(animation);
      await animation;
      running.delete(animation);
    },
    animate,
    stagger,
    origin,
    width,
    height,
    reach: Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y)),
    swap,
    alive: () => !signal?.aborted,
  };

  try {
    await CURTAINS[id](stage);
  } finally {
    signal?.removeEventListener('abort', retire);
    retire();
  }
}
