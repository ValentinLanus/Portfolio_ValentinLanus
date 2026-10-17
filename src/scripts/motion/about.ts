import { PALETTE_EVENT } from '../palette/palettes';
import { reveal } from './reveal';
import type { MotionModule } from './types';

// Excepción documentada: anima `color` (no transform/opacity) en ~100 spans de texto. Piso de color = --text-3 (AA).
export const about: MotionModule = (gsap, ScrollTrigger, { desktop }) => {
  const section = document.querySelector<HTMLElement>('[data-about]');
  if (!section) return;
  if (desktop) {
    // El piso se lee del token de la paleta activa: un gris fijo no llega a AA sobre Arcade ni
    // Caramelo. Al cambiar de paleta el tween se recrea con el piso nuevo.
    const words = section.querySelectorAll('.w');
    const highlight = () =>
      gsap.from(words, {
        color: getComputedStyle(document.documentElement).getPropertyValue('--text-3').trim(),
        stagger: 0.1,
        ease: 'none',
        scrollTrigger: {
          trigger: section.querySelector('.about__body'),
          start: 'top 75%',
          end: 'bottom 55%',
          scrub: true,
        },
      });
    let tween = highlight();
    const stop = () => {
      tween.scrollTrigger?.kill();
      tween.revert();
    };
    const onPaletteChange = () => {
      stop();
      tween = highlight();
    };
    document.addEventListener(PALETTE_EVENT, onPaletteChange);
    return () => {
      document.removeEventListener(PALETTE_EVENT, onPaletteChange);
      stop();
    };
  }
  const offs = Array.from(section.querySelectorAll<HTMLElement>('[data-about-p]')).map((p) =>
    reveal(gsap, ScrollTrigger, [p], { trigger: p, start: 'top 85%', desktop, move: false }),
  );
  return () => offs.forEach((off) => off());
};
