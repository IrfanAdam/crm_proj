/* ADAM/DS — ds/changelog/paint-drawer · task pane content (extracted from paint-detail.js, budget) */
import { hits, badges, orphans } from '../changelog-links.js';
import { dueFor, dueErr } from './due.js';
import { shortPhase as short } from '../changelog-titles.js';
import { stripGateThread, renderEvals, renderCommitsPanel, gateVerdictTag } from './panels.js';
import { marked } from './markdown.js';
import { esc } from './esc.js';
import { isDone, state } from '../changelog-parse.js';
export function paintDrawer({ plan, sprint }) {
  const hs = hits(plan.file, sprint.body, plan.sprints.indexOf(sprint) === 0);
  const headGate = gateVerdictTag(sprint.head, sprint.body);
  const due = dueFor(plan.file, sprint.head, sprint.body);
  const derr = dueErr(plan.file, sprint.head);
  const sealed = isDone(state(sprint.body)) || /✗/.test(sprint.head);
  const dueHtml = sealed ? '' : `<label class="ds-due"><span data-due-label${derr ? ' data-due-retry=""' : ''}>${derr ? `Deadline · ${esc(due)} (${esc(derr)} — kept locally, click to retry)` : due ? `Deadline · ${esc(due)}` : 'Add deadline'}</span><input type="date" data-due-input value="${esc(due)}" aria-label="Deadline"></label>`;
  const evalsHtml = renderEvals(plan.file, plan.date, sprint.head, sprint.body);
  const commitsHtml = renderCommitsPanel(hs, badges(hs));
  const orph = orphans(plan.file, plan.sprints).filter((c) => !hs.includes(c));
  const orphanHtml = badges(orph, 'Further commits');
  return [
    `<div class="ds-drawer-head"><b>`,
    esc(short(sprint.head)),
    `</b>`,
    headGate ? `<span class="ds-gate">${headGate}</span>` : '',
    dueHtml,
    `<button data-close aria-label="Close detail">✕</button></div><div class="ds-md">`,
    marked.parse(stripGateThread(sprint.body)) + evalsHtml + commitsHtml + orphanHtml,
    `</div>`,
  ].join('');
}
