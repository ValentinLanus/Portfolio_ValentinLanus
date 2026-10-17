import type { MotionModule } from './types';

// Excepción documentada: anima `color` (no transform/opacity) en ~100 spans de texto. Piso de color = --text-3 (AA).
export const about: MotionModule = (gsap, _st, { desktop }) => {
  const section = document.querySelector<HTMLElement>('[data-about]');
  if (!section) return;
  if (desktop) {
    // El piso se lee del token de la paleta activa: un gris fijo no llega a AA sobre Arcade ni Caramelo.
    const floor = getComputedStyle(document.documentElement).getPropertyValue('--text-3').trim();
    gsap.from(section.querySelectorAll('.w'), {
      color: floor,
      stagger: 0.1,
      ease: 'none',
      scrollTrigger: {
        trigger: section.querySelector('.about__body'),
        start: 'top 75%',
        end: 'bottom 55%',
        scrub: true,
      },
    });
    return;
  }
  section.querySelectorAll('[data-about-p]').forEach((p) =>
    gsap.from(p, {
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: p, start: 'top 85%', once: true },
    }),
  );
};
