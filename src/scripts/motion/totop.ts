import type { MotionModule } from './types';

const button = () => document.querySelector<HTMLAnchorElement>('[data-totop]');

/**
 * Visibilidad del botón "volver arriba": aparece cuando el final del hero pasó por arriba del
 * viewport y se va al volver. No depende de GSAP: se registra en todas las ramas de index.ts
 * (desktop con motion, reduced motion y fallo de carga de GSAP), así que si el módulo de motion
 * falla el botón no queda oculto para siempre. Con IntersectionObserver el estado inicial lo
 * da el primer aviso, también tras una recarga a mitad de página.
 */
export function watchToTop(): void {
  const btn = button();
  const hero = document.getElementById('top');
  if (!btn || !hero) return;
  if (!('IntersectionObserver' in window)) {
    btn.removeAttribute('data-hidden'); // sin observer no hay forma de saberlo: a la vista
    return;
  }
  new IntersectionObserver((entries) => {
    btn.toggleAttribute('data-hidden', entries[entries.length - 1].isIntersecting);
  }).observe(hero);
}

/**
 * Anillo de progreso (solo desktop; en mobile el CSS oculta el botón y acá ni se arma). Su
 * scrub es de GSAP, igual que la barra de progreso: con data-ring el CSS muestra el arco, y se
 * le quita en el cleanup. Con reduced motion o si GSAP no carga no hay anillo, como la barra de
 * arriba, que se queda en scaleX(0).
 * El scroll suave de vuelta lo hace el handler de anclas de lenis.ts: el botón es un <a href="#top">.
 */
export const toTop: MotionModule = (gsap, _ScrollTrigger, { desktop }) => {
  const btn = button();
  const arc = btn?.querySelector<SVGCircleElement>('[data-totop-arc]');
  if (!desktop || !btn || !arc) return;

  gsap.fromTo(
    arc,
    { strokeDashoffset: arc.getTotalLength() },
    { strokeDashoffset: 0, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } },
  );
  btn.setAttribute('data-ring', '');
  return () => btn.removeAttribute('data-ring');
};

/**
 * Al hacer clic, el foco termina en #top. Con Lenis lo pone lenis.ts antes de animar; sin Lenis
 * (reduced motion, o antes de que cargue) lo mueve el ancla nativa o nadie, y el botón se esconde
 * al llegar arriba con el foco adentro. Corre en todas las ramas de index.ts.
 */
export function bindToTopFocus(): void {
  button()?.addEventListener('click', (e) => {
    // Mismo criterio que lenis.ts: un clic modificado abre el ancla en otra pestaña y no salta.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    // El salto del ancla ocurre después de este handler: se revisa el foco en el turno siguiente.
    setTimeout(() => {
      const hero = document.getElementById('top');
      if (hero && document.activeElement !== hero) hero.focus({ preventScroll: true });
    }, 0);
  });
}
