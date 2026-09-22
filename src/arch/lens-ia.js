/* ADAM/SHARED — src/arch/lens-ia.js · ia lens detail [plan:2026-09-22_082844-arch-atlas.md#phase-3] */
// — Exports: detailIA(node, atlas) → containment + contract —
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// — Section — path walk (root → node via contains) —
function pathTo(node, atlas) {
  const edges = atlas?.edges || [];
  const chain = [node.id];
  let cur = node.id;
  for (let i = 0; i < 6; i++) {
    const parent = edges.find((e) => e.to === cur && e.kind === 'contains');
    if (!parent) break;
    chain.unshift(parent.from);
    cur = parent.from;
  }
  return chain;
}
// — Section — ia detail (path + children + contract) —
export function detailIA(node, atlas) {
  if (!node) return '<p>Pick a node to read its contract.</p>';
  const edges = atlas?.edges || [];
  const kids = edges.filter((e) => e.from === node.id && e.kind === 'contains').map((e) => esc(e.to));
  const path = pathTo(node, atlas).map(esc).join(' → ');
  return `<h3>${esc(node.title)}</h3><p>Path: <code>${path}</code></p><p>Contract: ${esc(node.detail || 'reads/writes via mount(page); events in/out over app-tab.')}</p><p>Contains: ${kids.join(', ') || 'leaf'}</p><p>Source: <code>${esc(node.source)}</code></p>`;
}
