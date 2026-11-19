/* ADAM/DS — ds/changelog/task-panels · what hangs under a task's fold: the
   commits whose trailer says `task-N` (one SHIP line, sha + subject on hover)
   and that task's extracted eval record. Pure HTML — no lookups, no state. */
import { esc } from './esc.js';
import { triCaret } from './caret.js';
const GH = 'https://github.com/IrfanAdam/crm_proj/commit/';
const shipLine = (list) => `<p class="ds-ship"><span class="ds-ship-l">Shipped</span>${list.map((c) =>
  `<a href="${GH}${esc(c.full)}" title="${esc(c.subject || '')}">${esc(c.sha)}</a>`).join('')}</p>`;
const evalPanel = (list, parse) => (list.length ? `<details class="ds-panel ds-panel--sub"><summary class="ds-panel-title">${triCaret}Evals · <span class="ds-panel-num">${list.length}</span></summary>${list.map((e) =>
  `<details class="ds-eval"><summary class="ds-eval-t">${triCaret}${esc(e.title)}</summary><div class="ds-eval-b">${e.body ? parse(e.body) : ''}</div></details>`).join('')}</details>` : '');
export const taskExtras = (extra, parse) => {
  if (!extra) return '';
  return (extra.commits && extra.commits.length ? shipLine(extra.commits) : '')
    + (extra.evals ? evalPanel(extra.evals, parse) : '');
};
