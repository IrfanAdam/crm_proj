// Port side-monotonicity guard.
// A side port must be approached from its own side: every point of the
// collinear approach run must lie outside (or level with) the port.
// A run reaching a W port from the east travelled *through* the card —
// reject it so the router falls back to a below/around candidate.
const TOL = 1.5;
function portSide(t, n) {
  if (Math.abs(t.x - n.x) < TOL + 0.51) return 'W';
  if (Math.abs(t.x - (n.x + n.w)) < TOL + 0.51) return 'E';
  if (Math.abs(t.y - n.y) < TOL + 0.51) return 'N';
  if (Math.abs(t.y - (n.y + n.h)) < TOL + 0.51) return 'S';
  return null;
}
function runPts(path, fromStart) {
  const q = fromStart ? path : [...path].reverse();
  const run = [q[0]], horiz = Math.abs(q[1].y - q[0].y) < .5;
  for (let i = 1; i < q.length; i++) {
    const l = run[run.length - 1], p = q[i];
    if (horiz ? Math.abs(p.y - l.y) >= .5 : Math.abs(p.x - l.x) >= .5) break;
    run.push(p);
  }
  return run;
}
function runOk(path, fromStart, node) {
  const run = runPts(path, fromStart);
  const end = run[0];
  const side = portSide(end, node);
  if (!side) return true;
  for (const p of run) {
    if (side === 'W' && p.x > end.x + TOL) return false;
    if (side === 'E' && p.x < end.x - TOL) return false;
    if (side === 'N' && p.y > end.y + TOL) return false;
    if (side === 'S' && p.y < end.y - TOL) return false;
  }
  return true;
}
export function violatesCorridor(path, a, b) {
  if (!path || path.length < 2) return false;
  return !runOk(path, true, a) || !runOk(path, false, b);
}
