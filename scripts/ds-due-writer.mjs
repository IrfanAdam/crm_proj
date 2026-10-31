// scripts/ds-due-writer.mjs — dev/preview-only plan Due writer plugin.
// POST /__ds/due {file, head, due} edits the live section body in the plan
// file (filenames locked, no paths/traversal). Static builds have no writer —
// the client keeps a localStorage override layer. Extracted from vite.config.js.
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolveHead, applyDueEdit } from '../src/pitch/changelog/due-core.js';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLAN_RE = /^\d{4}-\d{2}-\d{2}[_-].+\.md$/;
const DUE_RE = /^(20\d{2}-\d{2}-\d{2})?$/;
const json = (res, code, obj) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(obj));
};
const handle = (req, res) => {
  if (req.method !== 'POST' || req.url.split('?')[0] !== '/__ds/due') return false;
  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > 65536) req.destroy(); });
  req.on('end', () => {
    let q = null;
    try { q = JSON.parse(raw || '{}'); } catch { return json(res, 400, { ok: false, error: 'parse' }); }
    const file = String((q && q.file) || '');
    const head = String((q && q.head) || '');
    const due = String((q && q.due) || '');
    if (file.includes('..') || file.includes('/') || !PLAN_RE.test(file) || !DUE_RE.test(due)) {
      return json(res, 400, { ok: false, error: 'shape' });
    }
    const path = resolve(root, '.hermes/plans', file);
    if (!existsSync(path)) return json(res, 404, { ok: false, error: 'head-not-found' });
    const md = readFileSync(path, 'utf8');
    const canon = resolveHead(md, head);
    if (!canon) return json(res, 404, { ok: false, error: 'head-not-found' });
    const next = applyDueEdit(md, canon, due);
    if (next === null || next === md) return json(res, 200, { ok: true, head: canon, unchanged: true, content: md });
    writeFileSync(path, next);
    return json(res, 200, { ok: true, head: canon, content: next });
  });
  return true;
};
export function dsDueWriter() {
  const mount = (server) => { server.middlewares.use((req, res, next) => { if (!handle(req, res)) next(); }); };
  return { name: 'ds-due-writer', configureServer: mount, configurePreviewServer: mount };
}
