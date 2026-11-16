/* vite plugin — collapse index.html's classic gem <script> manifest into ONE deferred asset.
   Extracted from vite.config.js for the 100-line budget; behaviour unchanged. index.html keeps the 23 classic
   gem <script> tags as the ordered manifest (document order is the contract); this is what the browser loads. */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const THREE_VENDOR = 'public/vendor/three.min.js';
const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js';
const GEM_BOOT_URL = '/vendor/gem-boot.js';
const APP_ENTRY = resolve(ROOT, 'index.html');
export const isAppEntry = (ctx) => Boolean(ctx && ctx.filename && resolve(ctx.filename) === APP_ENTRY);
// dev rewrites src="src/…" to src="/src/…" before plugin html transforms, so the leading slash is optional
const GEM_TAG_RE = /<script src="\/?(src\/components\/GemReward\/[^"]+\.js)"><\/script>\s*/g;

function gemSources() {
  const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
  const list = [...html.matchAll(GEM_TAG_RE)].map((m) => m[1]);
  if (list.length < 20) throw new Error(`gem-boot: expected ~23 gem sources in index.html, found ${list.length}`);
  for (const f of list) if (!existsSync(resolve(ROOT, f))) throw new Error(`gem-boot: missing source ${f}`);
  return list;
}

function gemBootContent(list) {
  const parts = list.map((f) => {
    const code = readFileSync(resolve(ROOT, f), 'utf8')
      .replace(/^\uFEFF/, '')
      .replace(/^\/\/# sourceMappingURL=.*$/gm, '');
    return `/* ---- ${f} ---- */\n${code}`;
  });
  // classic scripts share one global scope either way; `;` between files keeps ASI honest.
  return (
    '/* gem-boot — generated from index.html document order by scripts/vite/gem-boot.mjs. Edit the sources, not this file. */\n' +
    parts.join('\n;\n') +
    '\n'
  );
}

export function gemBootPlugin() {
  let cached = null; // { body, hash }
  const build = (fresh) => {
    if (!cached || fresh) {
      const body = gemBootContent(gemSources());
      cached = { body, hash: createHash('sha1').update(body).digest('hex').slice(0, 10) };
    }
    return cached;
  };
  const tag = (hash) => `<script defer src="${GEM_BOOT_URL}?v=${hash}"></script>`;
  return {
    name: 'gem-boot',
    buildStart() {
      try {
        assertThree();
        build();
      } catch (e) {
        this.error(e.message);
      }
    },
    configureServer(server) {
      assertThree();
      server.middlewares.use((req, res, next) => {
        if ((req.url || '').split('?')[0] !== GEM_BOOT_URL) return next();
        const { body, hash } = build(true); // fresh per request: dev edits show up immediately
        const etag = `W/"${hash}"`;
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, must-revalidate'); // revalidate, never a stale body
        res.setHeader('ETag', etag);
        if (req.headers['if-none-match'] === etag) {
          res.statusCode = 304;
          return res.end();
        }
        res.setHeader('Content-Length', Buffer.byteLength(body));
        res.end(body);
      });
    },
    transformIndexHtml(html, ctx) {
      if (!isAppEntry(ctx)) return html; // other MPA pages keep their own classic lists
      const { hash } = build(Boolean(ctx && ctx.server)); // dev: fresh hash per request (cache-bust)
      let first = true;
      return html.replace(GEM_TAG_RE, () => (first ? ((first = false), tag(hash)) : ''));
    },
    generateBundle() {
      const { body } = build();
      this.emitFile({ type: 'asset', fileName: GEM_BOOT_URL.slice(1), source: body });
    },
  };
}

export function assertThree() {   // vendor guard: a missing/truncated three.min.js must fail loudly, not render a dead gem
  const st = statSync(resolve(ROOT, THREE_VENDOR), { throwIfNoEntry: false });
  if (!st || st.size < 500000) {
    throw new Error(
      `vendor guard: ${THREE_VENDOR} is missing or truncated (three r160 UMD should be ~669 KB).\n` +
        `  Re-vendor it with: curl -fsSL ${THREE_CDN} -o ${THREE_VENDOR}`,
    );
  }
}
