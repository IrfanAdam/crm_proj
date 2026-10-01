/* ADAM/PAGE — src/pitch/pitch-changelog-list.js · build cards + day chip + triage */
/* [plan:2026-09-28_000000-lump-sum-builds.md#phase-1] · sequence from filtered list. */
// Export map: renderDay · renderList · renderTriage.
import { planTitle, unlinked, fmtLong, esc } from './pitch-changelog-data.js';
// — Section: day-clear chip —
export function renderDay(el, day, onClear) {
  if (!day) {
    el.innerHTML = '';
    el.onclick = null;
    return;
  }
  el.innerHTML = '<button type="button" class="cl-chip">' + fmtLong(day) + ' · clear ×</button>';
  el.onclick = onClear;
}
// — Section: build cards (newest first, Build N oldest→newest) —
export function renderList(el, list, onOpen) {
  if (!list.length) {
    el.innerHTML = '<p class="cl-note">Nothing shipped on this day.</p>';
    el.onclick = null;
    return;
  }
  el.innerHTML = list.map((c, i) => {
    const meta = c.date + ' · ' + (c.plan ? esc(planTitle(c.plan)) : 'untracked') + ' · ' + c.sha.slice(0, 7);
    return '<button type="button" class="cl-card" data-sha="' + c.sha + '">'
      + '<span class="cl-seq">Build ' + (list.length - i) + '</span>'
      + '<span><span class="cl-sub">' + esc(c.subject) + '</span><br>'
      + '<span class="cl-meta">' + meta + '</span></span></button>';
  }).join('');
  el.onclick = (e) => {
    const card = e.target.closest('[data-sha]');
    if (card) onOpen(card.dataset.sha, card);
  };
}
// — Section: triage (commits no plan covers, rendered once) —
export function renderTriage(el, list) {
  const rest = unlinked(list);
  if (!rest.length) {
    el.innerHTML = '';
    return;
  }
  const rows = rest.map((c) => '<li><strong>' + c.date + '</strong> · ' + esc(c.subject) + '</li>').join('');
  el.innerHTML = '<div class="theme-block" style="margin-top:2.5rem"><div class="theme-title">Untracked · '
    + rest.length + '</div><p>Commits no plan covers yet — add a trailer or a lump-sum task.</p>'
    + '<ul class="cl-triage-list">' + rows + '</ul></div>';
}
