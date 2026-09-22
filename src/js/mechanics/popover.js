import { EDGES, NODES, getMode } from './graph.js';
const KIND_TOKEN = { call: '--stone-500', data: '--violet-600', signal: '--amber-600' };
const ACCESS_LABEL = { read: 'reads', write: 'writes', both: 'reads + writes' };
const esc = s => String(s ?? '').replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]));
const byId = id => NODES.find(m => m.id === id);
function badge(e, other, dir) {
  const both = e.kind === 'data' && e.access === 'both';
  const arrow = both ? '↔' : dir === 'out' ? '→' : '←';
  const name = esc(other?.label || (dir === 'out' ? e.to : e.from));
  const access = e.kind === 'data' ? (ACCESS_LABEL[e.access] || 'reads') + (e.label ? ` — ${e.label}` : '') : (e.label || e.kind);
  const sub = esc(access);
  return `<span class="mech-rel" title="${sub} · ${e.kind}${e.access ? '/' + e.access : ''}"><i style="background:var(${KIND_TOKEN[e.kind] || '--stone-500'})"></i>${arrow}&nbsp;${name}</span>`;
}
function section(title, list, dir) {
  if (!list.length) return '';
  return `<div class="mech-rels"><span class="mech-rels-label">${title} (${list.length})</span>${list.map(e => badge(e, byId(dir === 'out' ? e.to : e.from), dir)).join('')}</div>`;
}
export function nodeTipHTML(n, kinds) {
  const mode = (typeof getMode === 'function' ? getMode() : 'logic');
  const kindLabel = kinds?.[n.kind]?.label || n.kind;
  let extra = '';
  if (mode === 'logic') {
    const governs = EDGES.filter(e => e.from === n.id && e.kind === 'data').map(e => byId(e.to)?.label || e.to).join(', ') || '—';
    const next = EDGES.filter(e => e.from === n.id && e.kind === 'signal').map(e => e.label || byId(e.to)?.label || e.to).join(', ') || '—';
    const both = EDGES.filter(e => (e.from === n.id || e.to === n.id) && e.access === 'both').length ? ' ↔ both' : '';
    const rule = n.group === 'states' ? 'transient vs temporal · NEXT chain' + both : n.id === 'temporal' ? 'sliceTemporal governs display' : n.id === 'transient' ? 'filterTransient: now-only' : n.group === 'rules' ? 'Rule: governs temporal/transient + NEXT' : 'Funnel machine law · States→Governs→NEXT';
    extra = `<span style="margin-top:var(--space-2);line-height:var(--leading-normal)">States→Governs: ${esc(governs)} · NEXT/signal: ${esc(next)} · ${esc(rule)}</span>` + section('Out', EDGES.filter(e => e.from === n.id), 'out') + section('In', EDGES.filter(e => e.to === n.id), 'in');
  } else if (mode === 'schema') {
    const containsOut = EDGES.filter(e => e.from === n.id && e.label === 'contains').map(e => esc(byId(e.to)?.label || e.to)).join(', ') || '—';
    const containsIn = EDGES.filter(e => e.to === n.id && e.label === 'contains').map(e => esc(byId(e.from)?.label || e.from)).join(', ') || '—';
    const governs = EDGES.filter(e => e.from === n.id && e.label === 'governs').map(e => esc(byId(e.to)?.label || e.to)).join(', ') || '—';
    const signalOut = EDGES.filter(e => e.from === n.id && e.kind === 'signal').map(e => esc(e.label || byId(e.to)?.label || e.to)).join(', ') || '—';
    let body = '';
    if (n.group === 'entities' || n.sub === 'entity') body = `Entity → fields: ${containsOut} · Governs: ${governs} · Signal fills: ${signalOut}`;
    else if (n.group === 'fields' || n.sub === 'field') body = `Field of: ${containsIn} · Governs/signal: ${governs !== '—' ? governs : signalOut}`;
    else if (n.group === 'categories' || n.sub === 'gem' || n.sub === 'signal') body = `Category → fields via signal: ${signalOut}`;
    else if (n.group === 'flows') body = `Flow → entities: ${governs !== '—' ? governs : containsOut}`;
    else body = `Contains: ${containsOut} · Governs: ${governs} · Signal: ${signalOut}`;
    extra = `<span style="margin-top:var(--space-2);line-height:var(--leading-normal)">${body}</span>` + section('Out', EDGES.filter(e => e.from === n.id), 'out') + section('In', EDGES.filter(e => e.to === n.id), 'in');
  } else if (mode === 'decisions') {
    const governs = EDGES.filter(e => e.from === n.id && e.kind === 'data' && e.label === 'governs').map(e => esc(byId(e.to)?.label || e.to)).join(', ') || '—';
    const governedBy = EDGES.filter(e => e.to === n.id && e.kind === 'data' && e.label === 'governs').map(e => esc(byId(e.from)?.label || e.from)).join(', ') || '—';
    const contains = EDGES.filter(e => e.from === n.id && e.label === 'contains').map(e => esc(byId(e.to)?.label || e.to)).join(', ') || '—';
    const containedBy = EDGES.filter(e => e.to === n.id && e.label === 'contains').map(e => esc(byId(e.from)?.label || e.from)).join(', ') || '—';
    extra = `<span style="margin-top:var(--space-2);line-height:var(--leading-normal)">Decision → Governs: ${esc(governs)} · Governed by: ${esc(governedBy)} · Contains: ${esc(contains)} · Contained by: ${esc(containedBy)} · Rationale: ${esc(n.desc)}</span>` + section('Out', EDGES.filter(e => e.from === n.id), 'out') + section('In', EDGES.filter(e => e.to === n.id), 'in');
  } else {
    extra = `<span style="margin-top:var(--space-2);line-height:var(--leading-normal)">${esc(n.desc)}</span>` + section('Out', EDGES.filter(e => e.from === n.id), 'out') + section('In', EDGES.filter(e => e.to === n.id), 'in');
  }
  return `<strong>${esc(n.label)}</strong>` + extra + `<em>${esc(n.file)} · ${esc(kindLabel)} · ${esc(n.sub)}</em>`;
}
