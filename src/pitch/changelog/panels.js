/* ADAM/DS — ds/changelog/panels · evals + commits panels, edit detection.
   Detail-renderer helpers extracted from paint-detail.js (budget). Renderers
   only — norm()/hashes untouched. */
import { parseGates } from './gates.js';
import { hash, fmtDate } from '../changelog-parse.js';
import { esc } from './esc.js';
import history from '../../../design-system/plan-history.json';
export function isEdited(planFile, head, body){
  const hist = history[planFile] || [];
  if(!hist.length) return false;
  const liveHash = hash(body);
  const hashes = new Set();
  let everFound = false;
  for(const e of hist){
    const sec = e.sections.find(x=>x.head===head);
    if(sec){ hashes.add(sec.hash); everFound=true; }
  }
  if(!everFound) return true;
  const earliestHas = hist[0].sections.some(x=>x.head===head);
  if(!earliestHas) return true;
  if(hashes.size>1) return true;
  if(!hashes.has(liveHash)) return true;
  return false;
}
// Gate thread lines are dropped from the markdown body and rendered in Evals instead.
const GATE_THREAD = /^- .*REF GATE\s+0*\d+\b/;
export const stripGateThread = (body) => String(body).split('\n').filter((l) => !GATE_THREAD.test(l)).join('\n');
const cleanEval = (line) => esc(line.replace(/^- /, '').replace(/\s*\{#.*$/, '').trim());
const firstGateDate = (s) => ((s || '').match(/(20\d{2}-\d{2}-\d{2})/) || [])[1] || '';
export const renderEvals = (planFile, planDate, head, body) => {
  const g = parseGates(head, body);
  if (!g) return '';
  const entries = g.bases.map((t) => ({ date: firstGateDate(t) || planDate, kind: 'eval', text: cleanEval(t) }))
    .concat(g.revLines.map((t) => ({ date: firstGateDate(t) || planDate, kind: 'iter', text: cleanEval(t) })));
  if (!entries.length) return '';
  const byDate = {};
  entries.forEach((e) => { (byDate[e.date] = byDate[e.date] || []).push(e); });
  const dates = Object.keys(byDate).sort().reverse();
  const total = dates.length;
  const groups = dates.map((d, di) => {
    const rows = byDate[d];
    const dayN = total - di;
    const items = rows.map((r) => r.kind === 'eval'
      ? `<div class="ds-timeline-item ds-timeline-item--eval"><span>${r.text}</span></div>`
      : `<div class="ds-timeline-item ds-timeline-item--iter"><span>${r.text}</span><small>${esc(d)}</small></div>`).join('');
    return `<details class="ds-timeline-group" open><summary class="ds-timeline-date"><span class="ds-caret">‹›</span>Day ${dayN} · ${esc(fmtDate(d) || d)} · ${rows.length}</summary>${items}</details>`;
  }).join('');
  return `<details class="ds-panel" open><summary class="ds-panel-title"><span class="ds-caret">‹›</span>Evals · ${entries.length}</summary><div class="ds-timeline">${groups}</div></details>`;
};
export const renderCommitsPanel = (hs, badgesHtml) => {
  if (!hs.length) return '';
  return `<details class="ds-panel" open><summary class="ds-panel-title"><span class="ds-caret">‹›</span>Commits · ${hs.length}</summary>${badgesHtml}</details>`;
};
export const gateVerdictTag = (head, body) => {
  const g = parseGates(head, body);
  if (!g) return '';
  return g.verdict === 'passed' ? 'GATE PASSED' : g.verdict === 'failed' ? 'GATE FAILED' : 'GATE OPEN';
};
