import type { Extra } from '../extras';

// Lava todavía no tiene animaciones propias: este stub mantiene completo el mapa de extras.ts.
// Quien las agregue reemplaza el cuerpo y devuelve el cleanup de todo lo que cree.
const lava: Extra = () => () => {};

export default lava;
