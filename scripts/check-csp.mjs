import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Corre después de `astro build`: si la CSP de vercel.json no permite el HTML generado, el
// build falla y Vercel no publica (en modo enforcing, un hash viejo deja el menú mobile muerto).
const fail = (msg) => {
  console.error(`\n✗ CSP: ${msg}\n`);
  process.exit(1);
};

const csp = JSON.parse(readFileSync('vercel.json', 'utf8'))
  .headers.flatMap((rule) => rule.headers)
  .find((h) => h.key === 'Content-Security-Policy');
if (!csp) fail('falta el header Content-Security-Policy en vercel.json.');

const scriptSrc = csp.value
  .split(';')
  .map((d) => d.trim())
  .find((d) => d.startsWith('script-src '));
const declared = new Set(scriptSrc?.match(/'(sha256-[^']+)'/g)?.map((t) => t.slice(1, -1)));

const pages = readdirSync('dist').filter((f) => f.endsWith('.html'));
if (!pages.length) fail('no hay páginas en dist/ para revisar.');

const built = new Set();
const problems = [];
for (const page of pages) {
  const html = readFileSync(`dist/${page}`, 'utf8');
  // Mismo criterio que el navegador: los JSON-LD no se ejecutan y no necesitan hash.
  for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc\s*=/.test(attrs)) continue;
    if (/\btype\s*=\s*["']?application\/ld\+json/i.test(attrs)) continue;
    built.add('sha256-' + createHash('sha256').update(body).digest('base64'));
  }
  if (/<style[\s>]/.test(html)) problems.push(`${page}: <style> inline (style-src-elem 'self')`);
  for (const [tag] of html.matchAll(
    /<(?:script|img|source|link[^>]*rel=["']?stylesheet)[^>]*\s(?:src|srcset|href)=["']?https?:\/\/[^>]*>/g,
  ))
    problems.push(`${page}: recurso de otro origen: ${tag.slice(0, 120)}`);
}

// Las hojas también: font-src/img-src 'self' bloquean `data:` y otros orígenes dentro de url().
// (Vite inlinea como data: los assets chicos que una hoja referencia; astro.config.mjs lo evita
// para las fuentes, y esto lo frena si vuelve a pasar.)
for (const file of readdirSync('dist/_astro').filter((f) => f.endsWith('.css'))) {
  const css = readFileSync(`dist/_astro/${file}`, 'utf8');
  const blocked =
    /url\(\s*["']?(?:data:|blob:|https?:|\/\/)[^)]{0,60}|@import\s+["']?(?:https?:|\/\/)[^;]{0,60}/gi;
  for (const [ref] of css.matchAll(blocked))
    problems.push(`_astro/${file}: recurso que la CSP bloquea: ${ref.slice(0, 80)}`);
}

const missing = [...built].filter((h) => !declared.has(h));
const stale = [...declared].filter((h) => !built.has(h));
if (missing.length || stale.length)
  problems.push(
    `los hashes de script-src no coinciden con el build.\n` +
      `  Faltan en vercel.json: ${missing.join(' ') || '-'}\n` +
      `  Sobran en vercel.json: ${stale.join(' ') || '-'}`,
  );

if (problems.length) fail(problems.join('\n  '));
console.log(
  `\n✓ CSP: ${built.size} scripts inline con hash, sin estilos inline, recursos externos ni data: en el CSS\n`,
);
