/* ADAM/TOOL — tests/atlas-render.test.mjs · svg output [plan:2026-09-22_082844-arch-atlas.md#phase-2] */
// — asserts: 3 edge kinds, titled nodes, sourced detail —
import { renderAtlas, renderDetail } from '../src/arch/atlas-render.js';
import { layoutLens } from '../src/arch/atlas-layout.js';
let fails = 0;
const ok = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) fails++;
};
const nodes = [
  { id: 'a', lens: 'logic', title: 'A & B', source: 'src/logic/a.js', detail: 'does a' },
  { id: 'b', lens: 'ia', title: 'B', source: 'index.html', detail: '' },
];
const edges = [
  { from: 'a', to: 'b', kind: 'contains' },
  { from: 'a', to: 'b', kind: 'governs' },
  { from: 'b', to: 'a', kind: 'composes' },
  { from: 'a', to: 'b', kind: 'mystery' },
];
const svg = renderAtlas(nodes, layoutLens(nodes), edges);
ok('renders one svg root', svg.startsWith('<svg') && svg.endsWith('</svg>'));
ok('every node carries a title', nodes.every((n) => svg.includes('<title>')));
ok('unknown edge kinds dropped', !svg.includes('mystery') && (svg.match(/class="atlas-edge"/g) || []).length === 3);
ok('ampersands escaped', svg.includes('A &amp; B'));
const detail = renderDetail(nodes[0]);
ok('detail names title + source', detail.includes('A &amp; B') && detail.includes('src/logic/a.js'));
ok('empty detail prompts', renderDetail(null).includes('Pick a node'));
if (fails) {
  console.error(`✗ atlas-render — ${fails} fail`);
  process.exit(1);
}
console.log('✓ atlas-render — svg + detail pass');
