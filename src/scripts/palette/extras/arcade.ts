import type { Gsap, ScrollTriggerT } from '../../motion/types';
import { visualClone } from '../a11y';
import { noop, startParts } from '../dispose';
import type { Extra, ExtraCtx } from '../extras';

// Arcade: la pantalla de una consola de 8 bits.
//   - Scanlines fijas sobre todo el sitio (CSS en styles/extras.css; acá solo se crea la capa).
//   - La barra de progreso es una barra de energía: bloques, no una línea continua.
//   - El primer dato numérico de Lotecito cuenta como un marcador: de 0 a su valor, a saltos.
// Los tres son livianos y corren también en mobile.

const COUNT_SECONDS = 0.96;
const MAX_TICKS = 24;

/** Datos que ya contaron. Vive con el módulo: al volver a Arcade no se repite. */
const counted = new WeakSet<Element>();

/** Capa de scanlines. Decorativa y sin puntero: los clics y el foco la atraviesan. */
function scanlines(): () => void {
  const layer = document.createElement('div');
  layer.className = 'fx-scanlines';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  return () => layer.remove();
}

/**
 * La barra crece con `scaleX` (motion/progress.ts), que también estira su máscara. Para que los
 * bloques midan siempre lo mismo en pantalla, el CSS divide su ancho por --p (el progreso, 0 a 1);
 * acá se mantiene ese número al día con un trigger que cubre el mismo recorrido que el scrub.
 */
function blockBar(ScrollTrigger: ScrollTriggerT): () => void {
  const bar = document.querySelector<HTMLElement>('[data-progress]');
  if (!bar) return noop;
  const paint = (progress: number) =>
    bar.style.setProperty('--p', Math.max(progress, 0.001).toFixed(4));
  const trigger = ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => paint(self.progress),
    onRefresh: (self) => paint(self.progress),
  });
  paint(trigger.progress);
  bar.classList.add('progress--blocks');
  return () => {
    trigger.kill();
    bar.classList.remove('progress--blocks');
    bar.style.removeProperty('--p');
  };
}

/** "24 migraciones..." -> cuenta el 24 al entrar en la vista, con el número ya en 00 desde antes. */
function countUp({ gsap, ScrollTrigger, revealed }: ExtraCtx, item: HTMLElement): () => void {
  const parts = /^(\d+)([\s\S]*)$/.exec((item.textContent ?? '').trim());
  const target = parts ? Number(parts[1]) : 0;
  if (!parts || target <= 0 || counted.has(item)) return noop;

  // Se rellena con ceros hasta los dígitos finales: el marcador no cambia de ancho al contar.
  const pad = (n: number) => String(n).padStart(parts[1].length, '0');
  const { visual, restore } = visualClone(item);
  const number = document.createElement('span');
  number.className = 'fx-num';
  number.textContent = pad(0);
  visual.replaceChildren(number, parts[2]);

  let ended = false;
  let tween: ReturnType<Gsap['to']> | null = null;
  const end = () => {
    ended = true;
    trigger.kill();
    tween?.kill();
    restore();
  };
  const trigger = ScrollTrigger.create({
    trigger: item,
    start: 'top 90%',
    once: true,
    // Un dato que ya se ve al cambiar a Arcade cuenta cuando la cortina se va.
    onEnter: () =>
      void revealed.then(() => {
        if (ended) return;
        counted.add(item);
        const state = { n: 0 };
        tween = gsap.to(state, {
          n: target,
          duration: COUNT_SECONDS,
          // Saltos de a uno: el número nunca queda "a medio camino".
          ease: `steps(${Math.min(target, MAX_TICKS)})`,
          onUpdate: () => {
            const shown = pad(Math.round(state.n));
            if (number.textContent !== shown) number.textContent = shown;
          },
          onComplete: end,
        });
      }),
  });
  return end;
}

const arcade: Extra = (ctx) => {
  const facts = Array.from(document.querySelectorAll<HTMLElement>('.facts li'));
  return startParts([
    scanlines,
    () => blockBar(ctx.ScrollTrigger),
    ...facts.map((item) => () => countUp(ctx, item)),
  ]);
};

export default arcade;
