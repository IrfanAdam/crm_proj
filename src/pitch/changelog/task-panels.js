/* ADAM/DS — ds/changelog/task-panels · task ship lines + phase cumulative evals.
   Commits whose trailer says `task-N` hang under their task's fold (one SHIP
   line, sha + subject on hover). Evals live once per phase, below Commits,
   cumulative across the phase's tasks — never inside a task fold. Pure HTML. */
import { esc } from './esc.js';
import { triCaret } from './caret.js';
const GH = 'https://github.com/IrfanAdam/crm_proj/commit/';
const shipLine = (list) => `<p class="ds-ship"><span class="ds-ship-l">Shipped</span>${list.map((c) =>
  `<a href="${GH}${esc(c.full)}" title="${esc(c.subject || '')}">${esc(c.sha)}</a>`).join('')}</p>`;
// groups: [{ n, list }] in task order; each eval keeps its owning task prefix
// and a date-first chip (dates hide at the end of wrapping titles otherwise).
const evalDate = (e) => ((((e.title || '') + '\n' + (e.body || '')).match(/(20\d{2}-\d{2}-\d{2})/) || [])[1] || '');
const shortTitle = (t, d) => {
  let s = String(t || '');
  if (d) s = s.replace(new RegExp(`\\s*\\((?:opened\\s+)?${d}\\)`), '');
  return esc(s.replace(/\s{2,}/g, ' ').replace(/\s+:/g, ':').trim());
};
export const phaseEvalsPanel = (groups, parse) => {
  const ordered = [...groups].sort((a, b) => (+a.n || 0) - (+b.n || 0));
  const all = ordered.flatMap((g) => (g.list || []).map((e) => ({ n: g.n, e })));
  if (!all.length) return '';
  return `<details class="ds-panel" open><summary class="ds-panel-title">${triCaret}Evals · <span class="ds-panel-num">${all.length}</span></summary>${all.map(({ n, e }) => {
    const d = evalDate(e);
    return `<details class="ds-eval"><summary class="ds-eval-t">${triCaret}${d ? `<small class="ds-eval-d">${esc(d)}</small> · ` : ''}T${esc(n)} · ${shortTitle(e.title, d)}</summary><div class="ds-eval-b">${e.body ? parse(e.body) : ''}</div></details>`;
  }).join('')}</details>`;
};
export const taskExtras = (extra) => {
  if (!extra || !extra.commits || !extra.commits.length) return '';
  return shipLine(extra.commits);
};
