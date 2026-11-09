/* ADAM/DS — ds/changelog/paint-drawer · task pane content (extracted from paint-detail.js, budget) */
import { hits, badges, orphans } from '../changelog-links.js';
import { dueFor, dueErr } from './due.js';
import { stripGateThread, renderEvals, renderCommitsPanel, gateVerdictTag } from './panels.js';
import { marked } from './markdown.js';
import { esc } from './esc.js';
import { isDone, state } from '../changelog-parse.js';
// Rail ("Phase 01") and drawer ("Phase 1 — …") share one number format.
const padPhase = (head) => String(head || '').replace(/^Phase\s*(\d+)/i, (_, n) => `Phase ${String(n).padStart(2, '0')}`);
// Titled bucket as a real panel (caret + accent count), never a bare label.
export const badgesPanel = (list, title) => {
  if (!list.length) return '';
  const caret = `<span class="ds-caret" aria-hidden="true">▸</span>`;
  return `<details class="ds-panel" open><summary class="ds-panel-title">${caret}${esc(title)} · <span class="ds-panel-num">${list.length}</span></summary>${badges(list)}</details>`;
};
export function paintDrawer({ plan, sprint }) {
  const hs = hits(plan.file, sprint.body, plan.sprints.indexOf(sprint) === 0);
  const headGate = gateVerdictTag(sprint.head, sprint.body);
  const due = dueFor(plan.file, sprint.head, sprint.body);
  const derr = dueErr(plan.file, sprint.head);
  const frac = state(sprint.body), done = isDone(frac), cancelled = /✗/.test(sprint.head);
  const sealed = done || cancelled;
  const dueHtml = sealed ? '' : `<label class="ds-due"><span data-due-label${derr ? ' data-due-retry=""' : ''}>${derr ? `Deadline · ${esc(due)} (${esc(derr)} — kept locally, click to retry)` : due ? `Deadline · ${esc(due)}` : 'Add deadline'}</span><input type="date" data-due-input value="${esc(due)}" aria-label="Deadline"></label>`;
  const tags = plan.tags || [];
  const crumb = tags.length ? `<p class="ds-crumb">${esc(tags.slice(0, 2).join(' · '))}${tags.length > 2 ? ` · +${tags.length - 2}` : ''}</p>` : '';
  const title = esc(padPhase(sprint.head.replace(/<!--[\s\S]*?-->/g, '').replace(/\s*\{#.*$/, '').trim()));
  const stTxt = [cancelled ? '✗ CANCELLED' : done ? '✓ DONE' : frac, headGate].filter(Boolean).join(' · ');
  const status = stTxt ? `<p class="ds-status ${cancelled || headGate === 'GATE FAILED' ? 'ds-is-cancelled' : done ? 'ds-is-done' : 'ds-is-gate'}">${esc(stTxt)}</p>` : '';
  const evalsHtml = renderEvals(plan.file, plan.date, sprint.head, sprint.body);
  const commitsHtml = renderCommitsPanel(hs, badges(hs));
  const orph = orphans(plan.file, plan.sprints).filter((c) => !hs.includes(c));
  const orphanHtml = badgesPanel(orph, 'Further commits');
  return [
    `<div class="ds-drawer-head">`,
    `<button data-close aria-label="Close detail">✕</button></div><div class="ds-md">`,
    crumb + `<h2 class="ds-phase-title">${title}</h2>` + status + dueHtml,
    marked.parse(stripGateThread(sprint.body)) + evalsHtml + commitsHtml + orphanHtml,
    `</div>`,
  ].join('');
}
