/* ADAM/DS — pages-changelog composer · glob + state ·
   [plan:2026-09-13_235413-over-limit-splits.md#phase-2] */
// Exports: render, mount — eager glob + hits contract preserved (events live in changelog-events.js)
import { hits } from './changelog-links.js';
import { commits } from './changelog-links.js';
import { TAGS, tagsFor, planTags, parseExplicit } from './changelog-tags.js';
import { h1Of, planSentence } from './changelog-titles.js';
import names from '../ds/changelog-names.json';
import { goal, split, parseMeta } from './changelog-parse.js';
import { paint } from './changelog-paint.js';
import { bindChangelogEvents } from './changelog-events.js';

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
const st = { active: new Set(), day: '', sel: [0, 0], open: false, stage: 'list' };
const visiblePlans = () => plans
  .filter((p) => (!st.active.size || p.tags.some((t) => st.active.has(t)))
    && (!st.day || p.date === st.day || commits.some((c) => c.plan === p.file && c.date === st.day)));
const visibleSprints = (plan) => {
  const ss = st.active.size ? plan.sprints.filter((s) => s.tags.some((t) => st.active.has(t))) : plan.sprints;
  return ss.length ? ss : plan.sprints;
};
const cur = () => {
  const list = visiblePlans(), pi = Math.min(st.sel[0], Math.max(list.length - 1, 0));
  const plan = list[pi], sprints = plan ? visibleSprints(plan) : [];
  return { list, pi, plan, sprints, si: Math.min(st.sel[1], Math.max(sprints.length - 1, 0)) };
};
export function render() {
  return [
    `<p class="ds-crumb">Start \u00b7 Changelog</p><div class="ds-hero wide"><h1>What shipped, in order.</h1></div>`,
    `<hr class="ds-hr"><div class="ds-graph" data-col="graph"></div><div class="ds-chips" data-col="chips"></div>`,
    `<div class="ds-plan-grid"><div class="ds-col" data-col="plan"></div></div><div class="ds-md" data-col="triage">`,
    `</div><div class="ds-scrim" data-scrim hidden></div><span class="ds-cursor-tip" hidden role="tooltip"></span>`,
    `<aside class="ds-drawer" data-drawer hidden aria-label="Build detail">`,
    `<div class="ds-rail" data-col="sprint"></div><div class="ds-task" data-col="tasks"></div></aside>`,
  ].join('');
}
function doPaint(root) {
  const { list, pi, plan, sprints, si } = cur();
  st.sel = [pi, si];
  paint(root, { list, pi, plan, sprints, si, active: st.active, day: st.day,
    sel: st.sel, open: st.open, stage: st.stage, counts, plans, texts });
}
export function mount(root) {
  st.open = false; st.stage = 'list'; doPaint(root);
  return bindChangelogEvents(root, st, { cur, doPaint });
}
