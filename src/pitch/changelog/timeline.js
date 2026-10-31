/* ADAM/DS — ds/changelog/timeline · per-plan track rows + today line */
import { commits } from '../changelog-links.js';
import { planStatus, statusLabel, state, isDone, buildState } from '../changelog-parse.js';
import { dueOf } from './due-core.js';
const DAY = 864e5;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const atMidnight = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const addDays = (k, n) => iso(new Date(atMidnight(k + 'T00:00:00') + n * DAY));
const noq = (s) => String(s || '').replace(/"/g, '');
export function timelineList(plans, active, status) {
  return plans.filter((p) => (!active.size || p.tags.some((t) => active.has(t)))
    && (!status.size || status.has(statusLabel(p.sprints))));
}
const planRange = (p) => {
  const ends = commits.filter((c) => c.plan === p.file && c.date).map((c) => c.date);
  const last = ends.length ? ends.sort()[ends.length - 1] : p.date;
  return [p.date, last >= p.date ? last : p.date];
};
// Upcoming work: last activity → Due of first open section with Due (else +21d).
const ghostOf = (p, last, todayK) => {
  if (planStatus(p.sprints) === 'done') return null;
  const open = (p.sprints || []).filter((s) => !isDone(state(s.body)));
  const own = open.find((s) => dueOf(s.body)) || open[0];
  if (!own) return null;
  const due = dueOf(own.body);
  const to = /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : addDays(last, 21);
  if (to <= last) return null;
  return { from: addDays(last, 1), to, overdue: !!due && due < todayK, due };
};
const covOf = (p) => {
  const m = String(buildState(p.sprints || [])).match(/(\d+)\/(\d+)/);
  return m && Number(m[2]) ? Math.round(Number(m[1]) / Number(m[2]) * 100) : 0;
};
export function paintTimeline(root, ctx) {
  const host = root.querySelector('[data-col="timeline"]');
  if (!host) return 0;
  const { plans, active, status, timeline, open } = ctx;
  if (!timeline || open) { host.innerHTML = ''; host.hidden = true; return 0; }
  host.hidden = false;
  const list = timelineList(plans, active, status).slice().reverse();
  const now = Date.now();
  const todayK = iso(new Date(now));
  if (!list.length) {
    host.innerHTML = `<div class="ds-tl-head"><b>Timeline</b><button data-tl-close aria-label="Close timeline">✕</button></div>` +
      `<div class="ds-tl-scroll"><p class="ds-tl-empty">Nothing matches the current filters yet.</p></div>`;
    return 0;
  }
  const info = list.map((p) => {
    const [s, e] = planRange(p);
    const cc = commits.filter((c) => c.plan === p.file && c.date);
    return { p, s, e, g: ghostOf(p, e, todayK), n: cc.length, cov: covOf(p) };
  });
  const bounds = info.flatMap((r) => [r.s, r.e, r.g ? r.g.from : '', r.g ? r.g.to : '']).filter(Boolean).concat([todayK]).sort();
  const startMs = atMidnight(bounds[0] + 'T00:00:00');
  const endMs = atMidnight(bounds[bounds.length - 1] + 'T00:00:00');
  const days = Math.max(1, Math.round((endMs - startMs) / DAY) + 1);
  const col = (k) => Math.round((atMidnight(k + 'T00:00:00') - startMs) / DAY);
  const geom = (s, e) => `left:calc(${col(s)} * var(--cl-16));width:calc(${col(e) - col(s) + 1} * var(--cl-16) - var(--cl-4))`;
  const rows = info.map((r, i) => {
    const num = r.p.id || String(list.length - i).padStart(2, '0');
    const nm = `<span class="ds-tl-barname"><span class="ds-num">${num}</span> ${r.p.title}</span>`;
    const tip = `${r.n} commit${r.n === 1 ? '' : 's'} · ${r.s} → ${r.e}`;
    const barW = col(r.e) - col(r.s) + 1, gW = r.g ? col(r.g.to) - col(r.g.from) + 1 : 0;
    const bar = `<div class="ds-tl-bar" data-tl-open="${r.p.file}" data-tip="${noq(r.p.title)} · ${tip}" style="${geom(r.s, r.e)};--tl-done:${r.cov}%" aria-label="${noq(r.p.title)}">${barW >= gW ? nm : ''}</div>`;
    let g = '';
    if (r.g) {
      const gt = `Due ${r.g.due || r.g.to}${r.g.overdue ? ' · overdue' : ''} · ${noq(r.p.title)}`;
      g = `<div class="ds-tl-ghost${r.g.overdue ? ' is-overdue' : ''}" data-tl-open="${r.p.file}" data-tip="${gt}" style="${geom(r.g.from, r.g.to)}" aria-label="${gt}">${gW > barW ? nm : ''}</div>`;
    }
    return `<div class="ds-tl-row"><div class="ds-tl-lane">${bar}${g}</div></div>`;
  }).join('');
  const mo = [];
  for (let d = 0; d < days; d++) {
    const dt = new Date(startMs + d * DAY);
    mo.push(dt.getDate() === 1
      ? `<span class="ds-tl-tick is-month" style="left:calc(${d} * var(--cl-16))">${dt.toLocaleString('en', { month: 'short' })}</span>`
      : `<span class="ds-tl-tick" style="left:calc(${d} * var(--cl-16))">${dt.getDate()}</span>`);
  }
  const todayFrac = (now - startMs) / DAY;
  const todayCol = `<div class="ds-tl-todaycol" style="left:calc(${Math.floor(todayFrac)} * var(--cl-16));width:var(--cl-16)"></div>` +
    `<div class="ds-tl-today" style="left:calc(${todayFrac.toFixed(4)} * var(--cl-16))"></div>`;
  host.innerHTML = `<div class="ds-tl-head"><b>Timeline</b><small>${bounds[0]} → ${bounds[bounds.length - 1]}</small><button data-tl-close aria-label="Close timeline">✕</button></div>` +
    `<div class="ds-tl-scroll"><div class="ds-tl-body" style="--tl-days:${days}"><div class="ds-tl-axis"><div class="ds-tl-ticks">${mo.join('')}</div></div>${rows}${todayCol}</div></div>`;
  try {
    requestAnimationFrame(() => {
      try {
        const sc = host.querySelector('.ds-tl-scroll'), lane = host.querySelector('.ds-tl-lane');
        if (!sc || !lane) return;
        const dayPx = lane.getBoundingClientRect().width / days;
        if (!dayPx) return;
        const x = todayFrac * dayPx;
        if (x < sc.scrollLeft || x > sc.scrollLeft + sc.clientWidth) sc.scrollLeft = Math.max(0, x - sc.clientWidth * 0.3);
      } catch {}
    });
  } catch {}
  return list.length;
}
