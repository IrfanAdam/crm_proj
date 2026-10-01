/* ADAM/PAGE — src/pitch/pitch-changelog-drawer.js · commit detail + same-day rail */
/* [plan:2026-09-28_000000-lump-sum-builds.md#phase-1] · rail click swaps in place. */
// Export map: openDrawer · closeDrawer · isOpen.
import { planTitle, fmtLong, esc } from './pitch-changelog-data.js';
// — Section: open (detail + sibling badges) —
export function openDrawer(panel, scrim, c, seq, siblings, onSib) {
  const sibHtml = siblings.map((s) => '<button type="button" class="cl-sib" data-sha="' + s.sha + '">'
    + esc(s.subject) + '</button>').join('');
  panel.innerHTML = '<button type="button" class="cl-close" data-close aria-label="Close">✕</button>'
    + '<p class="cl-d-label">Build ' + seq + '</p>'
    + '<h2 class="cl-d-title">' + esc(c.subject) + '</h2>'
    + '<div class="cl-d-row"><strong>Date</strong>' + fmtLong(c.date) + ' · ' + c.date + '</div>'
    + '<div class="cl-d-row"><strong>Commit</strong><span class="cl-d-sha">' + c.full + '</span></div>'
    + (c.plan ? '<div class="cl-d-row"><strong>Plan</strong>' + esc(planTitle(c.plan)) + '<br>' + esc(c.plan)
    + (c.anchor ? ' · ' + esc(c.anchor) : '') + '</div>' : '<div class="cl-d-row"><strong>Plan</strong>untracked</div>')
    + (sibHtml ? '<div class="cl-d-row"><strong>Same day</strong>' + sibHtml + '</div>' : '');
  panel.hidden = false;
  scrim.hidden = false;
  panel.querySelector('[data-close]').focus();
  panel.onclick = (e) => {
    if (e.target.closest('[data-close]')) onSib(null);
    const sib = e.target.closest('.cl-sib');
    if (sib) onSib(sib.dataset.sha);
  };
}
// — Section: close (all paths funnel here) —
export function closeDrawer(panel, scrim, returnTo) {
  panel.hidden = true;
  scrim.hidden = true;
  if (returnTo && document.contains(returnTo)) returnTo.focus();
}
export function isOpen(panel) {
  return !panel.hidden;
}
