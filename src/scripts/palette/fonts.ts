import type { PaletteId } from './palettes';

// La tipografía de títulos de cada paleta (--font-display). El navegador la baja recién cuando un
// título la usa, o sea, cuando la paleta ya cambió: con una red lenta el título se ve un rato con
// la de respaldo y se reacomoda al llegar la buena. Pedirla a mano permite empezar antes (mientras
// la cortina tapa) y saber cuándo llegó (para volver a medir lo que depende de los títulos).

/** El --font-display de la paleta `id`, leído de un elemento con su atributo (palettes.css). */
function displayFamily(id: PaletteId): string {
  const probe = document.createElement('span');
  probe.dataset.palette = id;
  probe.hidden = true;
  document.body.append(probe);
  const family = getComputedStyle(probe).getPropertyValue('--font-display').trim();
  probe.remove();
  return family;
}

/**
 * Baja la tipografía de títulos de `id` y se resuelve cuando está lista. Se piden los caracteres de
 * los títulos de la página, para que vengan todos los cortes de la fuente que hacen falta (latin,
 * latin-ext...). Nunca se rechaza: si la fuente no llega, los títulos quedan con la de respaldo.
 */
export function loadDisplayFont(id: PaletteId): Promise<void> {
  if (!document.fonts) return Promise.resolve();
  const family = displayFamily(id);
  if (!family) return Promise.resolve();
  const text = Array.from(document.querySelectorAll('h1, h2, h3'), (h) => h.textContent ?? '')
    .join('')
    .replace(/\s+/g, '');
  return document.fonts.load(`400 1em ${family}`, text || 'A').then(
    () => undefined,
    () => undefined,
  );
}
