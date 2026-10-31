/* ADAM/DS — ds/changelog/paint-chips · chips + filter drawer + graph · [plan:2026-09-13_193000-refactor-manageability.md#phase-3] */
import { fmtDate } from '../changelog-parse.js';
import { graph } from './graph.js';
import { timelineList } from './timeline.js';
import { filterMenu } from './filter-menu.js';
export function paintChips(root, ctx){
  const { active, status, day, counts, statusCounts, plans, filterOpen, filterTab, timeline } = ctx;
  const anyFilter = active.size || status.size || day;
  const menu = filterMenu({ counts, statusCounts, active, status, filterTab, filterOpen });
  const showAll = [
    `<button class="ds-chip`,
    anyFilter ? '' : ' on',
    `" data-tag="">All (`,
    plans.length,
    `)</button>`,
  ].join('');
  const dayChip = day ? [
    `<button class="ds-chip on" data-day-clear aria-label="Clear day filter">`,
    fmtDate(day),
    ` ✕</button>`,
  ].join('') : '';
  const pills = counts.slice(0, 3).map(([t, n]) => [
    `<button class="ds-chip`,
    active.has(t) ? ' on' : '',
    `" data-tag="`,
    t,
    `" aria-pressed="`,
    active.has(t),
    `">`,
    t,
    ` (`,
    n,
    `)</button>`,
  ].join('')).join('');
  const clear = anyFilter ? `<button class="ds-chip" data-clear>Clear</button>` : '';
  const tlCount = timelineList(plans, active, status).length;
  const tlChip = `<button class="ds-chip ds-tl-chip${timeline ? ' on' : ''}" data-timeline-chip aria-pressed="${timeline}">→ All ${tlCount} tracks</button>`;
  root.querySelector('[data-col="chips"]').innerHTML = menu + dayChip + showAll + pills + clear + tlChip;
  const gEl = root.querySelector('[data-col="graph"]');
  if (!gEl.dataset.ready) { gEl.innerHTML = graph({ plans, day }); gEl.dataset.ready = '1'; }
  else { gEl.querySelectorAll('[data-day]').forEach((el) => { const k = el.dataset.day,
        on = k === day; el.classList.toggle('on',
          on); if (el.getAttribute('aria-pressed') !== String(on)) el.setAttribute('aria-pressed',
          String(on)); }); }
}
