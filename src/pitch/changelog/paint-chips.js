/* ADAM/DS — ds/changelog/paint-chips · chips + graph · [plan:2026-09-13_193000-refactor-manageability.md#phase-3] */
import { fmtDate } from '../changelog-parse.js';
import { graph } from './graph.js';
export function paintChips(root, ctx){
  const { list, pi, plan, sprints, si, active, day, sel, open, counts, plans, texts } = ctx;
  const showAll = [
    `<button class="ds-chip`,
    (active.size || day) ? '' : ' on',
    `" data-tag="">All (`,
    plans.length,
    `)</button>`,
  ].join('');
  const dayChip = day ? [
    `<button class="ds-chip on" data-day-clear aria-label="Clear day filter">`,
    fmtDate(day),
    ` \u2715</button>`,
  ].join('') : '';
  root.querySelector('[data-col="chips"]').innerHTML = dayChip + showAll + counts.map(([t, n]) => [
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
  const gEl = root.querySelector('[data-col="graph"]');
  if (!gEl.dataset.ready) { gEl.innerHTML = graph({ plans, day }); gEl.dataset.ready = '1'; }
  else { gEl.querySelectorAll('[data-day]').forEach((el) => { const k = el.dataset.day,
        on = k === day; el.classList.toggle('on',
          on); if (el.getAttribute('aria-pressed') !== String(on)) el.setAttribute('aria-pressed',
          String(on)); }); }
}
