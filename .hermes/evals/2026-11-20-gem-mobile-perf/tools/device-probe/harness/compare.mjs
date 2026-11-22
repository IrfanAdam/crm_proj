/* compare.mjs — E5 device-probe harness (kept next to the probe it tests).
 * Run from this directory: `node compare.mjs …`. Pure file diff, no browser.
 * ROGUE_ROOT defaults to <tmp>/e5-probe-runs so Chrome profiles and shots never land in the repo tree.
 */
import os from 'node:os';
import path from 'node:path';
process.env.ROGUE_ROOT = process.env.ROGUE_ROOT || path.join(os.tmpdir(), 'e5-probe-runs');   // Chrome profiles + shots stay out of the repo

import fs from 'node:fs';
const pairs = [
  ['gallery-dpr3', 'shots/pre2-gallery-dpr3.raw', 'shots/post-gallery-dpr3.raw'],
  ['gallery-dpr2', 'shots/pre2-gallery-dpr2.raw', 'shots/post-gallery-dpr2.raw'],
  ['pitch-dpr3', 'shots/pre2-pitch-dpr3.raw', 'shots/post-pitch-dpr3.raw'],
  ['pitch-dpr2', 'shots/pre2-pitch-dpr2.raw', 'shots/post-pitch-dpr2.raw'],
];
const out = [];
for (const [name, a, b] of pairs) {
  if (!fs.existsSync(a) || !fs.existsSync(b)) { out.push({ name, missing: [a, b].filter((p) => !fs.existsSync(p)) }); continue; }
  const A = fs.readFileSync(a), B = fs.readFileSync(b);
  if (A.length !== B.length) { out.push({ name, mismatch: [A.length, B.length] }); continue; }
  let n = 0, mx = 0, sum = 0;
  for (let i = 0; i < A.length; i += 4) {
    const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
    if (d > 2) n++; if (d > mx) mx = d; sum += d;
  }
  const px = A.length / 4;
  out.push({ name, bytes: A.length, px, over2: n, pct: +(100 * n / px).toFixed(6), max: mx, meanDelta: +(sum / px).toFixed(4) });
}
console.log(JSON.stringify(out, null, 1));
