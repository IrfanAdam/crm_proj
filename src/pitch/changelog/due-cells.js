/* ADAM/DS — ds/changelog/due-cells · calendar due-day cells (budget extract).
   Due-only and future-due days render as hollow filter buttons; commit days
   keep their level tint and gain an is-due ring plus a `+ M Due` tip suffix. */
import { fmtDate } from '../changelog-parse.js';
const btn = (cls, k, tip, label, day, extraAria) => [
  `<button class="ds-day ${cls}" data-day="`,
  k,
  `" data-tip="`,
  tip,
  `" aria-pressed="`,
  day === k,
  `" aria-label="`,
  label,
  ` — filter list"></button>`,
].join('');
export const futureDueCell = (k, m, day) => btn(`is-future is-due`, k,
  `${m} Due · ${fmtDate(k)}`, `${m} due on ${fmtDate(k)}`, day);
export const dueOnlyCell = (k, m, day, todayCls) => btn(`is-due${todayCls}${day === k ? ' on' : ''}`, k,
  `${m} Due · ${fmtDate(k)}`, `${m} due on ${fmtDate(k)}`, day);
