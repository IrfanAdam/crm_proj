/* ADAM/DS — ds/changelog/task-commits · a trailer anchor of `task-N` belongs to
   Task N, so the drawer can hang the commit under that task's own fold instead
   of the phase-level Commits panel. hits() still counts them as linked. */
import { hits } from '../changelog-links.js';
const TASK = /^task[\s_-]*0*(\d+)$/i;
export const taskHits = (file, body, first) => {
  const out = {};
  for (const c of hits(file, body, first)) {
    const m = String(c.anchor || '').match(TASK);
    if (m) (out[m[1]] = out[m[1]] || []).push(c);
  }
  return out;
};
export const shas = (byTask) => new Set(Object.values(byTask).flat().map((c) => c.sha));
