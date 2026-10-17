// Registro de paletas. El script inline del <head> (Base.astro) repite la lista de ids en un
// regex para aplicar la guardada antes de pintar: un test verifica que coincidan.
export const PALETTES = ['terminal', 'arcade', 'caramelo', 'lava', 'atardecer'] as const;
export type PaletteId = (typeof PALETTES)[number];

export const DEFAULT_PALETTE: PaletteId = 'terminal';
export const STORAGE_KEY = 'palette';

export const isPaletteId = (v: unknown): v is PaletteId => PALETTES.includes(v as PaletteId);

export const currentPalette = (): PaletteId => {
  const id = document.documentElement.dataset.palette;
  return isPaletteId(id) ? id : DEFAULT_PALETTE;
};

/** Cómo entran las secciones en cada paleta (ver motion/reveal.ts). */
export interface Personality {
  ease: string;
  duration: number;
  stagger: number;
  y: number;
}

export const PERSONALITY: Record<PaletteId, Personality> = {
  terminal: { ease: 'power2.out', duration: 0.6, stagger: 0.08, y: 24 },
  arcade: { ease: 'steps(4)', duration: 0.4, stagger: 0.1, y: 32 },
  caramelo: { ease: 'elastic.out(1, 0.5)', duration: 1.0, stagger: 0.08, y: 40 },
  lava: { ease: 'power4.out', duration: 1.2, stagger: 0.12, y: 16 },
  atardecer: { ease: 'sine.out', duration: 0.9, stagger: 0.1, y: 20 },
};

export const personality = (): Personality => PERSONALITY[currentPalette()];

/** Evento que se despacha en `document` al cambiar de paleta. */
export const PALETTE_EVENT = 'palette:change';
export interface PaletteChangeDetail {
  id: PaletteId;
  prev: PaletteId;
}
