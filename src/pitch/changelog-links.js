/* ADAM/DS — changelog link layer: manifest → phase badges + unlinked list.
   Continuation 20260909_145218_9888b1 — all future plans branch from here. */
import manifest from '../../design-system/changelog-manifest.json';
import { fmtDate, fmtTime } from './changelog-format.js';
import { split } from './changelog-parse.js';
import { esc as escAll } from './changelog/esc.js';
const fmtTimelineDate = (iso) => { if(!iso) return ''; const d=fmtDate(iso); return d ? d.replace(' ', ' ').replace(/^([0-9]{2}) ([A-Za-z]{3}) ([0-9]{4})$/, (_,dd,mmm,yyyy)=> `${Number(dd)} ${mmm}, ${yyyy}`) : iso; };
const GH = 'https://github.com/IrfanAdam/crm_proj/commit/';
const esc = escAll;
export const commits = manifest.commits || [];
export const wip = manifest.wip || [];
export const continuation = manifest.continuation || '20260909_145218_9888b1';
const badgeItem = (c) => `<div class="ds-timeline-item"><a href="${GH}${c.full}">${c.sha}</a> <span>${esc(c.subject)}</span>${c.time ? `<small>${esc(fmtTime(c.time))}</small>` : ''}</div>`;
// Shared anchor matcher: anchor hits a split() section body. Both hits() and
// unlinked() test through here so triage matches the way hits() matches.
export const anchorHit = (body, anchor) => {
  const a = String(anchor).replace(/^.*?(phase-\d+).*$/i, '$1');
  const escA = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escA + '(?!\\d)').test(body);
};
// anchor-less commits attach to their plan's first phase; anchored ones to the first phase whose text contains the
// anchor. Anchor normalized via .replace to bare phase-N; exact match ensures phase-1 doesn't hit phase-10.
export const hits = (file, text, first) => commits
  .filter((c) => {
    if (c.plan !== file) return false;
    if (!c.anchor) return first;
    return anchorHit(text, c.anchor);
  });
// Plan-wide orphan set: linked commits matching NO section body. Built by unioning
// hits() over EVERY sprint — plan-level, never section-scoped — so each section pane
// repeats the identical full-plan list instead of vanishing post-done batches.
export const orphans = (file, sprints) => {
  const seen = new Set();
  sprints.forEach((s, i) => hits(file, s.body, i === 0).forEach((c) => seen.add(c.sha)));
  return commits.filter((c) => c.plan === file && !seen.has(c.sha));
};
export const badges = (list, title) => {
  if (!list.length) return '';
  // Day groups are collapsible <details> with their own caret — same language
  // as the Evals panel day groups, flush left, no timeline indent.
  const caret = `<span class="ds-caret" aria-hidden="true">▸</span>`;
  const byDate = new Map();
  for (const c of list) {
    const d = c.date || '';
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(c);
  }
  const dates = [...byDate.keys()].sort().reverse();
  const total = dates.length;
  const groups = dates.map((d, di) => {
    const rows = byDate.get(d);
    const label = d ? esc(fmtTimelineDate(d)) : 'Undated';
    return `<details class="ds-timeline-group" open><summary class="ds-timeline-date">${caret}<span class="ds-day-num">Day ${total - di}</span> · ${label} · ${rows.length}</summary><div class="ds-timeline-items">${rows.map((c) => badgeItem(c)).join('')}</div></details>`;
  }).join('');
  const inner = `<div class="ds-timeline">${groups}</div>`;
  return title ? `<p class="ds-sub">${esc(title)} · ${list.length}</p>${inner}` : inner;
};
// Commits with no matching plan file (c.plan empty, or unknown to texts).
// Plan-scoped queries (hits/orphans) require c.plan === file, so these never
// surface in any drawer pane — render them in rail/triage instead of dropping.
export const planless = (texts) => commits.filter((c) => !c.plan || (texts && !texts[c.plan]));
export const unlinked = (texts) => {
  const secsCache = {};
  const secsOf = (file) => (secsCache[file] = secsCache[file] || split(texts[file] || ''));
  const gone = new Set(planless(texts).map((c) => c.sha));
  const xs = commits.filter((c) => {
    if (gone.has(c.sha)) return true;
    if (!c.anchor) return false;
    return !secsOf(c.plan).some((s) => anchorHit(s.body, c.anchor));
  });
  if (!xs.length) return '<div class="ds-callout ds-callout--success"><h2>Unlinked DS changes <span class="ds-count-badge ds-count-badge--ok">0</span></h2><p>All tracked — every DS commit cites its plan.</p></div>';
  return ['<div class="ds-callout ds-callout--warn"><h2>Unlinked DS changes <span class="ds-count-badge">', String(xs.length), '</span></h2><p>These cite no plan — link next time via ',
    '<code>[plan:&lt;file&gt;#&lt;anchor&gt;]</code>.</p>'].join('')
    + (xs.length ? ((()=>{ let h='<div class="ds-timeline">'; let l=null; for(const c of xs){ if(c.date!==l){ h+=`<div class="ds-timeline-date">${esc(fmtTimelineDate(c.date))}</div>`; l=c.date; } h+=badgeItem(c); } return h+'</div>'; })()) : '')
    + (wip.length ? `<p>Uncommitted:</p><ul>${wip.map((w) => `<li><code>${esc(w)}</code></li>`).join('')}</ul>` : '')
    + '</div>';
};
