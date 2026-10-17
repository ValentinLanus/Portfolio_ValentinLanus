import { reveal } from './reveal';
import type { MotionModule, ScrollTriggerT } from './types';

type Trigger = ReturnType<ScrollTriggerT['create']>;

export const lotecito: MotionModule = (gsap, ScrollTrigger, { desktop }) => {
  const section = document.querySelector<HTMLElement>('[data-lotecito]');
  const pin = section?.querySelector<HTMLElement>('[data-lotecito-pin]');
  const signal = section?.querySelector<HTMLElement>('[data-signal]');
  const label = section?.querySelector<HTMLElement>('[data-signal-label]');
  if (!section || !pin || !signal || !label) return;
  const steps = Array.from(section.querySelectorAll<HTMLElement>('[data-step]'));
  const decisionList = section.querySelector<HTMLElement>('[data-decisions]');
  const lastStatus = steps[steps.length - 1].dataset.status ?? '';

  const fadeSteps = () =>
    steps.map((step) =>
      reveal(gsap, ScrollTrigger, [step], {
        trigger: step,
        start: 'top 85%',
        desktop,
        move: false,
      }),
    );

  // refreshPriority -1: se calcula después del pin, que agrega 150vh por encima de la lista.
  const enterDecisions = () =>
    decisionList
      ? reveal(gsap, ScrollTrigger, Array.from(decisionList.querySelectorAll<HTMLElement>('li')), {
          trigger: decisionList,
          desktop,
          refreshPriority: -1,
        })
      : () => {};

  if (!desktop) {
    const offs = [...fadeSteps(), enterDecisions()];
    return () => offs.forEach((off) => off());
  }

  // Desktop: se pinea solo si el bloque entra en la altura del viewport. Se vuelve a evaluar
  // en cada refresh de ScrollTrigger (resize, fuentes cargadas) y se alterna entre pin y fades.
  let mode: 'pinned' | 'fades' | null = null;
  let trigger: Trigger | null = null;
  let fades: Array<() => void> = [];
  let current = -1;

  const setActive = (i: number) => {
    if (i === current) return;
    current = i;
    steps.forEach((s, j) => s.toggleAttribute('data-active', j === i));
    signal.dataset.level = String(i + 1);
    label.textContent = steps[i].dataset.status ?? '';
  };

  const resetState = () => {
    current = -1;
    section.classList.remove('is-pinned');
    steps.forEach((s) => s.removeAttribute('data-active'));
    signal.dataset.level = String(steps.length);
    label.textContent = lastStatus;
  };

  const stopFades = () => {
    fades.forEach((off) => off());
    fades = [];
  };

  const toPinned = () => {
    stopFades();
    section.classList.add('is-pinned');
    setActive(0);
    trigger = ScrollTrigger.create({
      trigger: pin,
      start: 'top top',
      end: '+=150%',
      pin: true,
      refreshPriority: 1,
      onUpdate: (self) =>
        setActive(Math.min(steps.length - 1, Math.floor(self.progress * steps.length))),
    });
    mode = 'pinned';
  };

  const toFades = () => {
    trigger?.kill(true);
    trigger = null;
    resetState();
    fades = fadeSteps();
    mode = 'fades';
  };

  // Misma medida en los dos modos (ScrollTrigger fija el alto pineado en ceil(alto natural)),
  // para que el límite no oscile entre pin y fades.
  const blockHeight = () => Math.ceil(pin.getBoundingClientRect().height);
  const fits = () => {
    if (mode === 'pinned') return blockHeight() <= window.innerHeight + 1;
    section.classList.add('is-pinned');
    const ok = blockHeight() <= window.innerHeight + 1;
    section.classList.remove('is-pinned');
    return ok;
  };

  const evaluate = () => {
    const next = fits() ? 'pinned' : 'fades';
    if (next === mode) return false;
    if (next === 'pinned') toPinned();
    else toFades();
    return true;
  };

  evaluate();
  const offDecisions = enterDecisions();

  // El refresh que dispara este módulo tras cambiar de modo no se vuelve a evaluar.
  let selfRefresh = false;
  const onRefresh = () => {
    if (selfRefresh || !evaluate()) return;
    selfRefresh = true;
    try {
      ScrollTrigger.refresh();
    } finally {
      selfRefresh = false;
    }
  };
  ScrollTrigger.addEventListener('refresh', onRefresh);

  return () => {
    ScrollTrigger.removeEventListener('refresh', onRefresh);
    trigger?.kill(true);
    stopFades();
    offDecisions();
    resetState();
  };
};
