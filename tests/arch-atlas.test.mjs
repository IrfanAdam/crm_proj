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
// — Section — generated manifest (Task 2: generate-arch-atlas.mjs) —
ok('atlas manifest exists', existsSync('src/arch/atlas.json'));
let a = null;
try {
  a = JSON.parse(readFileSync('src/arch/atlas.json', 'utf8'));
} catch {}
ok('atlas manifest parses', !!a);
ok('atlas nodes carry id/lens/title/source', !!a && a.nodes.every((n) => n.id && n.lens && n.title && n.source));
ok('atlas edges carry from/to/kind', !!a && a.edges.every((e) => e.from && e.to && e.kind));
ok('atlas meta stamps generatedAt', !!a && !!a.meta && !!a.meta.generatedAt);
const lensCount = (l) => (a ? a.nodes.filter((n) => n.lens === l).length : 0);
ok('atlas logic lens covers ≥3', lensCount('logic') >= 3);
ok('atlas components lens covers ≥10', lensCount('components') >= 10);
ok('atlas ia lens covers ≥5', lensCount('ia') >= 5);
if (fails) {
  console.error(`✗ arch-atlas — ${fails} fail`);
  process.exit(1);
}
console.log('✓ arch-atlas — schema skeleton passes');
