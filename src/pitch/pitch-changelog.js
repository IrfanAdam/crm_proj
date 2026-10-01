/* ADAM/PAGE — src/pitch/pitch-changelog.js · boot: state machine + event wiring */
/* [plan:2026-09-28_000000-lump-sum-builds.md#phase-1] · day filter, drawer open/close. */
// Export map: (boot only — renders calendar, chips, cards, triage, drawer).
import { COMMITS, dayCounts, visibleByDay, sibs } from './pitch-changelog-data.js';
import { renderCal } from './pitch-changelog-cal.js';
import { renderDay, renderList, renderTriage } from './pitch-changelog-list.js';
import { openDrawer, closeDrawer, isOpen } from './pitch-changelog-drawer.js';
// — Section: state + mounts —
const state = { day: '', lastFocus: null };
const cal = document.getElementById('cl-cal');
const dayRow = document.getElementById('cl-dayrow');
const list = document.getElementById('cl-list');
const triage = document.getElementById('cl-triage');
const panel = document.getElementById('cl-drawer');
const scrim = document.getElementById('cl-scrim');
const count = document.getElementById('cl-count');
// — Section: render (sequence derives from the filtered list) —
function render() {
  const counts = dayCounts(COMMITS);
  const days = Object.keys(counts).sort();
  const linked = COMMITS.filter((c) => c.plan).length;
  count.textContent = COMMITS.length + ' commits · ' + linked + ' linked · ' + days.length + ' days · '
    + days[0] + ' → ' + days[days.length - 1];
  renderCal(cal, counts, state.day, pickDay);
  renderDay(dayRow, state.day, clearDay);
  const vis = visibleByDay(COMMITS, state.day);
  renderList(list, vis, openFor);
  renderTriage(triage, COMMITS);
}
function pickDay(day) {
  state.day = state.day === day ? '' : day;
  render();
}
function clearDay() {
  state.day = '';
  render();
}
// — Section: deep links (?day=YYYY-MM-DD preselects, ?sha= opens) —
try {
  const q = new URLSearchParams(window.location.search);
  const d = q.get('day');
  if (d && COMMITS.some((c) => c.date === d)) state.day = d;
  var deepSha = q.get('sha');
} catch (e) {
  var deepSha = null;
}
// — Section: drawer open/close paths —
function openFor(sha, card) {
  const vis = visibleByDay(COMMITS, state.day);
  const c = vis.find((x) => x.sha === sha);
  if (!c) return;
  state.lastFocus = card || null;
  openDrawer(panel, scrim, c, vis.length - vis.indexOf(c), sibs(COMMITS, sha), onDrawerNav);
}
function onDrawerNav(sha) {
  if (!sha) {
    closeDrawer(panel, scrim, state.lastFocus);
    return;
  }
  const vis = visibleByDay(COMMITS, state.day);
  const c = vis.find((x) => x.sha === sha) || COMMITS.find((x) => x.sha === sha);
  if (c) openDrawer(panel, scrim, c, COMMITS.length - COMMITS.indexOf(c), sibs(COMMITS, sha), onDrawerNav);
}
scrim.addEventListener('click', () => closeDrawer(panel, scrim, state.lastFocus));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isOpen(panel)) closeDrawer(panel, scrim, state.lastFocus);
});
render();
if (deepSha && COMMITS.some((c) => c.sha === deepSha)) openFor(deepSha, null);
