/* ADAM/DS — ds/changelog/panels · commits panel, gate verdict, edit detection.
   One eval surface: task evals + gate/REF lines share the day-grouped
   timeline — same rows, same structure, every phase. */
import { parseGates } from './gates.js';
import { hash, fmtDate } from '../changelog-parse.js';
import { esc } from './esc.js';
import { dayCaret, triCaret } from './caret.js';
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
// Gate thread lines live in the Evals timeline, never twice — strip them from prose.
const GATE_THREAD = /^- .*REF GATE\s+0*\d+\b/;
export const stripGateThread = (body) => String(body).split('\n').filter((l) => !GATE_THREAD.test(l)).join('\n');
const firstDate = (s) => ((String(s || '').match(/(20\d{2}-\d{2}-\d{2})/) || [])[1] || '');
const cleanText = (line) => esc(line.replace(/^- /, '').replace(/^\[[ xX]\] /, '').replace(/\*\*/g, '').replace(/\s*\{#.*$/, '').trim());
const shortTitle = (t, d) => { let s = String(t || ''); if (d) s = s.replace(new RegExp(`\\s*\\((?:opened\\s+)?${d}\\)`), ''); return esc(s.replace(/\s{2,}/g, ' ').replace(/\s+:/g, ':').trim()); };
const dayGroup = (dayN, d, rows) => {
  const items = rows.map((r) => r.kind === 'iter'
    ? `<div class="ds-timeline-item ds-timeline-item--iter"><span>${r.text}</span><small>${esc(d)}</small></div>`
    : `<div class="ds-timeline-item ds-timeline-item--eval"><span>${r.text}</span>${r.bodyHtml || ''}</div>`).join('');
  return `<details class="ds-timeline-group" open><summary class="ds-timeline-date">${dayCaret}<span class="ds-day-num">Day ${dayN}</span><span class="ds-sub"> · ${esc(fmtDate(d) || d)} · ${rows.length}</span></summary><div class="ds-timeline-items">${items}</div></details>`;
};
export const renderEvalsPanel = (planFile, planDate, head, body, groups, parse) => {
  const g = parseGates(head, body);
  const rows = [];
  for (const { n, list } of [...groups].sort((a, b) => (+a.n || 0) - (+b.n || 0)))
    for (const e of (list || [])) { const d = firstDate((e.title || '') + '\n' + (e.body || '')) || planDate; rows.push({ date: d, kind: 'eval', text: `T${esc(n)} · ${shortTitle(e.title, d)}`, bodyHtml: e.body ? `<div class="ds-eval-b">${parse(e.body)}</div>` : '' }); }
  if (g) {
    for (const t of g.bases) rows.push({ date: firstDate(t) || planDate, kind: 'eval', text: cleanText(t), bodyHtml: '' });
    for (const t of g.revLines) rows.push({ date: firstDate(t) || planDate, kind: 'iter', text: cleanText(t), bodyHtml: '' });
  }
  if (!rows.length) return '';
  const byDate = {};
  rows.forEach((r) => { (byDate[r.date] = byDate[r.date] || []).push(r); });
  const dates = Object.keys(byDate).sort().reverse();
  const total = dates.length;
  const timeline = dates.map((d, di) => dayGroup(total - di, d, byDate[d])).join('');
  return `<details class="ds-panel" open><summary class="ds-panel-title">${triCaret}Evals · <span class="ds-panel-num">${rows.length}</span></summary><div class="ds-timeline">${timeline}</div></details>`;
};
export const renderCommitsPanel = (hs, badgesHtml) => {
  if (!hs.length) return '';
  return `<details class="ds-panel" open><summary class="ds-panel-title">${triCaret}Commits · <span class="ds-panel-num">${hs.length}</span></summary>${badgesHtml}</details>`;
};
export const gateVerdictTag = (head, body) => {
  const g = parseGates(head, body);
  if (!g) return '';
  return g.verdict === 'passed' ? 'GATE PASSED' : g.verdict === 'failed' ? 'GATE FAILED' : 'GATE OPEN';
};
