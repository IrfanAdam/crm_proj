import { NODES, GROUPS, EDGES } from './graph.js';
import { violatesCorridor } from './corridor.js';
const cache = new Map();
export function clearRouteCache() { cache.clear(); }
const grp = n => GROUPS.find(g=>g.id===n.group);
const STUB = 12, PAD = 8;
const cx = n => n.x + n.w / 2, cy = n => n.y + n.h / 2;
const pairKey = (x, y) => x < y ? x + '<>' + y : y + '<>' + x;
function edgeIdx(aId,bId){ const k=pairKey(aId,bId); for(let i=0;i<EDGES.length;i++){ if(pairKey(EDGES[i].from,EDGES[i].to)===k) return i; } return 0; }
function obstacles(a, b) {
  const ga = grp(a), gb = grp(b), o = [];
  for (const n of NODES) { const p = (n === a || n === b) ? 0 : PAD; o.push({ x: n.x - p, y: n.y - p, w: n.w + p * 2, h: n.h + p * 2, wgt: 3 }); }
  for (const g of GROUPS) { if (g === ga || g === gb) continue; o.push({ x: g.x - 3, y: g.y - 3, w: g.w + 6, h: g.h + 6, wgt: 4 }); }
  return o;
}
function hitV(x, y1, y2, o) { const lo = Math.min(y1, y2), hi = Math.max(y1, y2); for (const r of o) if (x > r.x && x < r.x + r.w && hi > r.y && lo < r.y + r.h) return r; return null; }
function hitH(y, x1, x2, o) { const lo = Math.min(x1, x2), hi = Math.max(x1, x2); for (const r of o) if (y > r.y && y < r.y + r.h && hi > r.x && lo < r.x + r.w) return r; return null; }
function freeCh(v, f1, f2, vert, o) {
  const h = vert ? hitV(v, f1, f2, o) : hitH(v, f1, f2, o);
  if (!h) return v;
  for (const d of [12, 22, 34, 48, 64, 88, 120, 160]) {
    const away = vert ? (v < h.x + h.w / 2 ? -1 : 1) : (v < h.y + h.h / 2 ? -1 : 1);
    for (const s of [away, -away]) { const c = v + s * d; if (!(vert ? hitV(c, f1, f2, o) : hitH(c, f1, f2, o))) return c; }
  }
  return v;
}
function ports(n) {
  return { E: { x: n.x + n.w, y: cy(n), dx: 1, dy: 0 }, W: { x: n.x, y: cy(n), dx: -1, dy: 0 }, S: { x: cx(n), y: n.y + n.h, dx: 0, dy: 1 }, N: { x: cx(n), y: n.y, dx: 0, dy: -1 } };
}
function join(p, q, o, hint = 0) {
  const s0 = { x: p.x + p.dx * STUB, y: p.y + p.dy * STUB }, s1 = { x: q.x + q.dx * STUB, y: q.y + q.dy * STUB };
  if (p.dx !== 0 && q.dx !== 0) { const gx = freeCh((s0.x + s1.x) / 2 + hint, s0.y, s1.y, true, o); return [p, s0, { x: gx, y: s0.y }, { x: gx, y: s1.y }, s1, q]; }
  if (p.dx === 0 && q.dx === 0) { const gy = freeCh((s0.y + s1.y) / 2 + hint, s0.x, s1.x, false, o); return [p, s0, { x: s0.x, y: gy }, { x: s1.x, y: gy }, s1, q]; }
  const e1 = [p, s0, { x: s1.x, y: s0.y }, s1, q], e2 = [p, s0, { x: s0.x, y: s1.y }, s1, q];
  return cost(e1, o) <= cost(e2, o) ? e1 : e2;
}
function highway(a, b, o, idx) {
  const P = ports(a), Q = ports(b);
  const s0 = { x: P.S.x, y: P.S.y + STUB }, s1 = { x: Q.S.x, y: Q.S.y + STUB };
  const lane = Math.max(...GROUPS.map(g => g.y + g.h)) + 22 + (idx % 4) * 14;
  const x0 = freeCh(s0.x, s0.y, lane, true, o), x1 = freeCh(s1.x, s1.y, lane, true, o);
  return [P.S, s0, { x: x0, y: s0.y }, { x: x0, y: lane }, { x: x1, y: lane }, { x: x1, y: s1.y }, s1, Q.S];
}
function cost(path, o) {
  let h = 0, len = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i], q = path[i + 1];
    const r = Math.abs(p.x - q.x) < .5 ? hitV(p.x, p.y, q.y, o) : hitH(p.y, p.x, q.x, o);
    if (r) h += r.wgt;
    len += Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
  }
  return h * 400 + (path.length - 2) * 12 + len * 0.05;
}
function clean(pts) {
  const d = [];
  for (const p of pts) { const l = d[d.length - 1]; if (!l || Math.abs(p.x - l.x) > .5 || Math.abs(p.y - l.y) > .5) d.push({ x: Math.round(p.x * 2) / 2, y: Math.round(p.y * 2) / 2 }); }
  const c = [d[0]];
  for (let i = 1; i < d.length - 1; i++) {
    const a = c[c.length - 1], b = d[i], e = d[i + 1];
    if ((Math.abs(a.x - b.x) < .5 && Math.abs(b.x - e.x) < .5) || (Math.abs(a.y - b.y) < .5 && Math.abs(b.y - e.y) < .5)) continue;
    c.push(b);
  }
  c.push(d[d.length - 1]);
  return c;
}
export function getRoute(a, b, ax, ay, bx, by) {
  const key = `${pairKey(a.id, b.id)}|${a.x},${a.y},${b.x},${b.y}`;
  if (cache.has(key)) return cache.get(key);
  const ga = grp(a), gb = grp(b);
  if (!ga || !gb) { const f = [{ x: ax, y: ay }, { x: bx, y: by }]; const r = { path: f, cost: 999, ang: Math.atan2(by - ay, bx - ax), ax, ay, bx, by }; cache.set(key, r); return r; }
  const P = ports(a), Q = ports(b), o = obstacles(a, b);
  const idx = edgeIdx(a.id,b.id);
  const dx = cx(b) - cx(a), dy = cy(b) - cy(a);
  let cands;
  if (ga.id === gb.id) cands = [join(P.E, Q.E, o, (idx % 4) * 10), highway(a, b, o, idx)];
  else if (Math.abs(dx) > Math.abs(dy)) cands = dx > 0 ? [join(P.E, Q.W, o), join(P.E, Q.E, o, 14), highway(a, b, o, idx)] : [join(P.W, Q.E, o), join(P.W, Q.W, o, -14), highway(a, b, o, idx)];
  else cands = dy > 0 ? [join(P.S, Q.N, o), join(dx >= 0 ? P.E : P.W, dx >= 0 ? Q.W : Q.E, o), join(P.E, Q.E, o, 18), join(P.W, Q.W, o, -18), highway(a, b, o, idx)] : [join(P.N, Q.S, o), join(dx >= 0 ? P.E : P.W, dx >= 0 ? Q.W : Q.E, o), join(P.E, Q.E, o, 18), join(P.W, Q.W, o, -18), highway(a, b, o, idx)];
  let best = cands[0], bc = Infinity;
  const fair = cands.filter(p => !violatesCorridor(clean(p), a, b));
  if (fair.length) cands = fair;
  for (const p of cands) { const c = cost(p, o); if (c < bc) { bc = c; best = p; } }
  const path = clean(best);
  const s = path[0], t = path[path.length - 1], pen = path[path.length - 2];
  const res = { ax: s.x, ay: s.y, bx: t.x, by: t.y, path, cost: bc, ang: Math.atan2(t.y - pen.y, t.x - pen.x) };
  cache.set(key, res);
  return res;
}
