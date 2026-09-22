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
ok('atlas single content container', html.includes('id="atlas-canvas"') && !html.includes('id="atlas-detail"'));
for (const lens of ['logic', 'components', 'ia', 'truth']) ok(`atlas nav offers ${lens} lens`, html.includes(`data-lens="${lens}"`));
ok('atlas has no separate detail card', !html.includes('atlas-detail'));
ok('atlas composer script linked', html.includes('src/arch/atlas.js'));
ok('atlas nav lives in left arch stack', html.indexOf('id="atlas-nav"') > html.indexOf('id="ws-arch-stack"') && html.indexOf('id="atlas-nav"') < html.indexOf('id="panel-architecture"'));
const panel = html.slice(html.indexOf('id="panel-architecture"'));
ok('atlas canvas fills right panel', panel.includes('id="atlas-canvas"') && !panel.includes('data-lens='));
const rail = html.slice(html.indexOf('id="ws-arch-stack"'), html.indexOf('id="panel-architecture"'));
ok('atlas truth is a lens tab, not an accordion', rail.includes('data-lens="truth"') && !html.includes('<details'));
if (fails) {
  console.error(`✗ atlas-shell — ${fails} fail`);
  process.exit(1);
}
console.log('✓ atlas-shell — mounts pass');
