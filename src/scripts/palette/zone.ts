// La zona libre del hero de Caramelo y Lava: el espacio donde flotan las formas sin tapar texto.
//
// Hay dos disposiciones (el CSS está en styles/extras.css):
//   - franja: la capa ocupa el espacio libre de arriba del texto. No puede pisarlo, porque el
//     contenido del hero va pegado abajo y la capa es solo el sobrante vertical.
//   - columna: en pantallas anchas la capa es una zona fija a la derecha del texto. Acá sí puede
//     pisarlo, y cuánto lugar queda depende de cuán ancho sea el texto: del tamaño de letra (zoom de
//     texto, tamaño de fuente del navegador), del idioma y de la copia. Un porcentaje o un umbral
//     ajustado a la copia de hoy no lo garantiza.
//
// Por eso la columna sale de la medición real: el borde izquierdo de la zona es el borde derecho del
// texto más un margen, y si lo que queda no alcanza para formas con sentido, el hero vuelve a la
// franja. Se vuelve a medir cada vez que el hero o su texto cambian de tamaño.

/** Aire entre el texto y la zona (px). Las formas no se salen de la zona por la izquierda. */
const GAP = 32;
/** Una columna más angosta que esto no deja lugar para formas con sentido. */
const MIN_ZONE = 200;

/** Borde derecho (px de ventana) de lo que el hero muestra a la izquierda: texto y botones. */
function textRight(hero: HTMLElement): number {
  let right = 0;
  // Se mide el texto, no las cajas: un párrafo ocupa todo el ancho aunque su texto corte antes.
  // La copia animada del nombre (`fx-visual`) y la que leen los lectores (`visually-hidden`) quedan
  // afuera: el nombre se mide por su palabra (`.line__inner`), que no cambia durante la ola.
  const walker = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    if (!node.data.trim() || node.parentElement?.closest('.fx-visual, .visually-hidden')) continue;
    // Las capas decorativas son hijas del hero y no tienen texto, pero no se miden por si acaso.
    if (node.parentElement?.closest('.fx-blobs, .fx-lava')) continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) right = Math.max(right, rect.right);
  }
  for (const box of hero.querySelectorAll('.line__inner, .btn'))
    right = Math.max(right, box.getBoundingClientRect().right);
  return right;
}

/**
 * Acomoda la capa respecto del texto del hero. Pone en la capa `--fx-left` (el borde izquierdo de la
 * columna, en px desde el borde del hero) y el atributo `data-side` cuando hay lugar para la
 * columna; sin `data-side`, el CSS deja la capa como franja. Devuelve el cleanup.
 */
export function fitZone(hero: HTMLElement, layer: HTMLElement): () => void {
  let alive = true;
  const apply = () => {
    if (!alive) return;
    const box = hero.getBoundingClientRect();
    const left = Math.ceil(textRight(hero) - box.left + GAP);
    layer.style.setProperty('--fx-left', `${left}px`);
    layer.toggleAttribute('data-side', box.width - left >= MIN_ZONE);
  };
  apply();

  // El ResizeObserver avisa del tamaño de cada caja: el hero cuando cambia la ventana, y el texto
  // cuando cambia la letra o termina de cargar la tipografía. Escribir en la capa no cambia ninguna
  // de las cajas que se observan (la capa no empuja nada), así que no hay bucle.
  const watcher = new ResizeObserver(apply);
  watcher.observe(hero);
  for (const child of hero.children) if (child !== layer) watcher.observe(child);
  for (const box of hero.querySelectorAll('.line__inner, .btn')) watcher.observe(box);
  void document.fonts?.ready.then(apply);

  return () => {
    alive = false;
    watcher.disconnect();
  };
}
