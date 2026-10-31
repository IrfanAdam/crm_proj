/* ADAM/DS — ds/changelog/due · optimistic due saves + override layer.
   The file wins whenever it carries a Due; overrides re-apply to dateless
   sections at boot (static builds have no writer). Server truth returned by
   the commit response is applied to the visible section with no re-poll. */
import { applyDueEdit, dueOf } from './due-core.js';
import { split } from '../changelog-parse.js';
const LS = 'ds-due-overrides';
const readOv = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; } };
const writeOv = (o) => { try { localStorage.setItem(LS, JSON.stringify(o)); } catch {} };
const errs = {};
export const dueFor = (planFile, head, body) => dueOf(body) || (readOv()[planFile + '|' + head] || '');
export const dueErr = (planFile, head) => errs[planFile + '|' + head] || '';
export const applyOverrides = (plans) => {
  const ov = readOv();
  for (const k of Object.keys(ov)) {
    const i = k.indexOf('|'); if (i < 0) continue;
    const p = plans.find((x) => x.file === k.slice(0, i));
    const s = p && p.sprints.find((x) => x.head === k.slice(i + 1));
    if (!s || dueOf(s.body)) { if (s) delete ov[k]; continue; }
    const next = applyDueEdit(s.body, s.head, ov[k]);
    if (next !== null) s.body = next;
  }
  writeOv(ov);
};
const post = async (payload) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch('/__ds/due', { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload), signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return { ok: false, error: `http ${r.status}` };
    return await r.json();
  } catch { clearTimeout(t); return null; }
};
export const saveDue = async (plan, sprint, due, ui) => {
  const key = plan.file + '|' + sprint.head;
  const ghost = applyDueEdit(sprint.body, sprint.head, due);
  if (ghost === null) { ui.fail('head-not-found'); return; }
  sprint.body = ghost;
  delete errs[key];
  ui.pending();
  let res = await post({ file: plan.file, head: sprint.head, due });
  if (!res) res = await post({ file: plan.file, head: sprint.head, due });
  if (res && res.ok) {
    const ov = readOv(); delete ov[key]; writeOv(ov);
    if (res.content && !res.unchanged) {
      const fresh = split(res.content).find((x) => x.head === (res.head || sprint.head));
      if (fresh) sprint.body = fresh.body;
    }
    ui.done();
  } else {
    const ov = readOv(); ov[key] = due; writeOv(ov);
    errs[key] = res ? res.error || 'http' : 'offline';
    ui.fail(errs[key]);
  }
};
