import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import type { Gsap, ScrollTriggerT } from '../../motion/types';
import { visualClone } from '../a11y';
import type { Extra } from '../extras';

// Terminal: el sitio se comporta como una consola.
//   - El rol del hero se escribe a mano, con un cursor de bloque que se queda al terminar.
//   - Cada título de sección se descifra de izquierda a derecha cuando entra en la vista.
// Qué comunica: que el que escribe es una persona (ritmo irregular) y qué viene después (cada
// título se "resuelve" justo al llegar a él). Los dos efectos pasan por visualClone: el texto
// real nunca se rompe para un lector de pantalla.

const TYPE_MIN_MS = 35;
const TYPE_MAX_MS = 95;
const SCRAMBLE_SECONDS = 0.8;
// La tira del descifrado es `01<>/_`. El plugin está pensado para escribir con innerHTML: por eso
// convierte `<` y `>` de la tira en "&lt;" y "&gt;" y los corta por posición, y sobre un nodo de
// texto (donde no hay marcado) esos pedazos se verían crudos ("&l", "t;"). Se le piden dos
// sustitutos de un solo carácter y se cambian por los reales apenas dibuja (ver `decipher`).
const [LT, GT] = ['‹', '›'];
const SCRAMBLE_CHARS = `01${LT}${GT}/_`;
const unmask = (s: string) => s.replaceAll(LT, '<').replaceAll(GT, '>');

const noop = () => {};
const random = (min: number, max: number) => min + Math.random() * (max - min);

/** Títulos que ya se descifraron. Vive con el módulo: al volver a Terminal no se repite. */
const deciphered = new WeakSet<Element>();

/** Cuánto falta para que termine el retraso de la animación CSS de entrada del elemento. */
function entryDelay(el: HTMLElement) {
  let ms = 0;
  for (const animation of el.getAnimations()) {
    const delay = Number(animation.effect?.getComputedTiming().delay ?? 0);
    ms = Math.max(ms, delay - Number(animation.currentTime ?? 0));
  }
  return Math.max(0, ms);
}

/**
 * Escribe el rol del hero. Mientras tanto, la copia visible lleva tres tramos: lo escrito, el
 * cursor y el resto invisible (`.fx-rest`). El resto reserva el lugar de las líneas que faltan,
 * así que nada de lo que está debajo se mueve ni se reacomoda. Al terminar se devuelve el texto
 * original (los mismos nodos) y el cursor se queda al final.
 */
function typeRole(): () => void {
  const role = document.querySelector<HTMLElement>('.hero__role');
  const text = role?.textContent ?? '';
  if (!role || !text) return noop;

  const caret = document.createElement('span');
  caret.className = 'fx-caret';
  caret.setAttribute('aria-hidden', 'true');

  let restore: (() => void) | null = null;
  let timer: number | undefined;

  const finish = () => {
    restore?.();
    restore = null;
    caret.removeAttribute('data-typing');
    role.append(caret);
  };
  const off = () => {
    clearTimeout(timer);
    restore?.();
    restore = null;
    caret.remove();
  };

  // Si el rol ya quedó fuera de la vista (se recargó a mitad de página), se muestra completo.
  const { top, bottom } = role.getBoundingClientRect();
  if (bottom < 0 || top > innerHeight) {
    finish();
    return off;
  }

  const clone = visualClone(role);
  restore = clone.restore;
  const typed = document.createElement('span');
  typed.className = 'fx-typed';
  const rest = document.createElement('span');
  rest.className = 'fx-rest';
  rest.textContent = text;
  caret.setAttribute('data-typing', '');
  clone.visual.replaceChildren(typed, caret, rest);

  const chars = Array.from(text);
  let written = 0;
  const step = () => {
    written++;
    typed.textContent = chars.slice(0, written).join('');
    rest.textContent = chars.slice(written).join('');
    // Tras el último carácter, un compás más antes de que el cursor empiece a titilar.
    timer = window.setTimeout(
      written >= chars.length ? finish : step,
      random(TYPE_MIN_MS, TYPE_MAX_MS),
    );
  };
  // El primer carácter espera a que el rol termine de aparecer (su entrada CSS tiene retraso).
  timer = window.setTimeout(step, entryDelay(role));
  return off;
}

/** Descifra un título: la copia visible pasa por caracteres al azar y se resuelve a su texto. */
function decipher(gsap: Gsap, title: HTMLElement): () => void {
  deciphered.add(title);
  const text = (title.textContent ?? '').trim();
  const { height, bottom } = title.getBoundingClientRect();
  // Si el lector ya pasó de largo (carga a mitad de página), no hay nada que ver.
  if (!text || bottom < 0) return noop;

  const { visual, restore } = visualClone(title);
  // Los caracteres al azar no miden lo mismo que las letras: la altura se fija mientras dura.
  title.style.minHeight = `${height}px`;
  let done = false;
  const end = () => {
    if (done) return;
    done = true;
    tween.kill();
    restore();
    title.style.removeProperty('min-height');
  };
  // Sobre el nodo de texto el plugin escribe con textContent: nunca se interpreta marcado.
  const node = visual.firstChild as Text;
  const tween = gsap.to(node, {
    duration: SCRAMBLE_SECONDS,
    ease: 'none',
    scrambleText: { text, chars: SCRAMBLE_CHARS },
    // Corre justo después de que el plugin escribe y antes de pintar: nunca se ven los sustitutos.
    onUpdate: () => {
      node.nodeValue = unmask(node.nodeValue ?? '');
    },
    onComplete: end,
  });
  return end;
}

function decipherTitles(gsap: Gsap, ScrollTrigger: ScrollTriggerT): () => void {
  const offs: Array<() => void> = [];
  document.querySelectorAll<HTMLElement>('h2.section__title').forEach((title) => {
    if (deciphered.has(title)) return;
    let stop = noop;
    const trigger = ScrollTrigger.create({
      trigger: title,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        stop = decipher(gsap, title);
      },
    });
    offs.push(() => {
      trigger.kill();
      stop();
    });
  });
  return () => offs.forEach((off) => off());
}

const terminal: Extra = ({ gsap, ScrollTrigger }) => {
  gsap.registerPlugin(ScrambleTextPlugin);
  const offs: Array<() => void> = [];
  // Un efecto que falla no se lleva puesto al otro.
  for (const start of [typeRole, () => decipherTitles(gsap, ScrollTrigger)]) {
    try {
      offs.push(start());
    } catch (err) {
      console.error('[extras]', err);
    }
  }
  return () => offs.forEach((off) => off());
};

export default terminal;
