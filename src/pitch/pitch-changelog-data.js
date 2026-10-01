/* ADAM/PAGE — src/pitch/pitch-changelog-data.js · manifest import + pure link helpers */
/* [plan:2026-09-28_000000-lump-sum-builds.md#phase-1] · hits/badges/unlinked over ds-track JSON. */
// Export map: COMMITS · planTitle · dayCounts · visibleByDay · unlinked · sibs · fmtLong · esc.
import MANIFEST from '../../design-system/changelog-manifest.json';
import NAMES from '../ds/changelog-names.json';
// — Section: normalized feed (newest first) —
export const COMMITS = [...(MANIFEST.commits || [])].sort((a, b) => {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.sha < b.sha ? 1 : -1;
});
// — Section: pure helpers (no DOM) —
export function planTitle(file) {
  if (!file) return '';
  const hit = (NAMES || {})[file];
  if (hit && hit.title) return hit.title;
  return file.replace(/^\d{4}-\d{2}-\d{2}_\d+-(.+)\.md$/, '$1').replace(/-/g, ' ');
}
export function dayCounts(list) {
  const map = {};
  for (const c of list) map[c.date] = (map[c.date] || 0) + 1;
  return map;
}
export function visibleByDay(list, day) {
  if (!day) return list;
  return list.filter((c) => c.date === day);
}
export function unlinked(list) {
  return list.filter((c) => !c.plan);
}
export function sibs(list, sha) {
  const me = list.find((c) => c.sha === sha);
  if (!me) return [];
  return list.filter((c) => c.date === me.date && c.sha !== sha);
}
export function fmtLong(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
