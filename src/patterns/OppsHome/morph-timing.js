/* ADAM/PAGE — src/patterns/OppsHome/morph-timing.js · curves for the sheet morph */
// Export map: OPEN · CLOSE · FADE · walk · clamp01
// — cubic bezier timing (Newton root find; the same curve families the CSS easings name) —
const A = (a, b) => 1 - 3 * b + 3 * a;
const B = (a, b) => 3 * b - 6 * a;
const C = (a) => 3 * a;
const curve = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
function bez(x1, y1, x2, y2) {
  return function (p) {
    if (p <= 0 || p >= 1) return p;
    let t = p;
    for (let i = 0; i < 6; i++) {
      const d = slope(t, x1, x2);
      if (Math.abs(d) < 1e-5) break;
      t -= (curve(t, x1, x2) - p) / d;
    }
    return curve(t, y1, y2);
  };
}
// — scalar path: [progress, value, easing] — 0 = the widget's rect, 1 = the screen —
// open grows straight out of the widget's rect, overshoots a touch and settles; close eases out and lands on the rect
export const OPEN = [[0, 0, null], [.8, 1.022, bez(.3, .7, .3, 1)], [1, 1, bez(.35, 0, .2, 1)]];
export const CLOSE = [[0, 1, null], [1, 0, bez(.3, .7, .3, 1)]];
// — overlay fade windows as [from, to] of progress (read in reverse on close) —
// `layer` doubles as the map's warm-up: the sheet's tile layer is faded in while the window is
// still inside the widget's rect, so a not-yet-decoded tile set can never show as a flash
// card holds at 0 while the pill ghost covers its rect, then cross-fades as the ghost does
export const FADE = { open: { card: [.84, .98], x: [.5, .9], scrim: [0, .45], layer: [0, .18] }, close: { card: [.3, .05], x: [.25, 0], scrim: [.75, 0] } };
export function walk(stops, p) {
  for (let i = 1; i < stops.length; i++) {
    const [p0, u0] = stops[i - 1];
    const [p1, u1, e] = stops[i];
    if (p <= p1 || i === stops.length - 1) {
      const k = p1 > p0 ? Math.min(Math.max((p - p0) / (p1 - p0), 0), 1) : 1;
      return u0 + (u1 - u0) * (e ? e(k) : k);
    }
  }
  return stops[stops.length - 1][1];
}
export const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
