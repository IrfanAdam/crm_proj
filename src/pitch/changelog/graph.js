/* ADAM/DS — ds/changelog/graph · activity graph · [plan:2026-09-12_150255-glitch-sound.md#phase-6] */
import { commits } from '../changelog-links.js';
import { MONTHS, fmtDate, pDay, isoDay } from '../changelog-parse.js';
export function graph({ plans, day }) {
  const dc = {};
  commits.forEach((c) => { if (c.date) dc[c.date] = (dc[c.date] || 0) + 1; });
  const keys = Object.keys(dc).sort();
  const bounds = keys.concat(plans.map((p) => p.date).filter(Boolean)).sort();
  if (!bounds.length) return '';
  const max = Math.max(...Object.values(dc), 1);
  const pad = 6 * 7 * 864e5;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const first = pDay(bounds[0]), last = pDay(bounds[bounds.length - 1]);
  const start = new Date(first.getTime() - pad); start.setDate(start.getDate() - start.getDay());
  const base = last > today ? last : today;
  const end = new Date(base.getTime() + pad); end.setDate(end.getDate() + (6 - end.getDay()));
  const weeks = [], ws = new Date(start);
  while (ws <= end) {
    const col = [];
    for (let i = 0; i < 7; i++) { const d = new Date(ws); d.setDate(d.getDate() + i); col.push(d); }
    weeks.push(col); ws.setDate(ws.getDate() + 7);
  }
  const DOWS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
  const spans = []; let lead = 0;
  weeks.forEach((col) => {
    const f = col.find((d) => d.getDate() === 1);
    if (f) { spans.push({ mo: f.getMonth(), n: lead + 1 }); lead = 0; }
    else if (spans.length) spans[spans.length - 1].n++; else lead++;
  });
  const labels = spans.map((s) => [
    `<span class="ds-month" style="width: calc(`,
    s.n,
    ` * (var(--space-16) + var(--space-4)) - var(--space-4))">`,
    MONTHS[s.mo],
    `</span>`,
  ].join('')).join('');
  const cols = weeks.map((col) => {
    const cells = col.map((d) => {
      const k = isoDay(d),
        todayCls = k === isoDay(today) ? ' is-today' : '';
      if (d > today) return `<span class="ds-day is-future" data-tip="${fmtDate(k)} \u00b7 upcoming"></span>`;
      const n = dc[k] || 0;
      if (!n) return `<span class="ds-day${todayCls}" data-tip="${fmtDate(k)} \u00b7 no changes"></span>`;
      const lv = Math.min(4, Math.ceil(4 * Math.sqrt(n / max)));
      return [
        `<button class="ds-day lv`,
        lv,
        day === k ? ' on' : '',
        todayCls,
        `"`,
        ` data-day="`,
        k,
        `" data-tip="`,
        n,
        ` change`,
        n > 1 ? 's' : '',
        ` \u00b7 `,
        fmtDate(k),
        `" aria-pressed="`,
        day === k,
        `" aria-label="`,
        n,
        ` changes on `,
        fmtDate(k),
        ` \u2014 filter list"></button>`,
      ].join('');
    }).join('');
    return `<div class="ds-week">${cells}</div>`;
  }).join('');
  const dows = `<div class="ds-dows" aria-hidden="true">${DOWS.map((d) => `<span>${d}</span>`).join('')}</div>`;
  return [
    `<div class="ds-graph-labels">`,
    labels,
    `</div><div class="ds-graph-row" role="group" aria-label="Changes by day">`,
    dows,
    cols,
    `</div>`,
  ].join('');
}
