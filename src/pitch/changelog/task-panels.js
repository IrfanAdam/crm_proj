/* ADAM/DS — ds/changelog/task-panels · what hangs under a task's fold: the
   commits whose trailer says `task-N` (one SHIP line, sha + subject on hover).
   Evals live once per phase in the Evals timeline — never in a task fold. */
import { esc } from './esc.js';
const GH = 'https://github.com/IrfanAdam/crm_proj/commit/';
const shipLine = (list) => `<p class="ds-ship"><span class="ds-ship-l">Shipped</span>${list.map((c) =>
  `<a href="${GH}${esc(c.full)}" title="${esc(c.subject || '')}">${esc(c.sha)}</a>`).join('')}</p>`;
export const taskExtras = (extra) => {
  if (!extra || !extra.commits || !extra.commits.length) return '';
  return shipLine(extra.commits);
};
