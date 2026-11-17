import fs from 'node:fs';
import { decodePng, pngDiff } from './deterministic.mjs';
const B='lane-H-before/', A='lane-H-after/';
const files=['app-map-rest.png','app-strip-rest.png','gallery-menu-rest.png','gallery-overlay-rest.png'];
for (const f of files) {
  const pb=B+f, pa=A+f;
  if (!fs.existsSync(pb)||!fs.existsSync(pa)) { console.log(f, 'MISSING', fs.existsSync(pb), fs.existsSync(pa)); continue; }
  const b1=fs.readFileSync(pb), a1=fs.readFileSync(pa);
  const same=b1.equals(a1);
  const d=pngDiff(decodePng(b1), decodePng(a1));
  console.log(f.padEnd(28), 'bytesEqual='+same, 'size='+d.width+'x'+d.height, 'differing='+d.differing, 'pct='+d.pct, 'maxΔ='+d.maxChannelDelta, 'bbox='+JSON.stringify(d.bbox));
}
