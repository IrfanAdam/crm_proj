/* ADAM/SHARED — src/arch/lens-decisions.js · decisions lens detail [plan:2026-09-22_155000-architecture-mechanics.md#phase-3] */
// — Exports: detailDecisions(node, graph) → enriched HTML —
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
export function detailDecisions(node, graph) {
  if (!node) return '<p>Pick a node to read its contract.</p>';
  const edges = graph?.EDGES || graph?.edges || [];
  const label = node.label || node.title;
  const governs = edges.filter((e) => e.from === node.id && e.kind === 'data' && e.label === 'governs').map((e) => esc(e.to)).join(', ') || '—';
  const governedBy = edges.filter((e) => e.to === node.id && e.kind === 'data' && e.label === 'governs').map((e) => esc(e.from)).join(', ') || '—';
  const contains = edges.filter((e) => e.from === node.id && e.label === 'contains').map((e) => esc(e.to)).join(', ') || '—';
  const containedBy = edges.filter((e) => e.to === node.id && e.label === 'contains').map((e) => esc(e.from)).join(', ') || '—';
  const src = node.file || node.source || 'docs/decisions';
  return `<h3>${esc(label)}</h3><p>Rationale: ${esc(node.desc || 'No rationale recorded.')}</p><p>Governs: ${governs}</p><p>Governed by: ${governedBy}</p><p>Contains: ${contains} · Contained by: ${containedBy}</p><p>Source: <code>${esc(src)}</code></p>`;
}
