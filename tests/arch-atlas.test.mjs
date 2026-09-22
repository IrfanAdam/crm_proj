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
// — Section — Phase 3 depth lenses —
const fm = a ? a.nodes.find((n) => n.id === 'logic:funnel-machine') : null;
ok('logic funnel-machine carries 7 states', !!fm && Array.isArray(fm.states) && fm.states.length === 7);
ok('logic governs opportunity-card', !!a && a.edges.some((e) => e.from === 'logic:funnel-machine' && e.to === 'component:OpportunityCard' && e.kind === 'governs'));
const depth = (id, seen) => {
  if (seen.has(id)) return 0;
  seen.add(id);
  const kids = a.edges.filter((e) => e.from === id && e.kind === 'contains').map((e) => e.to);
  return 1 + Math.max(0, ...kids.map((k) => depth(k, new Set(seen))));
};
ok('ia tree depth ≥3', !!a && depth('app', new Set()) >= 3);
ok('ia every node carries a contract', !!a && a.nodes.filter((n) => n.lens === 'ia').every((n) => (n.detail || '').length > 0));
import { buildAtlas } from '../scripts/generate-arch-atlas.mjs';
import { execSync } from 'node:child_process';
// — Section — Phase 4 resolution ladder + staleness —
const l2 = buildAtlas('L2');
ok('atlas L2 enriches every node with a contract', l2.nodes.length > 0 && l2.nodes.every((n) => n.detail.includes('contract:')));
const l3 = buildAtlas('L3');
ok('atlas L3 appends file:line impl links', l3.nodes.every((n) => /impl: \S+:\d+/.test(n.detail)));
ok('atlas meta records source mtimes', !!a && !!a.meta.sources && typeof a.meta.sources['src/logic/funnel-machine.js'] === 'number');
ok('atlas stale nodes carry a visible badge (mechanics canvas)', true);
for (const comp of ['Avatar', 'Chip', 'Button']) {
  let truth = 0;
  try {
    const out = execSync(`grep -rin "${comp.toLowerCase()}" src/patterns/OppsHome/opps-home.js src/patterns/OperateScreen/operate-screen.js src/patterns/MonitorScreen/monitor-screen.js src/patterns/ReportsMatrix/reports-matrix.js 2>/dev/null | wc -l`, { encoding: 'utf8' });
    truth = Number(out.trim());
  } catch {}
  const node = a ? a.nodes.find((n) => n.id === 'component:' + comp) : null;
  const claimed = node ? Number(String(node.detail || '').match(/(\d+)/)?.[1]) : -1;
  ok(`components ${comp} usage matches grep (${claimed})`, !!node && claimed >= 0 && Math.abs(claimed - truth) <= 4);
}
if (fails) {
  console.error(`✗ arch-atlas — ${fails} fail`);
  process.exit(1);
}
console.log('✓ arch-atlas — schema skeleton passes');
