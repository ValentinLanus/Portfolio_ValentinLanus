import { prefetchCurtains, setPalette, syncThemeColor } from './controller';
import { PALETTE_EVENT, currentPalette, isPaletteId, type PaletteId } from './palettes';

// Sin GSAP ni motion: el selector tiene que andar también con reduced motion y antes de que
// el motion termine de cargar.

const centreOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/**
 * Marca la opción de `now` en todos los selectores de la página, y la nombra en el botón del
 * popover: "Cambiar paleta (actual: Arcade)". Al elegir se llama con la elegida antes de devolver el
 * foco al botón (el cambio en sí espera a la cortina): así el lector de pantalla anuncia la paleta
 * nueva y no la vieja. `palette:change` vuelve a marcar la que quedó puesta, venga de donde venga.
 */
function markPalette(now: PaletteId) {
  document.querySelectorAll<HTMLElement>('[data-palette-option]').forEach((option) => {
    const on = String(option.dataset.paletteOption === now);
    // menuitemradio (popover) usa aria-checked; los botones del menú mobile, aria-pressed.
    for (const attr of ['aria-checked', 'aria-pressed']) {
      if (option.hasAttribute(attr)) option.setAttribute(attr, on);
    }
  });
  document.querySelectorAll<HTMLElement>('[data-palette-picker]').forEach((root) => {
    const button = root.querySelector<HTMLElement>('[data-palette-button]');
    const template = button?.dataset.paletteButton;
    const name = root
      .querySelector(`[data-palette-option="${now}"] .opt__name`)
      ?.textContent?.trim();
    if (button && template && name)
      button.setAttribute(
        'aria-label',
        template.replace('{name}', () => name),
      );
  });
}

/** Popover de la barra: botón + menú con las cinco opciones como radios. */
function initPopover() {
  const root = document.querySelector<HTMLElement>('[data-palette-picker]');
  const button = root?.querySelector<HTMLButtonElement>('[data-palette-button]');
  const menu = root?.querySelector<HTMLElement>('[data-palette-menu]');
  if (!root || !button || !menu) return;

  const options = () =>
    Array.from(menu.querySelectorAll<HTMLButtonElement>('[data-palette-option]'));
  const marked = () =>
    options().find((o) => o.getAttribute('aria-checked') === 'true') ?? options()[0];
  const isOpen = () => !menu.hidden;

  const open = () => {
    prefetchCurtains();
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    marked().focus();
  };
  const close = (returnFocus: boolean) => {
    if (menu.hidden) return;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) button.focus();
  };

  button.addEventListener('click', () => (isOpen() ? close(true) : open()));

  // Enter y Espacio abren con el clic nativo del botón; las flechas abren o vuelven al menú.
  button.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    e.stopPropagation(); // el manejador del menú, más abajo, movería el foco un lugar más
    if (isOpen()) marked().focus();
    else open();
  });

  menu.addEventListener('click', (e) => {
    const option = (e.target as Element).closest<HTMLElement>('[data-palette-option]');
    const id = option?.dataset.paletteOption;
    if (!option || !isPaletteId(id)) return;
    markPalette(id);
    close(true);
    void setPalette(id, centreOf(button));
  });

  root.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      return close(true);
    }
    // Tab cierra sin tocar el foco: el navegador lo lleva solo al siguiente elemento. El cierre
    // espera a que el foco se haya movido.
    if (e.key === 'Tab') return void setTimeout(() => close(false));

    const items = options();
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const last = items.length - 1;
    let to: number;
    if (e.key === 'ArrowDown') to = at < 0 ? 0 : (at + 1) % items.length;
    else if (e.key === 'ArrowUp') to = at < 0 ? last : (at - 1 + items.length) % items.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = last;
    else return;
    e.preventDefault();
    items[to].focus();
  });

  // Foco que sale del selector por otra vía (no por Tab) y clic o toque afuera.
  root.addEventListener('focusout', (e) => {
    if (isOpen() && e.relatedTarget instanceof Node && !root.contains(e.relatedTarget))
      close(false);
  });
  document.addEventListener('pointerdown', (e) => {
    if (isOpen() && e.target instanceof Node && !root.contains(e.target)) close(false);
  });
  // Por debajo de 768 px el botón se oculta: no puede quedar un menú abierto sin su botón.
  matchMedia('(max-width: 767px)').addEventListener('change', (e) => {
    if (e.matches) close(false);
  });
}

/** Grupo de botones dentro del menú mobile: elegir no cierra el menú. */
function initGroups() {
  document.querySelectorAll<HTMLElement>('[data-palette-group]').forEach((group) => {
    // El grupo se ve recién al abrir el menú: ahí se adelantan las cortinas (una sola vez).
    const shown = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      shown.disconnect();
      prefetchCurtains();
    });
    shown.observe(group);
    group.addEventListener('click', (e) => {
      const option = (e.target as Element).closest<HTMLElement>('[data-palette-option]');
      const id = option?.dataset.paletteOption;
      if (!option || !isPaletteId(id)) return;
      // El botón tocado conserva el foco: su aria-pressed se anuncia ya, no al terminar la cortina.
      markPalette(id);
      void setPalette(id, centreOf(option));
    });
  });
}

export function initPicker(): void {
  const sync = () => markPalette(currentPalette());
  sync();
  document.addEventListener(PALETTE_EVENT, sync);
  initPopover();
  initGroups();
  // El <meta theme-color> sale de fábrica con el fondo de Terminal: si la página cargó con otra
  // paleta guardada, se alinea. El CSS puede no haber llegado todavía: se repite en `load`.
  syncThemeColor();
  window.addEventListener('load', syncThemeColor, { once: true });
}
