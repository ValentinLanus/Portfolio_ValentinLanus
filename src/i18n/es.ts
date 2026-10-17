import { links } from '../content/links';
import type { SiteContent } from './types';

export default {
  meta: {
    title: 'Valentín Lanús · Full Stack Developer · desarrollo asistido por IA',
    description:
      'Desarrollador full stack y mobile. Construyo productos web y mobile de punta a punta, con la IA como herramienta y no como piloto automático.',
    ogImage: '/og-es.png',
  },
  nav: {
    skip: 'Saltar al contenido',
    label: 'Principal',
    about: 'Sobre mí',
    stack: 'Stack',
    projects: 'Proyectos',
    contact: 'Contacto',
    menu: 'Menú',
    close: 'Cerrar',
    lang: { current: 'ES', other: 'EN', otherName: 'English' },
    palette: {
      button: 'Cambiar paleta',
      title: 'Paleta',
      names: {
        terminal: 'Terminal',
        arcade: 'Arcade',
        caramelo: 'Caramelo',
        lava: 'Lava',
        atardecer: 'Atardecer',
      },
    },
  },
  hero: {
    eyebrow: '// portfolio',
    name: ['Valentín', 'Lanús'],
    role: 'Full Stack Developer · desarrollo asistido por IA',
    tagline:
      'Construyo productos web y mobile de punta a punta, del backend a la interfaz, con la IA como herramienta y no como piloto automático.',
    ctaPrimary: 'Hablemos',
    ctaSecondary: 'Ver proyectos',
  },
  about: {
    heading: 'Sobre mí',
    paragraphs: [
      'Soy desarrollador full stack y mobile. Diseño y construyo aplicaciones completas: APIs, bases de datos, autenticación, interfaces web y apps nativas para Android.',
      'Uso Claude Code en mi flujo de trabajo para acelerar lo repetitivo, como boilerplate y primeras versiones. La arquitectura, la lógica de negocio y las decisiones técnicas las defino yo, y reviso todo el código que entra al proyecto.',
      'Me enfoco en código mantenible, arquitecturas claras y software que funcione en producción, no solo en la demo.',
      'Trabajo de forma remota con clientes y equipos; abierto a freelance y full-time.',
    ],
    pillars: ['APIs y bases de datos', 'Autenticación', 'Interfaces web', 'Apps móviles nativas'],
  },
  stack: {
    heading: 'Stack',
    groups: [
      { name: 'Frontend', items: ['React', 'JavaScript', 'HTML', 'CSS'] },
      { name: 'Backend', items: ['Node.js', 'Supabase (PostgreSQL)', 'Firebase'] },
      { name: 'Mobile', items: ['Kotlin', 'Jetpack Compose', 'Room', 'Retrofit'] },
      { name: 'Herramientas', items: ['Git', 'Vercel', 'Claude Code'] },
    ],
  },
  projects: {
    eyebrow: '// proyectos',
    heading: 'Proyectos',
    labels: {
      problem: 'Problema',
      decisions: 'Decisiones clave',
      stack: 'Stack',
      repo: 'Código',
      demo: 'Demo',
      imagePending: 'Captura pendiente',
      linkPending: 'link pendiente',
    },
    lotecito: {
      id: 'lotecito',
      name: 'Lotecito',
      status: 'En producción',
      summary:
        'PWA offline-first para una empresa de servicios agrícolas. Reemplaza el registro en papel y WhatsApp: el sembrador carga cada lote desde el celular sin señal y el dueño lo revisa, corrige y exporta a Excel desde la oficina.',
      problem:
        'El dato nace en el campo sin cobertura y se usa en la oficina para liquidar. Perder o duplicar una carga son hectáreas mal cobradas.',
      steps: [
        {
          status: 'Sin señal',
          title: 'Carga en el campo',
          body: 'El sembrador registra el lote desde el celular, sin cobertura.',
        },
        {
          status: 'Guardado local',
          title: 'Nada se pierde',
          body: 'La carga queda en el dispositivo sin depender de red ni de sesión.',
        },
        {
          status: 'Sincronizando',
          title: 'Vuelve la señal',
          body: 'Las cargas pendientes se sincronizan solas, sin que nadie toque nada.',
        },
        {
          status: 'Sincronizado',
          title: 'Sin duplicados',
          body: 'Los envíos son idempotentes: un corte de señal no duplica hectáreas.',
        },
      ],
      decisions: [
        'Offline-first desde el día uno, no un "modo offline" agregado.',
        'Cargas guardadas sin depender de red ni de sesión, sincronizadas solas.',
        'Envíos idempotentes para que un corte de señal no duplique hectáreas.',
        'Auditoría de cada corrección y borrado.',
        'Exportación a Excel lista para liquidar.',
        'UX pensada para usuarios no técnicos, al sol y con poco tiempo.',
      ],
      facts: ['24 migraciones de base de datos', 'Repositorio privado: corre con datos reales'],
      stack: ['React', 'Vite', 'PWA', 'Supabase', 'Vercel'],
      imageAlt:
        'Lotecito con datos de ejemplo: tablero de campaña en la computadora y la pantalla del sembrador en el celular',
      imageRatio: '16/10',
      ...links.lotecito,
    },
    others: [
      {
        id: 'focusly',
        name: 'Focusly',
        status: 'Planificador de estudio inteligente',
        summary:
          'Web app que genera planes de estudio personalizados según materias, fechas de examen y disponibilidad.',
        points: [
          'Algoritmo propio de generación de planes.',
          'Autenticación con JWT.',
          'Fechas a prueba de zonas horarias.',
          'Desarrollo full-stack en equipo de 4.',
        ],
        stack: ['Vite', 'Node', 'PostgreSQL', 'JWT'],
        imageAlt:
          'Focusly con datos de ejemplo: inicio con el plan de estudio del día y los próximos exámenes',
        imageRatio: '16/10',
        ...links.focusly,
      },
      {
        id: 'photofinder',
        name: 'PhotoFinder',
        status: 'Android nativa',
        summary: 'Buscar, explorar y guardar fotos en alta calidad consumiendo la API de Unsplash.',
        points: [
          'Arquitectura MVVM con repositorios.',
          'Caché local con Room.',
          'Login con Google.',
        ],
        stack: ['Kotlin', 'Jetpack Compose', 'MVVM', 'Retrofit', 'Room', 'Firebase Auth'],
        imageAlt: 'PhotoFinder en Android: búsqueda "montañas" con la grilla de fotos de Unsplash',
        imageRatio: '9/19.5',
        ...links.photofinder,
      },
    ],
  },
  contact: {
    heading: 'Contacto',
    intro:
      'Abierto a proyectos freelance y posiciones full-time. Escribime por donde te quede cómodo.',
    links: [
      { kind: 'mail', label: 'Mail', href: links.contact.mail },
      { kind: 'github', label: 'GitHub · ValentinLanus', href: links.contact.github },
      { kind: 'linkedin', label: 'LinkedIn', href: links.contact.linkedin },
    ],
  },
  footer: { note: 'Diseñado y desarrollado por Valentín Lanús.' },
} satisfies SiteContent;
