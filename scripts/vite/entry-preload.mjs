/* vite plugins — entry modulepreload + raw source refs. Extracted from vite.config.js for the file budget. */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, statSync, existsSync } from 'node:fs';
import { isAppEntry } from './gem-boot.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function entryPreloadPlugin() {
  // The module entry is the last script in <body>; preload it from <head> so it is discovered with the
  // document instead of after the classic gem stack. In dev the source path is stable, in the build the
  // chunk name is only known once the HTML is finalised — so wrap the built HTML in closeBundle rather
  // than letting Vite inline ./src/glass/main.jsx as a data: URI asset.
  let outDir = 'dist';
  const ENTRY = '/src/glass/main.jsx';
  return {
    name: 'entry-preload',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    transformIndexHtml(html, ctx) {
      return ctx && ctx.server && isAppEntry(ctx)
        ? html.replace('</head>', `<link rel="modulepreload" href="${ENTRY}"/></head>`)
        : html;
    },
    closeBundle() {
      const file = resolve(ROOT, outDir, 'index.html');
      if (!existsSync(file)) return; // aborted build — let the original error surface
      const html = readFileSync(file, 'utf8');
      const entry = html.match(/<script type="module"[^>]*src="([^"]+)"/);
      if (!entry) throw new Error('entry-preload: no module entry script in built index.html');
      if (html.includes('rel="modulepreload" crossorigin href="' + entry[1] + '"')) return;
      const link = `<link rel="modulepreload" crossorigin href="${entry[1]}"/>`;
      writeFileSync(file, html.replace('</head>', `${link}</head>`));
      console.log(`entry-preload — preloading ${entry[1]}`);
    },
  };
}

export function rawSourceRefsPlugin() {
  // The DS gallery and the preview load their scripts as classic <script src="src/…">, which Vite leaves
  // untouched in the build (only module scripts and stylesheets get rewritten). Without the files themselves
  // in dist/ every one of those scripts 404s in a deployment — dead sidebar, no panels. Copy what the built
  // HTML still points at, verbatim, at the same relative path. outDir is read from the resolved config so a
  // scratch `--outDir` build copies into that dir instead of a hardcoded dist.
  let outDir = 'dist';
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
  return {
    name: 'raw-source-refs',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const dist = resolve(ROOT, outDir);
      if (!existsSync(dist)) return;
      const refs = new Set();
      for (const file of walk(dist).filter((f) => f.endsWith('.html'))) {
        for (const m of readFileSync(file, 'utf8').matchAll(/(?:src|href)="(?:\/)?((?:src)\/[^"]+)"/g)) refs.add(m[1]);
      }
      let copied = 0;
      for (const ref of refs) {
        if (!statSync(ref, { throwIfNoEntry: false })) continue;
        const dest = `${dist}/${ref}`;
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(ref, dest);
        copied++;
      }
      if (copied) console.log(`raw-source-refs — copied ${copied} raw source files into ${outDir}/`);
    },
  };
}
