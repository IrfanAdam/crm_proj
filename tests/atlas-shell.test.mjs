/* ADAM/TOOL — tests/atlas-shell.test.mjs · atlas mounts [plan:2026-09-22_082844-arch-atlas.md#phase-2] */
// — asserts: nav + canvas + detail mounts exist in index.html —
import { readFileSync } from 'node:fs';
let fails = 0;
const ok = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) fails++;
};
const html = readFileSync('index.html', 'utf8');
ok('atlas nav mount with tree role', html.includes('id="atlas-nav"') && html.includes('role="tree"'));
ok('atlas canvas mount with img role', html.includes('id="atlas-canvas"') && html.includes('role="img"'));
for (const lens of ['logic', 'components', 'ia']) ok(`atlas nav offers ${lens} lens`, html.includes(`data-lens="${lens}"`));
ok('atlas detail mount', html.includes('id="atlas-detail"'));
ok('atlas composer script linked', html.includes('src/arch/atlas.js'));
if (fails) {
  console.error(`✗ atlas-shell — ${fails} fail`);
  process.exit(1);
}
console.log('✓ atlas-shell — mounts pass');
