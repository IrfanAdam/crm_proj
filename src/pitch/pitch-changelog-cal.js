/* ADAM/PAGE — src/pitch/pitch-changelog-cal.js · Mon–Sun heat graph, day toggle */
/* [plan:2026-09-28_000000-lump-sum-builds.md#phase-1] · date→count map, dated cells filter. */
// Export map: renderCal(el, counts, sel, onPick).
import { fmtLong } from './pitch-changelog-data.js';
// — Section: week math (Monday-first columns) —
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
function toDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function isoOf(d) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function level(n, peak) {
  if (!n) return 0;
  return 1 + Math.min(3, Math.round((n / peak) * 3));
}
// — Section: grid render —
export function renderCal(el, counts, sel, onPick) {
  const days = Object.keys(counts).sort();
  if (!days.length) {
    el.innerHTML = '';
    return;
  }
  const peak = Math.max(...Object.values(counts));
  const start = toDate(days[0]);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = toDate(days[days.length - 1]);
  let html = DOW.map((d) => '<span class="cl-dow">' + d + '</span>').join('');
  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    const iso = isoOf(cur);
    const n = counts[iso] || 0;
    if (!n && (iso < days[0] || iso > days[days.length - 1])) {
      html += '<span class="cl-blank"></span>';
    } else if (!n) {
      html += '<span class="cl-blank" title="' + fmtLong(iso) + ' · no commits"></span>';
    } else {
      const on = sel === iso ? ' aria-pressed="true"' : ' aria-pressed="false"';
      html += '<button type="button" class="cl-day l' + level(n, peak) + '" data-day="' + iso + '"' + on;
      html += ' title="' + n + ' commits · ' + fmtLong(iso) + '" aria-label="' + n + ' commits on ' + fmtLong(iso) + '"></button>';
    }
  }
  el.innerHTML = html;
  el.onclick = (e) => {
    const btn = e.target.closest('[data-day]');
    if (btn) onPick(btn.dataset.day);
  };
}
