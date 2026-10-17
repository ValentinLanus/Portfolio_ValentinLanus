import { personality } from '../palette/palettes';
import type { Gsap, ScrollTriggerT } from './types';

export interface RevealOpts {
  trigger: Element;
  start?: string;
  desktop: boolean;
  /** false: solo opacidad (pasos de Lotecito, párrafos de "Sobre mí"). */
  move?: boolean;
  refreshPriority?: number;
}

/**
 * Entrada de sección con la personalidad de la paleta activa, leída al momento de revelarse:
 * cambiar de paleta afecta a lo que todavía no entró. Lo ya revelado (`data-revealed`) no se
 * vuelve a ocultar si el módulo se reinicia. El cleanup deja los targets visibles.
 */
export function reveal(
  gsap: Gsap,
  ScrollTrigger: ScrollTriggerT,
  targets: HTMLElement[],
  opts: RevealOpts,
): () => void {
  const pending = targets.filter((t) => !t.hasAttribute('data-revealed'));
  if (!pending.length) return () => {};
  gsap.set(pending, { opacity: 0 });

  let tween: ReturnType<Gsap['fromTo']> | null = null;
  const trigger = ScrollTrigger.create({
    trigger: opts.trigger,
    start: opts.start ?? 'top 80%',
    once: true,
    refreshPriority: opts.refreshPriority,
    onEnter: () => {
      pending.forEach((t) => t.setAttribute('data-revealed', ''));
      const p = personality();
      const y = opts.desktop && opts.move !== false ? p.y : 0;
      tween = gsap.fromTo(
        pending,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          ease: p.ease,
          duration: p.duration,
          stagger: p.stagger,
          clearProps: 'transform',
        },
      );
    },
  });

  return () => {
    trigger.kill();
    tween?.kill();
    gsap.set(pending, { clearProps: 'opacity,transform' });
  };
}
