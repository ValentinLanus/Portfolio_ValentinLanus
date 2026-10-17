import { reveal } from './reveal';
import type { MotionModule } from './types';

export const stack: MotionModule = (gsap, ScrollTrigger, { desktop }) => {
  const section = document.querySelector('[data-stack]');
  if (!section) return;
  return reveal(
    gsap,
    ScrollTrigger,
    Array.from(section.querySelectorAll<HTMLElement>('[data-stack-group]')),
    { trigger: section, start: 'top 75%', desktop },
  );
};
