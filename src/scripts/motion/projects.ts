import { reveal } from './reveal';
import type { MotionModule } from './types';

export const projects: MotionModule = (gsap, ScrollTrigger, { desktop }) => {
  const offs: Array<() => void> = [];
  document.querySelectorAll<HTMLElement>('[data-project-row]').forEach((row) => {
    const media = row.querySelector('[data-parallax]');
    const meta = row.querySelector<HTMLElement>('[data-meta]');
    if (desktop && media) {
      gsap.fromTo(
        media,
        { y: 20 },
        {
          y: -20,
          ease: 'none',
          scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    }
    if (meta) {
      offs.push(
        reveal(gsap, ScrollTrigger, Array.from(meta.children) as HTMLElement[], {
          trigger: meta,
          desktop,
        }),
      );
    }
  });
  return () => offs.forEach((off) => off());
};
