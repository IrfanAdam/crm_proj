/* ADAM/SHARED — src/arch/lens-components.js · components lens detail [plan:2026-09-22_082844-arch-atlas.md#phase-3] */
// — Exports: detailComponents(node, atlas) → usage + gallery —
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// — Section — component detail (usage, unused, screens, gallery) —
export function detailComponents(node, atlas) {
  if (!node) return '<p>Pick a node to read its contract.</p>';
  const edges = atlas?.edges || [];
  const screens = edges.filter((e) => e.to === node.id && e.kind === 'composes').map((e) => esc(e.from));
  const m = String(node.detail || '').match(/(\d+)/);
  const uses = m ? Number(m[1]) : 0;
  const flag = uses === 0 ? '<p>Unused in current patterns.</p>' : '';
  const name = String(node.id).split(':')[1] || node.title;
  return `<h3>${esc(node.title)}</h3><p>${uses} referencing lines in patterns.</p>${flag}<p>Composed by: ${screens.join(', ') || '—'}</p><p>Source: <code>${esc(node.source)}</code> · Gallery: <code>gallery.html#${esc(name)}</code></p>`;
}
