/* ADAM/DS — ds/changelog/paint-chips · chips + filter drawer + graph · [plan:2026-09-13_193000-refactor-manageability.md#phase-3] */
import { fmtDate } from '../changelog-parse.js';
import { graph } from './graph.js';
import { timelineList } from './timeline.js';
export function paintChips(root, ctx){
  const { active, status, day, counts, statusCounts, plans, filterOpen, filterTab, timeline } = ctx;
  const anyFilter = active.size || status.size || day;
  const filterCount = active.size + status.size + (day ? 1 : 0);
  const trigger = [
    `<button class="ds-chip ds-filter-trigger`,
    filterOpen ? ' on' : '',
    `" data-filter-trigger aria-expanded="`,
    filterOpen,
    `" aria-label="Filters`,
    filterCount ? `, ${filterCount} active` : '',
    `">Filter`,
    filterCount ? ` (${filterCount})` : '',
    `</button>`,
  ].join('');
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
  const tab = filterTab === 'status' ? 'status' : 'tags';
  const tagOpts = counts.map(([t, n]) => [
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
  const statusOpts = statusCounts.map(([t, n]) => [
    `<button class="ds-chip`,
    status.has(t) ? ' on' : '',
    `" data-status="`,
    t,
    `" aria-pressed="`,
    status.has(t),
    `">`,
    t,
    ` (`,
    n,
    `)</button>`,
  ].join('')).join('');
  const drawer = filterOpen ? [
    `<div class="ds-filter" role="dialog" aria-label="Filters">`,
    `<div class="ds-filter-tabs" role="tablist">`,
    `<button role="tab" aria-selected="${tab === 'tags'}" data-tab="tags" class="ds-chip${tab === 'tags' ? ' on' : ''}">Tags</button>`,
    `<button role="tab" aria-selected="${tab === 'status'}" data-tab="status" class="ds-chip${tab === 'status' ? ' on' : ''}">Status</button>`,
    `</div><div class="ds-filter-opts">`,
    tab === 'tags' ? tagOpts : statusOpts,
    `</div></div>`,
  ].join('') : '';
  root.querySelector('[data-col="chips"]').innerHTML = trigger + dayChip + showAll + pills + clear + tlChip + drawer;
  const gEl = root.querySelector('[data-col="graph"]');
  if (!gEl.dataset.ready) { gEl.innerHTML = graph({ plans, day }); gEl.dataset.ready = '1'; }
  else { gEl.querySelectorAll('[data-day]').forEach((el) => { const k = el.dataset.day,
        on = k === day; el.classList.toggle('on',
          on); if (el.getAttribute('aria-pressed') !== String(on)) el.setAttribute('aria-pressed',
          String(on)); }); }
}
