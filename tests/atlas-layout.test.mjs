/* ADAM/TOOL — tests/atlas-layout.test.mjs · layout math [plan:2026-09-22_082844-arch-atlas.md#phase-2] */
// — pure asserts: deterministic lanes, lens neighborhoods —
import { layoutLens, lensGraph } from '../src/arch/atlas-layout.js';
let fails = 0;
const ok = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) fails++;
};
const nodes = [{ id: 'b' }, { id: 'a' }, { id: 'c' }];
const p1 = layoutLens(nodes);
const p2 = layoutLens(nodes);
ok('layout is deterministic', JSON.stringify([...p1]) === JSON.stringify([...p2]));
ok('layout sorts by id', p1.get('a').y < p1.get('b').y && p1.get('b').y < p1.get('c').y);
ok('layout cards share width', p1.get('a').w === p1.get('b').w);
const atlas = {
  nodes: [{ id: 'logic:funnel-machine', lens: 'logic' }, { id: 'screen:OppsHome', lens: 'ia' }, { id: 'logic:temporal', lens: 'logic' }],
  edges: [{ from: 'logic:funnel-machine', to: 'screen:OppsHome', kind: 'governs' }],
};
const g = lensGraph(atlas, 'logic');
ok('lens keeps focus nodes', g.nodes.some((n) => n.id === 'logic:temporal'));
ok('lens pulls 1-hop neighbors', g.nodes.some((n) => n.id === 'screen:OppsHome'));
ok('lens keeps bridging edges', g.edges.length === 1);
if (fails) {
  console.error(`✗ atlas-layout — ${fails} fail`);
  process.exit(1);
}
console.log('✓ atlas-layout — lanes + neighborhoods pass');
