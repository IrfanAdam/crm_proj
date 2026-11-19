/* ADAM/DS — ds/changelog/cancelled · cancelled-task accounting (view layer only).
   norm() flags a withdrawn item with <span class="ds-cancelled">✗ cancelled</span> but leaves its
   checkbox unchecked (`- [ ]`), so state() counts it pending and a finished phase can never read
   DONE. These helpers split the live fraction back out — cancelled rows leave both numerator and
   denominator — so the phase reads DONE with a "K cancelled" subtext instead. Both flag shapes
   (`- [ ]` today, `- [x]` if norm ever marks them done) are handled. Never feeds hash()/norm(),
   so section hashes and the edited/revision record stay put. */
const rowsOf = (body) => {
  let fence = false; const out = [];
  for (const ln of String(body || '').split('\n')) {
    if (/^\s*```/.test(ln)) { fence = !fence; continue; }
    if (!fence && /^-\s*\[[ xX]\]/.test(ln)) out.push(ln);
  } return out;
};
// Marker lives on the row's own first line (norm puts the flag before any detail), so a
// stray ✗ inside a detail paragraph or a results table is never mistaken for a task.
const isCx = (ln) => /ds-cancelled/.test(ln) || /✗/.test(ln);
export const cancelled = (body) => {
  const rows = rowsOf(body);
  if (rows.length) return rows.filter(isCx).length;
  // Un-normalised body: no list rows yet, count raw `### Task … ✗` headings instead.
  return (String(body || '').match(/^###\s*Task[^\n]*✗/gim) || []).length;
};
// Live fraction: cancelled rows leave both numerator and denominator. '' when nothing live.
export const liveState = (body) => {
  const rows = rowsOf(body), k = rows.filter(isCx).length;
  const d = rows.filter((l) => /^-\s*\[[xX]\]/.test(l) && !isCx(l)).length, t = rows.length - k;
  return t ? `${d}/${t}` : '';
};
// Whole-phase cancellation wins: head ✗ (or ✓-less head with zero live tasks) is cancelled.
export const phaseCancelled = (head, body) => /✗/.test(String(head || '')) || (!liveState(body) && cancelled(body) > 0);
export const cxTag = (k) => (k ? `${k} cancelled` : '');
