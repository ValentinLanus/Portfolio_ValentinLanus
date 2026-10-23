import { links } from '../content/links';
import type { SiteContent } from './types';

export default {
  meta: {
    title: 'Valentín Lanús · Full Stack Developer · AI-assisted development',
    description:
      'Full-stack and mobile developer. I build web and mobile products end to end, with AI as a tool, not an autopilot.',
    ogImage: '/og-en.png',
  },
  nav: {
    skip: 'Skip to content',
    label: 'Main',
    about: 'About',
    stack: 'Stack',
    projects: 'Projects',
    contact: 'Contact',
    menu: 'Menu',
    close: 'Close',
    toTop: 'Back to top',
    lang: { current: 'EN', other: 'ES', otherName: 'Español' },
    palette: {
      button: 'Change theme (current: {name})',
      title: 'Theme',
      names: {
        terminal: 'Terminal',
        arcade: 'Arcade',
        caramelo: 'Candy',
        lava: 'Lava',
        atardecer: 'Sunset',
      },
    },
  },
  hero: {
    eyebrow: '// portfolio',
    name: ['Valentín', 'Lanús'],
    role: 'Full Stack Developer · AI-assisted development',
    tagline:
      'I build web and mobile products end to end, from the backend to the interface, with AI as a tool, not an autopilot.',
    ctaPrimary: 'Let’s talk',
    ctaSecondary: 'See projects',
  },
  about: {
    heading: 'About',
    paragraphs: [
      'I’m a full-stack and mobile developer. I design and build complete applications: APIs, databases, authentication, web interfaces and native Android apps.',
      'I use Claude Code in my workflow to speed up the repetitive parts, like boilerplate and first drafts. I define the architecture, the business logic and the technical decisions myself, and I review all the code that goes into the project.',
      'I focus on maintainable code, clear architecture and software that works in production, not just in the demo.',
      'I work remotely with clients and teams, and I’m open to freelance and full-time roles.',
    ],
    pillars: ['APIs & databases', 'Authentication', 'Web interfaces', 'Native mobile apps'],
  },
  stack: {
    heading: 'Stack',
    groups: [
      { name: 'Frontend', items: ['React', 'JavaScript', 'HTML', 'CSS'] },
      { name: 'Backend', items: ['Node.js', 'Supabase (PostgreSQL)', 'Firebase'] },
      { name: 'Mobile', items: ['Kotlin', 'Jetpack Compose', 'Room', 'Retrofit'] },
      { name: 'Tools', items: ['Git', 'Vercel', 'Claude Code'] },
    ],
  },
  projects: {
    eyebrow: '// projects',
    heading: 'Projects',
    labels: {
      problem: 'Problem',
      decisions: 'Key decisions',
      stack: 'Stack',
      repo: 'Code',
      demo: 'Demo',
      imagePending: 'Screenshot coming soon',
      linkPending: 'link coming soon',
    },
    lotecito: {
      id: 'lotecito',
      name: 'Lotecito',
      status: 'In production',
      summary:
        'Offline-first PWA for an agricultural services company. It replaces paper logs and WhatsApp: the seeding operator records each field lot from a phone with no signal, and the owner reviews, corrects and exports it to Excel from the office.',
      problem:
        'The data originates in the field with no coverage and is used in the office for billing. Losing or duplicating a record means hectares billed incorrectly.',
      steps: [
        {
          status: 'No signal',
          title: 'Logged in the field',
          body: 'The seeding operator records the lot from a phone, with no coverage.',
        },
        {
          status: 'Saved locally',
          title: 'Nothing gets lost',
          body: 'The record stays on the device, without depending on network or session.',
        },
        {
          status: 'Syncing',
          title: 'Signal comes back',
          body: 'Pending records sync on their own, with no one touching anything.',
        },
        {
          status: 'Synced',
          title: 'No duplicates',
          body: 'Submissions are idempotent: a dropped connection doesn’t duplicate hectares.',
        },
      ],
      decisions: [
        'Offline-first from day one, not an "offline mode" bolted on later.',
        'Records are saved without depending on network or session, and sync automatically.',
        'Idempotent submissions so a dropped signal doesn’t duplicate hectares.',
        'An audit trail for every correction and deletion.',
        'Excel export ready for billing.',
        'UX designed for non-technical users, in direct sunlight, short on time.',
      ],
      facts: ['24 database migrations', 'Private repository: runs on real data'],
      stack: ['React', 'Vite', 'PWA', 'Supabase', 'Vercel'],
      imageAlt:
        'Lotecito with sample data: campaign dashboard on desktop and the seeding operator’s phone screen',
      imageRatio: '16/10',
      ...links.lotecito,
    },
    others: [
      {
        id: 'focusly',
        name: 'Focusly',
        status: 'Smart study planner',
        summary:
          'Web app that generates personalized study plans based on subjects, exam dates and availability.',
        points: [
          'Custom plan-generation algorithm.',
          'JWT authentication.',
          'Timezone-proof dates.',
          'Full-stack development in a team of 4.',
        ],
        stack: ['Vite', 'Node', 'PostgreSQL', 'JWT'],
        imageAlt:
          'Focusly with sample data: home screen with today’s study plan and upcoming exams',
        imageRatio: '16/10',
        ...links.focusly,
      },
      {
        id: 'photofinder',
        name: 'PhotoFinder',
        status: 'Native Android',
        summary: 'Search, explore and save high-quality photos from the Unsplash API.',
        points: [
          'MVVM architecture with repositories.',
          'Local cache with Room.',
          'Google sign-in.',
        ],
        stack: ['Kotlin', 'Jetpack Compose', 'MVVM', 'Retrofit', 'Room', 'Firebase Auth'],
        imageAlt: 'PhotoFinder on Android: a "mountains" search with the Unsplash photo grid',
        imageRatio: '9/19.5',
        ...links.photofinder,
      },
    ],
  },
  contact: {
    heading: 'Contact',
    intro: 'Open to freelance projects and full-time roles. Reach out wherever suits you.',
    links: [
      { kind: 'mail', label: 'Email', href: links.contact.mail },
      { kind: 'github', label: 'GitHub · ValentinLanus', href: links.contact.github },
      { kind: 'linkedin', label: 'LinkedIn', href: links.contact.linkedin },
    ],
  },
  footer: { note: 'Designed and built by Valentín Lanús.' },
} satisfies SiteContent;
