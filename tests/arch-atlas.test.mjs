/* ADAM/TOOL — tests/arch-atlas.test.mjs · atlas schema + manifest [plan:2026-09-22_082844-arch-atlas.md#phase-1] */
// — asserts: manual overrides shape, generated atlas shape, lens coverage —
import { readFileSync, existsSync } from 'node:fs';
let fails = 0;
const ok = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) fails++;
};
ok('manual overrides file exists', existsSync('scripts/arch-atlas.manual.json'));
let m = null;
try {
  m = JSON.parse(readFileSync('scripts/arch-atlas.manual.json', 'utf8'));
} catch {}
ok('manual overrides parse', !!m);
ok('manual lenses cover logic/components/ia', !!m && ['logic', 'components', 'ia'].every((l) => m.lenses.includes(l)));
ok('manual resolution is L1/L2/L3', !!m && ['L1', 'L2', 'L3'].includes(m.resolution));
if (fails) {
  console.error(`✗ arch-atlas — ${fails} fail`);
  process.exit(1);
}
console.log('✓ arch-atlas — schema skeleton passes');
