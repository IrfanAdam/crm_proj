/* ADAM/GLASS — src/glass/fab-spring.js · gooey spring drive for the floating gem (dock FAB). */
// Exports: attachGooey(el) → { refresh, detach }. One physics, three springs: position lag, lag-stretch, press squish.
// Feel constants are live CSS vars the caller retunes: --fab-elasticity (1/s²) · --fab-damping (ζ) · --fab-stretch · --fab-squish.
// Shared by the app (FabGem.jsx) and the DS lab (src/ds/fab-lab.js).
import { getZoom } from "./rect-zoom.js";
import { getScale } from "../logic/time-scale.js";

const VARS = { k: ["--fab-elasticity", 800], z: ["--fab-damping", 0.5], st: ["--fab-stretch", 0.26], sq: ["--fab-squish", 0.08] };
const num = (el, name, d) => {
  const v = parseFloat(getComputedStyle(el).getPropertyValue(name));
  return Number.isFinite(v) ? v : d;
};
/* semi-implicit spring: s chases x with stiffness k, damping ratio z */
const step = (s, v, x, k, z, dt) => {
  v += (-k * (s - x) - 2 * Math.sqrt(k) * z * v) * dt;
  return [s + v * dt, v];
};
/* elasticity outside the device bounds — the blob pulls back on a ¼-gain rubber band */
const rubber = (v, lo, hi) => (v < lo ? lo + (v - lo) * 0.25 : v > hi ? hi + (v - hi) * 0.25 : v);

export function attachGooey(el) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return { refresh() {}, detach() {} };
  let V = read();
  let raf = 0, last = 0, pid = null, down = false, drag = false;
  let x = 0, y = 0, vx = 0, vy = 0, e = 0, ve = 0, p = 0, vp = 0, tx = 0, ty = 0;
  let sx = 0, sy = 0, lo = [0, 0], hi = [0, 0];
  function read() { const o = {}; for (const [k, [name, d]] of Object.entries(VARS)) o[k] = num(el, name, d); return o; }
  /* bounds in layout px, relative to home — measured from live rects (zoom-corrected) so any
     offsetParent/transient layout cannot widen the rubber window; center is derived by removing
     the current translate, which also makes a mid-flight grab measure the true home. */
  function measure() {
    const par = el.offsetParent || el.parentElement;
    const z = getZoom();
    const b = par.getBoundingClientRect(), r = el.getBoundingClientRect();
    const half = el.offsetWidth / 2, m = 6;
    const hcx = (r.left + r.width / 2 - b.left) / z - x, hcy = (r.top + r.height / 2 - b.top) / z - y;
    lo = [half + m - hcx, half + m - hcy];
    hi = [b.width / z - half - m - hcx, b.height / z - half - m - hcy];
  }
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const tick = () => {
    raf = 0;
    const now = performance.now();
    const dt = Math.min(Math.max((now - last) / 1000, 0.001), 1 / 30) * getScale(); // rides the workspace slow-mo
    last = now;
    [x, vx] = step(x, vx, tx, V.k, drag ? 0.9 : V.z, dt);
    [y, vy] = step(y, vy, ty, V.k, drag ? 0.9 : V.z, dt);
    const ox = tx - x, oy = ty - y, d = Math.hypot(ox, oy);
    [e, ve] = step(e, ve, drag ? Math.min(d / 95, 1) * V.st : 0, drag ? 220 : 160, 0.7, dt); // full stretch at 95px of lag
    [p, vp] = step(p, vp, down && !drag ? 1 : 0, 760, down ? 0.95 : 0.38, dt);
    /* safety clamp — never park outside home ± rubber window + flight margin */
    x = Math.min(hi[0] + 90, Math.max(lo[0] - 90, x));
    y = Math.min(hi[1] + 90, Math.max(lo[1] - 90, y));
    const th = d > 1 ? Math.atan2(oy, ox) : 0;
    el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${(1 + p * V.sq * 0.55).toFixed(4)},${(1 - p * V.sq).toFixed(4)}) rotate(${th.toFixed(5)}rad) scale(${(1 + e).toFixed(4)},${(1 - e * 0.5).toFixed(4)}) rotate(${(-th).toFixed(5)}rad)`;
    if (!down && Math.abs(x) < 0.3 && Math.abs(y) < 0.3 && Math.hypot(vx, vy) < 1 && Math.abs(e) < 0.004 && Math.abs(p) < 0.01) {
      el.style.transform = "";
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  const onDown = (ev) => {
    if (down || (ev.button !== undefined && ev.button !== 0)) return;
    down = true; pid = ev.pointerId; drag = false;
    try { el.setPointerCapture(pid); } catch {}
    V = read(); measure();
    sx = ev.clientX; sy = ev.clientY; tx = 0; ty = 0;
    el.dataset.fabDown = "1";
    kick();
  };
  const onMove = (ev) => {
    if (!down || ev.pointerId !== pid) return;
    const dx = (ev.clientX - sx) / getZoom(), dy = (ev.clientY - sy) / getZoom();
    if (!drag && Math.hypot(dx, dy) > 8) { drag = true; delete el.dataset.fabDown; el.dataset.fabDrag = "1"; }
    if (drag) { tx = rubber(dx, lo[0], hi[0]); ty = rubber(dy, lo[1], hi[1]); }
  };
  const onUp = (ev) => {
    if (!down || ev.pointerId !== pid) return;
    down = false; pid = null;
    if (drag) { el.dataset.fabMoved = "1"; setTimeout(() => delete el.dataset.fabMoved, 0); }
    drag = false; tx = 0; ty = 0;
    delete el.dataset.fabDown; delete el.dataset.fabDrag;
    kick();
  };
  const ac = new AbortController();
  const opt = { signal: ac.signal };
  el.addEventListener("pointerdown", onDown, opt);
  el.addEventListener("pointermove", onMove, opt);
  el.addEventListener("pointerup", onUp, opt);
  el.addEventListener("pointercancel", onUp, opt);
  return {
    refresh() { V = read(); },
    detach() {
      ac.abort(); cancelAnimationFrame(raf);
      delete el.dataset.fabDown; delete el.dataset.fabDrag; delete el.dataset.fabMoved;
      el.style.transform = "";
    },
  };
}
