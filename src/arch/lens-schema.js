/* ADAM/SHARED — src/arch/lens-schema.js · schema lens detail [plan:2026-09-22_155000-architecture-mechanics.md#phase-3] */
// — Exports: detailSchema(node, graph) → enriched HTML —
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
export function detailSchema(node, graph) {
  if (!node) return '<p>Pick a node to read its contract.</p>';
  const edges = graph?.EDGES || graph?.edges || [];
  const label = node.label || node.title;
  const containsOut = edges.filter((e) => e.from === node.id && e.label === 'contains').map((e) => esc(e.to)).join(', ') || '—';
  const containsIn = edges.filter((e) => e.to === node.id && e.label === 'contains').map((e) => esc(e.from)).join(', ') || '—';
  const governs = edges.filter((e) => e.from === node.id && e.label === 'governs').map((e) => esc(e.to)).join(', ') || '—';
  const signalOut = edges.filter((e) => e.from === node.id && e.kind === 'signal').map((e) => esc(e.label || e.to)).join(', ') || '—';
  const signalIn = edges.filter((e) => e.to === node.id && e.kind === 'signal').map((e) => esc(e.from)).join(', ') || '—';
  const src = node.file || node.source || 'DESIGN.md';
  const kindLine = `<p>Kind: <code>${esc(node.kind || 'entity')}</code> · group: <code>${esc(node.group || '')}</code></p>`;
  let body = '';
  if (node.group === 'entities' || node.sub === 'entity') {
    body = `<p>Entity → fields: ${containsOut}</p><p>Governs: ${governs !== '—' ? governs : '—'}</p><p>Signal fills: ${signalOut !== '—' ? signalOut : '—'}</p>`;
  } else if (node.group === 'fields' || node.sub === 'field') {
    body = `<p>Field of: ${containsIn}</p><p>Filled by / governs: ${signalIn !== '—' ? signalIn : governs}</p>`;
  } else if (node.group === 'categories' || node.sub === 'gem' || node.sub === 'signal') {
    body = `<p>Category → fields via signal: ${signalOut}</p><p>Contained by flows via: ${containsIn}</p>`;
  } else {
    body = `<p>Contains: ${containsOut}</p><p>Governs: ${governs}</p><p>Signal: ${signalOut}</p>`;
  }
  return `<h3>${esc(label)}</h3><p>${esc(node.desc || '')}</p>${kindLine}${body}<p>Source: <code>${esc(src)}</code></p>`;
}
