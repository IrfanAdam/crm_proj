/* ADAM/TOOL — scripts/extract-illusion-textures.mjs · spline JPEG extractor */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-3}] · Task 16: fetch/--from/--check.
// — Decode: page app.start array → splinecode → msgpackr → shared.images JPEGs —
// Export map: run with node (no imports); writes public/cube-illusion/textures/*.jpg
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Unpackr, addExtension } from 'msgpackr';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'public/cube-illusion/textures');
const CACHE = join(root, 'docs/assets/illusioncube/illusioncube.splinecode');
const PAGE = 'https://my.spline.design/illusioncube-1e660ec82b20a77e5cc5dfd8f7b2074b/';
const IDS = ['7b83617b-037e-49b5-8c02-9f88e3fb82cf', '61a09fba-b94f-4145-ae08-eca8fc42eb93', 'matcap_0', 'matcap_4', 'matcap_5', 'matcap_reflection'];
const args = process.argv.slice(2);
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
const check = args.includes('--check');
// — JPEG size from the SOF marker —
const dims = function (b) {
let i = 2;
while (i < b.length - 9) {
if (b[i] !== 0xff) { i++; continue; }
const m = b[i + 1];
if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
i += 2 + b.readUInt16BE(i + 2);
}
return [0, 0];
};
// — Decode a splinecode buffer to id → JPEG bytes —
const mk = function (t) {
const f = function (payload) { return { $ext: t, payload: Array.from(payload) }; };
f.read = function (v) { return { $ext: t, value: v }; };
return f;
};
const decode = function (buf) {
for (const t of [1, 2, 3, 4, 5, 6]) addExtension({ type: t, unpack: mk(t) });
const doc = new Unpackr({ structuredClone: true, useRecords: true }).unpack(buf);
const unw = function (v) {
let g = 0;
while (v && typeof v === 'object' && '$ext' in v && 'value' in v && g < 30) { v = v.value; g++; }
return v;
};
const images = unw(unw(doc.shared).images) || {};
const out = {};
for (const [k, v] of Object.entries(images)) {
const raw = unw(v).data;
out[k] = Buffer.from(raw.data ?? raw);
}
return out;
};
// — Source: cached file or live fetch (fetch also refreshes the cache) —
const source = async function () {
if (from) return fs.readFileSync(from);
const html = await (await fetch(PAGE)).text();
const a = html.indexOf('[', html.indexOf('app.start('));
const nums = html.slice(a + 1, html.indexOf(']', a)).split(',').map(Number);
const buf = Buffer.from(Uint8Array.from(nums));
fs.writeFileSync(CACHE, buf);
return buf;
};
// — Main —
const found = decode(await source());
let bad = 0;
for (const id of IDS) {
const b = found[id];
if (!b || b[0] !== 0xff || b[1] !== 0xd8) { console.error('missing ' + id); bad++; continue; }
const dest = join(OUT, id + '.jpg');
if (check) {
const cur = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
if (!cur || !cur.equals(b)) { console.error('drift ' + id); bad++; continue; }
} else {
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(dest, b);
}
const size = dims(b);
console.log(id + ' ' + b.length + 'B ' + size[0] + 'x' + size[1]);
}
if (bad) process.exit(1);
