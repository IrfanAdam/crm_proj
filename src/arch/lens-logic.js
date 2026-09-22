/* ADAM/SHARED — src/arch/lens-logic.js · logic lens detail [plan:2026-09-22_155000-architecture-mechanics.md#phase-3] */
// — Exports: detailLogic(node, graph) → enriched HTML —
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
export function detailLogic(node, graph) {
  if (!node) return '<p>Pick a node to read its contract.</p>';
  const edges = graph?.EDGES || graph?.edges || [];
  const governed = edges.filter((e) => e.from === node.id && (e.label === 'governs' || (e.kind === 'data' && e.label === 'governs')));
  // broader: any data label governs from this node
  const govTargets = (governed.length ? governed : edges.filter((e) => e.from === node.id && e.kind === 'data')).map((e) => esc(e.to)).join(', ') || '—';
  const signals = edges.filter((e) => e.from === node.id && e.kind === 'signal').map((e) => esc(e.label || e.to)).join(', ') || '—';
  const states = Array.isArray(node.states) ? node.states : null;
  const stateLine = states ? `<p>States: <code>${states.map(esc).join(' → ')}</code></p>` : node.sub === 'funnel state' ? '<p>State: <code>funnel-machine</code> governs this state.</p>' : '';
  const label = node.label || node.title;
  const src = node.file || node.source || 'src/logic/funnel-machine.js';
  const rule = node.id === 'funnelMachine'
    ? '<p>Rule: transient vs temporal · <code>sliceTemporal</code> + <code>filterTransient</code> · bridge <code>app-tab</code>.</p>'
    : node.sub === 'funnel state'
      ? '<p>Rule: signal <code>NEXT</code> chain · data both to temporal/transient.</p>'
      : '<p>Rule: temporal/transient split + NEXT chain + time-scale.</p>';
  return `<h3>${esc(label)}</h3>${stateLine}${rule}<p>Governs: ${govTargets}</p><p>NEXT / signal: ${signals}</p><p>Source: <code>${esc(src)}:1</code></p>`;
}
