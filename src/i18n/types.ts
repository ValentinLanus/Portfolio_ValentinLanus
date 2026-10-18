import type { ImageMetadata } from 'astro';
import type { Todo } from '../content/placeholders';
import type { PaletteId } from '../scripts/palette/palettes';
import type { Locale } from './locales';

export type { Locale };
export type MaybeUrl = string | Todo;
export type MaybeImg = ImageMetadata | Todo;
export type Ratio = '16/10' | '9/19.5';

export interface Project {
  id: string;
  name: string;
  status: string;
  summary: string;
  points: string[];
  stack: string[];
  image: MaybeImg;
  imageAlt: string;
  imageRatio: Ratio;
  repo?: MaybeUrl;
  demo?: MaybeUrl;
}

export interface LotecitoStep {
  status: string;
  title: string;
  body: string;
}

export interface FeaturedProject extends Omit<Project, 'points'> {
  problem: string;
  steps: [LotecitoStep, LotecitoStep, LotecitoStep, LotecitoStep];
  decisions: string[];
  facts: string[];
}

export interface ContactLink {
  kind: 'mail' | 'github' | 'linkedin';
  label: string;
  href: MaybeUrl;
}

export interface SiteContent {
  meta: { title: string; description: string; ogImage: string };
  nav: {
    skip: string;
    label: string;
    about: string;
    stack: string;
    projects: string;
    contact: string;
    menu: string;
    close: string;
    toTop: string;
    lang: { current: string; other: string; otherName: string };
    palette: {
      /** Nombre accesible del botón del selector. `{name}` se reemplaza por la paleta activa. */
      button: string;
      title: string;
      names: Record<PaletteId, string>;
    };
  };
  hero: {
    eyebrow: string;
    name: [string, string];
    role: string;
    tagline: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  about: { heading: string; paragraphs: string[]; pillars: string[] };
  stack: { heading: string; groups: { name: string; items: string[] }[] };
  projects: {
    eyebrow: string;
    heading: string;
    labels: {
      problem: string;
      decisions: string;
      stack: string;
      repo: string;
      demo: string;
      imagePending: string;
      linkPending: string;
    };
    lotecito: FeaturedProject;
    others: [Project, Project];
  };
  contact: { heading: string; intro: string; links: ContactLink[] };
  footer: { note: string };
}
