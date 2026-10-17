import { reveal } from './reveal';
import type { MotionModule } from './types';

export const contact: MotionModule = (gsap, ScrollTrigger, { desktop }) => {
  const section = document.querySelector('[data-contact]');
  if (!section) return;
  const items = Array.from(section.querySelectorAll<HTMLElement>('[data-contact-link]'));
  const offReveal = reveal(gsap, ScrollTrigger, items, {
    trigger: section,
    start: 'top 75%',
    desktop,
  });
  if (!desktop) return offReveal;

  // Hover magnético leve sobre el label (no sobre el li, que ya anima `y` al entrar).
  // Solo en links reales: en un canal pendiente sugeriría algo clickeable.
  const offs = items.map((item) => {
    const label = item.querySelector<HTMLElement>('a [data-magnet]');
    if (!label) return () => {};
    const xTo = gsap.quickTo(label, 'x', { duration: 0.4, ease: 'power3.out' });
    const yTo = gsap.quickTo(label, 'y', { duration: 0.4, ease: 'power3.out' });
    // El li ocupa todo el ancho: sin tope, el label se iría ~150px hacia el puntero.
    const clampX = gsap.utils.clamp(-12, 12);
    const clampY = gsap.utils.clamp(-6, 6);
    const move = (e: PointerEvent) => {
      const r = label.getBoundingClientRect();
      xTo(clampX((e.clientX - (r.left + r.width / 2)) * 0.15));
      yTo(clampY((e.clientY - (r.top + r.height / 2)) * 0.3));
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    item.addEventListener('pointermove', move);
    item.addEventListener('pointerleave', leave);
    return () => {
      item.removeEventListener('pointermove', move);
      item.removeEventListener('pointerleave', leave);
    };
  });
  return () => {
    offReveal();
    offs.forEach((off) => off());
  };
};
