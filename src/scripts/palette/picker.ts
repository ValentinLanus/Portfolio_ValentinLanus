import { setPalette, syncThemeColor } from './controller';
import { PALETTE_EVENT, currentPalette, isPaletteId } from './palettes';

// Sin GSAP ni motion: el selector tiene que andar también con reduced motion y antes de que
// el motion termine de cargar.

const centreOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** Marca la opción de la paleta activa en todos los selectores de la página. */
function syncOptions() {
  const now = currentPalette();
  document.querySelectorAll<HTMLElement>('[data-palette-option]').forEach((option) => {
    const on = String(option.dataset.paletteOption === now);
    // menuitemradio (popover) usa aria-checked; los botones del menú mobile, aria-pressed.
    for (const attr of ['aria-checked', 'aria-pressed']) {
      if (option.hasAttribute(attr)) option.setAttribute(attr, on);
    }
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
    group.addEventListener('click', (e) => {
      const option = (e.target as Element).closest<HTMLElement>('[data-palette-option]');
      const id = option?.dataset.paletteOption;
      if (option && isPaletteId(id)) void setPalette(id, centreOf(option));
    });
  });
}

export function initPicker(): void {
  syncOptions();
  document.addEventListener(PALETTE_EVENT, syncOptions);
  initPopover();
  initGroups();
  // El <meta theme-color> sale de fábrica con el fondo de Terminal: si la página cargó con otra
  // paleta guardada, se alinea. El CSS puede no haber llegado todavía: se repite en `load`.
  syncThemeColor();
  window.addEventListener('load', syncThemeColor, { once: true });
}
