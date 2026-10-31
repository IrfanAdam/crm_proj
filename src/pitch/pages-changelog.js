/* ADAM/DS — pages-changelog composer · glob + state ·
   [plan:2026-09-13_235413-over-limit-splits.md#phase-2] */
// Exports: render, mount — eager glob + hits contract preserved (events live in changelog-events.js)
import { hits } from './changelog-links.js';
import { commits } from './changelog-links.js';
import { TAGS, tagsFor, planTags, parseExplicit } from './changelog-tags.js';
import { h1Of, planSentence } from './changelog-titles.js';
import names from '../ds/changelog-names.json';
import { goal, split, parseMeta, planStatus } from './changelog-parse.js';
import { paint } from './changelog-paint.js';
import { bindChangelogEvents } from './changelog-events.js';
import { applyOverrides } from './changelog/due.js';
import { dueOf } from './changelog/due-core.js';

const raws = import.meta.glob('../../.hermes/plans/*.md', { query: '?raw', import: 'default', eager: true });
const entries = Object.entries(raws).sort(([a], [b]) => b.localeCompare(a));
const texts = Object.fromEntries(entries.map(([p, md]) => [p.split('/').pop(), md]));
const HIDDEN = /<!--\s*(?:changelog|builds):\s*hide\s*-->/;
const plans = entries.map(([p, md]) => {
  const file = p.split('/').pop();
  const { date, id, slug } = parseMeta(file);
  const h1 = h1Of(md), g = goal(md), nm = names[file] || {};
  const sprints = split(md), steer = parseExplicit(md.split(/^## /m)[0]);
  sprints.forEach((s) => { s.tags = tagsFor(s.head, s.body, steer); });
  return { file,
    date,
    id,
    slug,
    h1,
    title: nm.title || planSentence({ h1, goal: g, slug }),
    purpose: nm.purpose || '',
    goal: g,
    sprints,
    tags: planTags(md, sprints),
    raw: md };
}).filter((pl) => pl.sprints.length && !HIDDEN.test(pl.raw));
const counts = TAGS.map((t) => [t, plans.filter((p) => p.tags.includes(t)).length]).filter(([, n]) => n);
const STATUS = ['Done', 'Incomplete', 'Cancelled'];
const statusOf = (p) => { const s = planStatus(p.sprints); return s === 'done' ? 'Done' : s === 'cancelled' ? 'Cancelled' : 'Incomplete'; };
const statusCounts = STATUS.map((t) => [t, plans.filter((p) => statusOf(p) === t).length]).filter(([, n]) => n);
const st = { active: new Set(), status: new Set(), day: '', sel: [0, 0], open: false, openFile: '', filterOpen: false, filterTab: 'tags', timeline: false, stage: 'list' };
const visiblePlans = () => plans
  .filter((p) => (!st.active.size || p.tags.some((t) => st.active.has(t)))
    && (!st.status.size || st.status.has(statusOf(p)))
    && (!st.day || p.date === st.day || p.sprints.some((s) => dueOf(s.body) === st.day) || commits.some((c) => c.plan === p.file && c.date === st.day)));
const visibleSprints = (plan) => {
  const ss = st.active.size ? plan.sprints.filter((s) => s.tags.some((t) => st.active.has(t))) : plan.sprints;
  return ss.length ? ss : plan.sprints;
};
const cur = () => {
  const list = visiblePlans(), pi = Math.min(st.sel[0], Math.max(list.length - 1, 0));
  let plan = list[pi], sprints = plan ? visibleSprints(plan) : [];
  if (st.open && st.openFile) {
    const full = plans.find((p) => p.file === st.openFile);
    if (full) { plan = full; sprints = visibleSprints(full); }
  }
  return { list, pi, plan, sprints, si: Math.min(st.sel[1], Math.max((plan ? visibleSprints(plan) : []).length - 1, 0)) };
};
export function render() {
  return [
    `<p class="ds-crumb">Start \u00b7 Changelog \u00b7 sh3</p><div class="ds-hero wide"><h1>What shipped, in order.</h1></div>`,
    `<hr class="ds-hr"><div class="ds-graph" data-col="graph"></div><div class="ds-chips" data-col="chips"></div>`,
    `<div class="ds-plan-grid"><div class="ds-col" data-col="plan"></div></div><div class="ds-md" data-col="triage">`,
    `<aside class="ds-timeline" data-col="timeline" aria-label="Timeline" hidden></aside><div class="ds-scrim" data-scrim hidden></div><span class="ds-cursor-tip" hidden role="tooltip"></span>`,
    `<aside class="ds-drawer" data-drawer hidden aria-label="Build detail">`,
    `<div class="ds-rail" data-col="sprint"></div><div class="ds-task" data-col="tasks"></div></aside>`,
  ].join('');
}
function doPaint(root) {
  if (!root.querySelector('aside.ds-timeline') || !root.querySelector('[data-drawer]')) root.innerHTML = render();
  const { list, pi, plan, sprints, si } = cur();
  st.sel = [pi, si];
  paint(root, { list, pi, plan, sprints, si, active: st.active, status: st.status, day: st.day,
    sel: st.sel, open: st.open, stage: st.stage, counts, statusCounts, plans, texts, filterOpen: st.filterOpen, filterTab: st.filterTab, timeline: st.timeline });
  try { document.title = `cl open=${st.open ? 1 : 0} tl=${st.timeline ? 1 : 0} n=${list.length}`; } catch {} // TEMP-DEBUG sh3: state readout, revert after root-cause
}
export function mount(root) {
  applyOverrides(plans);
  st.open = false; st.stage = 'list';
  try {
    const snap = JSON.parse(sessionStorage.getItem('ds-drawer-snap') || 'null');
    if (snap && plans.some((p) => p.file === snap.file)) {
      st.open = true; st.openFile = snap.file;
      st.sel = [0, Math.max(snap.si || 0, 0)];
    }
  } catch {}
  doPaint(root);
  const saveSnap = () => { try {
    if (st.open && st.openFile) sessionStorage.setItem('ds-drawer-snap', JSON.stringify({ file: st.openFile, si: st.sel[1] }));
    else sessionStorage.removeItem('ds-drawer-snap');
  } catch {} };
  window.addEventListener('beforeunload', saveSnap);
  const unbind = bindChangelogEvents(root, st, { cur, doPaint });
  return () => { unbind(); window.removeEventListener('beforeunload', saveSnap); };
}
