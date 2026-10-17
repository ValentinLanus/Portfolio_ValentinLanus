import type { MotionModule } from './types';

const button = () => document.querySelector<HTMLAnchorElement>('[data-totop]');

/**
 * Botón "volver arriba" (solo desktop; en mobile el CSS lo oculta y acá ni se arma).
 * - Aparece cuando el final del hero pasa por arriba del viewport y se va al volver.
 * - Su anillo se llena con el avance de la página (mismo scrub que la barra de progreso).
 * El scroll suave de vuelta lo hace el handler de anclas de lenis.ts: el botón es un <a href="#top">.
 */
export const toTop: MotionModule = (gsap, ScrollTrigger, { desktop }) => {
  const btn = button();
  const hero = document.getElementById('top');
  const arc = btn?.querySelector<SVGCircleElement>('[data-totop-arc]');
  if (!desktop || !btn || !hero || !arc) return;

  gsap.fromTo(
    arc,
    { strokeDashoffset: arc.getTotalLength() },
    { strokeDashoffset: 0, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } },
  );

  // Visible desde que el final del hero queda arriba del viewport, también al final de la página
  // (por eso no se escucha onLeave). Se mide con la posición real del scroll y no con los
  // eventos de entrada y salida: así una recarga a mitad de página lo deja bien a la primera.
  const sync = (self: { scroll(): number; start: number }) =>
    btn.toggleAttribute('data-hidden', self.scroll() < self.start);
  const trigger = ScrollTrigger.create({
    trigger: hero,
    start: 'bottom top',
    end: 'max',
    onUpdate: sync,
    onRefresh: sync,
    onToggle: sync,
  });
  sync(trigger);
};

/**
 * Sin motion (reduced motion, o si GSAP no carga) nadie muestra ni oculta el botón: se le quita
 * el estado oculto y queda siempre a la vista, igual que sin JS.
 */
export function releaseToTop(): void {
  button()?.removeAttribute('data-hidden');
}

/**
 * Al hacer clic, el foco termina en #top. Con Lenis lo pone lenis.ts antes de animar; sin Lenis
 * (reduced motion, o antes de que cargue) lo mueve el ancla nativa o nadie, y el botón se esconde
 * al llegar arriba con el foco adentro. Corre en todas las ramas de index.ts.
 */
export function bindToTopFocus(): void {
  button()?.addEventListener('click', () => {
    // El salto del ancla ocurre después de este handler: se revisa el foco en el turno siguiente.
    setTimeout(() => {
      const hero = document.getElementById('top');
      if (hero && document.activeElement !== hero) hero.focus({ preventScroll: true });
    }, 0);
  });
}
