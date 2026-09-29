/* ADAM/TOOL — scripts/extract-illusion-alpha.mjs · spline vector extractor */
// [plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-1}] · ALPHA wordmark: 6 VectorGeometry shapes → alpha-vectors.json
// Decode docs/assets/illusioncube/illusioncube.splinecode → walk scene.objects to the ALPHA Empty → its six
// VectorGeometry children in array order. Numbers verbatim: no rounding, no flipping, no normalization.
// Run: node scripts/extract-illusion-alpha.mjs [--from <file.splinecode>]  ·  --check byte-compares, exit 1 on drift.
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Unpackr, addExtension } from 'msgpackr';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(root, 'docs/assets/illusioncube/illusioncube.splinecode');
const OUT = join(root, 'public/cube-illusion/alpha/alpha-vectors.json');
const PAGE = 'https://my.spline.design/illusioncube-1e660ec82b20a77e5cc5dfd8f7b2074b/';
const ALPHA = 'd4616316-898c-46b4-8344-bac09b18fe39';
const args = process.argv.slice(2);
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
const check = args.includes('--check');
// — ext stubs 1–6, msgpackr decode, recursive {$ext,value} unwrap —
const mk = (t) => { const f = (p) => ({ $ext: t, payload: Array.from(p) }); f.read = (v) => ({ $ext: t, value: v }); return f; };
const unw = (v) => { let g = 0; while (v && typeof v === 'object' && '$ext' in v && 'value' in v && g < 30) { v = v.value; g++; } return v; };
const decode = (buf) => { for (const t of [1, 2, 3, 4, 5, 6]) addExtension({ type: t, unpack: mk(t) }); return new Unpackr({ structuredClone: true, useRecords: true }).unpack(buf); };
// — depth-first walk; the ALPHA Empty is found by id and carries no geometry —
const findAlpha = (arr) => {
for (const raw of arr) {
const n = unw(raw);
if (unw(n && n.id) === ALPHA) return n;
const kids = n && n.children && unw(n.children);
if (kids && kids.length) { const hit = findAlpha(kids); if (hit) return hit; }
}
return null;
};
// — one VectorGeometry child → {name, x, z, points[{p, cp, cn}]}, values verbatim —
const shapeOf = (child) => {
const d = unw(child.data) || {};
const pts = unw(unw(unw(d.geometry).shape).points) || [];
const xy = (p) => [p[0], p[1]];
return { name: d.name, x: d.position[0], z: d.position[2], points: pts.map((raw) => { const p = unw(raw.data); return { p: xy(p.position), cp: xy(p.controlPrevious.position), cn: xy(p.controlNext.position) }; }) };
};
// — payload: anchor (pos + scale) then shapes in array order; fixed key order by construction —
const extract = (buf) => {
const alpha = findAlpha(unw(unw(decode(buf).scene).objects));
if (!alpha) throw new Error('ALPHA node ' + ALPHA + ' not found');
const a = unw(alpha.data);
return { anchor: { pos: [a.position[0], a.position[1], a.position[2]], scale: a.scale[0] }, shapes: (unw(alpha.children) || []).map(shapeOf) };
};
const serialize = (data) => JSON.stringify(data, null, 1) + '\n';
// — source: local --from, else the cached splinecode, else a live fetch that refreshes the cache —
const source = async () => {
if (from) return fs.readFileSync(from);
if (fs.existsSync(CACHE)) return fs.readFileSync(CACHE);
const html = await (await fetch(PAGE)).text();
const a = html.indexOf('[', html.indexOf('app.start('));
const nums = html.slice(a + 1, html.indexOf(']', a)).split(',').map(Number);
const buf = Buffer.from(Uint8Array.from(nums));
fs.writeFileSync(CACHE, buf);
return buf;
};
// — main: table always; write, or --check byte-compare against the file —
const data = extract(await source());
const text = serialize(data);
const stat = (s) => {
const xs = s.points.map((q) => q.p[0]);
const ys = s.points.map((q) => q.p[1]);
const lo = Math.min.apply(null, xs);
const hi = Math.max.apply(null, xs);
return s.name + ' x=' + s.x + ' z=' + s.z + ' pts=' + s.points.length + ' x[' + lo + ',' + hi + '] w=' + (hi - lo) + ' y[' + Math.min.apply(null, ys) + ',' + Math.max.apply(null, ys) + ']';
};
const table = () => { for (const s of data.shapes) console.log(stat(s)); };
if (check) {
const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
if (cur !== text) {
if (!cur) { console.error('drift missing ' + OUT); process.exit(1); }
let old = null;
try { old = JSON.parse(cur); } catch { console.error('drift unreadable ' + OUT); process.exit(1); }
data.shapes.forEach((s, i) => { if (JSON.stringify(old.shapes[i]) !== JSON.stringify(s)) console.error('drift ' + s.name + ' @' + i); });
if (JSON.stringify(old.anchor) !== JSON.stringify(data.anchor)) console.error('drift anchor');
process.exit(1);
}
table();
console.log('check ok ' + OUT);
process.exit(0);
}
fs.mkdirSync(dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text);
table();
console.log('wrote ' + OUT + ' (' + Buffer.byteLength(text) + 'B)');
