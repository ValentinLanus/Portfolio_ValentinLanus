/**
 * Prepara un texto para animarlo sin romper lo que lee un lector de pantalla.
 *
 * Los efectos de Terminal y Arcade reescriben el texto carácter por carácter (tipeo, descifrado,
 * contador). Si lo hicieran sobre el texto real, un lector oiría "F", "Fu", "Ful"... o caracteres
 * al azar. Acá el contenido original (nodos y marcado) se mueve intacto a un `span.visually-hidden`,
 * que se lee siempre completo, y se agrega al lado una copia `aria-hidden` que es la que se anima.
 *
 * `restore` deja el elemento exactamente como estaba (los mismos nodos, no copias): se llama al
 * terminar el efecto y también al limpiar, así nada queda duplicado ni escondido.
 */
export function visualClone(el: HTMLElement): { visual: HTMLElement; restore: () => void } {
  const original = Array.from(el.childNodes);
  const text = el.textContent ?? '';

  const readable = document.createElement('span');
  readable.className = 'visually-hidden';
  readable.append(...original);

  const visual = document.createElement('span');
  visual.className = 'fx-visual';
  visual.setAttribute('aria-hidden', 'true');
  visual.textContent = text;

  el.replaceChildren(readable, visual);
  return { visual, restore: () => el.replaceChildren(...original) };
}
