/* ADAM/SHARED — src/arch/lens-logic.js · logic lens detail [plan:2026-09-22_082844-arch-atlas.md#phase-3] */
// — Exports: detailLogic(node, atlas) → enriched HTML —
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// — Section — logic detail (states + governs + source) —
export function detailLogic(node, atlas) {
  if (!node) return '<p>Pick a node to read its contract.</p>';
  const states = Array.isArray(node.states) ? node.states : [];
  const governed = (atlas?.edges || []).filter((e) => e.from === node.id && e.kind === 'governs');
  const targets = governed.map((e) => esc(e.to)).join(', ') || 'Opportunity surface';
  const stateLine = states.length ? `<p>States: <code>${states.map(esc).join(' → ')}</code></p>` : '';
  const rule = '<p>Rule: transient vs temporal · bridge: <code>app-tab</code> event.</p>';
  return `<h3>${esc(node.title)}</h3>${stateLine}${rule}<p>Governs: ${targets}</p><p>Source: <code>${esc(node.source)}:1</code></p>`;
}
