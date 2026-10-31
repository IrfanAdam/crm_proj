/* ADAM/DS — ds/changelog/tl-meta · lane popover metadata · [plan:2026-10-31_135705-changelog-safepipe-parity.md#phase-4] */
import { planStatus, state, isDone } from '../changelog-parse.js';
import history from '../../../design-system/plan-history.json';
export const noq = (s) => String(s || '').replace(/"/g, '');
export const dPart = (k) => {
  const d = new Date(k + 'T00:00:00');
  return { t: `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`, y: d.getFullYear() };
};
export const spanText = (s, e) => {
  const a = dPart(s), b = dPart(e);
  if (s === e) return `${a.t} ${a.y}`;
  return a.y === b.y ? `${a.t} – ${b.t} ${b.y}` : `${a.t} ${a.y} – ${b.t} ${b.y}`;
};
export const plain = (s) => String(s || '')
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/[*_`#>|]/g, '')
  .replace(/\s+/g, ' ')
  .trim();
// Popover payload for one lane: goal, phases/tasks fractions, status, commits/revs, range.
export const laneMeta = (p, e, n) => {
  const tot = p.sprints.length;
  const dn = p.sprints.filter((s) => isDone(state(s.body))).length;
  const rv = (history[p.file] || []).length;
  const ps = planStatus(p.sprints);
  const dE = dPart(e);
  const st = ps === 'done' ? `Done ${dE.t} ${dE.y}` : ps === 'cancelled' ? 'Cancelled' : 'In progress';
  const desc = plain(p.goal).slice(0, 220);
  return ` data-desc="${noq(desc)}" data-ph="${dn}/${tot}" data-cm="${n}" data-rv="${rv}" data-st="${noq(st)}" data-span="${spanText(p.date < e ? p.date : e, e)}"`;
};
