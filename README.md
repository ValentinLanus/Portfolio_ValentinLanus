# Valentín Lanús · Portfolio

![Valentín Lanús, Full Stack Developer · desarrollo asistido por IA](public/og-es.png)

**[valentinlanus.vercel.app](https://valentinlanus.vercel.app)** · [English](https://valentinlanus.vercel.app/en)

Mi portfolio personal: quién soy, con qué trabajo y tres proyectos contados desde el problema que resuelven y las decisiones que tomé. Está en español (`/`) y en inglés (`/en`).

## Qué muestra

- **Sobre mí y stack:** desarrollo full stack y mobile, del backend a la interfaz.
- **Lotecito:** PWA offline-first en producción para una empresa de servicios agrícolas. Es el proyecto principal: en desktop la sección se fija en pantalla y el scroll recorre cómo una carga hecha en el campo sin señal llega a la oficina sin perderse ni duplicarse.
- **Focusly:** planificador de estudio web, desarrollado en equipo.
- **PhotoFinder:** app Android nativa con Kotlin y Jetpack Compose.

Las capturas son recreaciones con datos y nombres de ejemplo: no muestran datos reales de clientes ni de usuarios.

## Cómo está hecho

- **Astro, sitio estático.** No hay framework de UI: cada página es HTML generado en el build, así que el contenido se lee aunque el JavaScript no cargue.
- **Bilingüe con el i18n de Astro.** Los textos de cada idioma viven en `src/i18n/` y comparten un mismo tipo, así que el chequeo de tipos avisa si a un idioma le falta un texto.
- **Animaciones con GSAP y ScrollTrigger**, con scroll suave (Lenis) en desktop. Se cargan cuando el navegador queda libre, para no frenar la primera carga, y tienen una versión más liviana en mobile. Con "reducir movimiento" activado en el sistema, el sitio queda estático.
- **Cinco temas** (Terminal, Arcade, Caramelo, Lava y Atardecer) que se eligen desde el nav. Cada uno trae sus colores, su forma de animar las entradas, una transición propia al elegirlo (hecha con [Motion](https://motion.dev)) y animaciones que solo se descargan cuando ese tema está activo.
- **Imágenes optimizadas** con el componente `<Picture>` de Astro (AVIF y WebP en varios tamaños).
- **Deploy en Vercel**, con headers de seguridad definidos en `vercel.json`.

## Correrlo en local

Requiere Node 22.12 o superior.

```bash
npm install
npm run dev
```

El sitio queda en `http://localhost:4330`.

## Licencia

El código está bajo licencia [MIT](LICENSE). Las fotos que aparecen en la captura de PhotoFinder son de [Unsplash](https://unsplash.com), de Mads Schmidt Rasmussen, Massimiliano Morosinotto, Boris Baldinger, Luke Richardson, Matteo Catanese y Pietro De Grandi.
