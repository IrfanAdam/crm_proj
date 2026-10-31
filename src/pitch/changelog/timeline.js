/* ADAM/DS — ds/changelog/timeline · per-plan track rows + today line */
import { commits } from '../changelog-links.js';
import { planStatus, statusLabel } from '../changelog-parse.js';
const DAY = 864e5;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const atMidnight = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
export function timelineList(plans, active, status) {
  return plans.filter((p) => (!active.size || p.tags.some((t) => active.has(t)))
    && (!status.size || status.has(statusLabel(p.sprints))));
}
const planRange = (p) => {
  const ends = commits.filter((c) => c.plan === p.file && c.date).map((c) => c.date);
  const last = ends.length ? ends.sort()[ends.length - 1] : p.date;
  return [p.date, last >= p.date ? last : p.date];
};
export function paintTimeline(root, ctx) {
  const host = root.querySelector('[data-col="timeline"]');
  if (!host) return 0;
  const { plans, active, status, timeline } = ctx;
  if (!timeline) { host.innerHTML = ''; host.hidden = true; return 0; }
  host.hidden = false;
  const list = timelineList(plans, active, status).slice().reverse();
  const now = Date.now();
  const todayK = iso(new Date(now));
  const bounds = list.flatMap(planRange).filter(Boolean).concat([todayK]).sort();
  if (!bounds.length) { host.innerHTML = ''; host.hidden = true; return 0; }
  const startMs = atMidnight(bounds[0] + 'T00:00:00');
  const endMs = atMidnight(bounds[bounds.length - 1] + 'T00:00:00');
  const days = Math.max(1, Math.round((endMs - startMs) / DAY) + 1);
  const col = (k) => Math.round((atMidnight(k + 'T00:00:00') - startMs) / DAY);
  const rows = list.map((p, i) => {
    const [s, e] = planRange(p);
    const done = planStatus(p.sprints) === 'done';
    const num = p.id || String(list.length - i).padStart(2, '0');
    return `<div class="ds-tl-row"><button class="ds-tl-barname" data-tl-open="${p.file}" title="${p.title.replace(/"/g, '')}"><span class="ds-num">${num}</span> ${p.title}</button>` +
      `<div class="ds-tl-lane"><div class="ds-tl-bar${done ? '" data-popdone="1' : ''}" data-tl-open="${p.file}" style="left:calc(${col(s)} * var(--cl-16));width:calc(${(col(e) - col(s) + 1)} * var(--cl-16) - var(--cl-4))" aria-label="${p.title.replace(/"/g, '')}"></div></div></div>`;
  }).join('');
  const mo = [];
  for (let d = 0; d < days; d++) {
    const dt = new Date(startMs + d * DAY);
    if (dt.getDate() === 1) mo.push(`<span class="ds-tl-tick" style="left:calc(${d} * var(--cl-16))">${dt.toLocaleString('en', { month: 'short' })}</span>`);
  }
  const todayFrac = (now - startMs) / DAY;
  const todayCol = `<div class="ds-tl-todaycol" style="left:calc(${Math.floor(todayFrac)} * var(--cl-16));width:var(--cl-16)"></div>` +
    `<div class="ds-tl-today" style="left:calc(${todayFrac.toFixed(4)} * var(--cl-16))"></div>`;
  host.innerHTML = `<div class="ds-tl-head"><b>Timeline</b><button data-tl-close aria-label="Close timeline">✕</button></div>` +
    `<div class="ds-tl-scroll"><div class="ds-tl-body" style="--tl-days:${days}"><div class="ds-tl-axis"><div class="ds-tl-corner"></div><div class="ds-tl-ticks">${mo.join('')}</div></div>${rows}${todayCol}</div></div>`;
  return list.length;
}
