/* ADAM/MOTION — src/motion/gooey.js · the gooey effect as a function — attachGooey(any element). */
// Resisted pull, strain stretch, press squish, wobble home — springs integrated per frame; no keyframes.
// Feel constants are live CSS vars the caller sets:
//   --gooey-elasticity · stiffness (1/s²)   --gooey-damping · release ζ   --gooey-give · max travel px (0 = anchored)
//   --gooey-stretch · strain at 95px of pull   --gooey-squish · press compression
// While held: data-gooey="press|drag" (style it). After a drag, data-gooey-moved survives one tick
// so a trailing click can be swallowed: if (!el.dataset.gooeyMoved) act();
// Reduced motion: no drive — style :active yourself. Rides time-scale slow-mo. window.Gooey alias.
import { getScale } from "../logic/time-scale.js";

const VARS = { k: ["--gooey-elasticity", 800], z: ["--gooey-damping", 0.5], st: ["--gooey-stretch", 0.26], sq: ["--gooey-squish", 0.08], gv: ["--gooey-give", 14] };
const SOFT = 42, FULL = 95; // px of finger draw before travel loads the rubber · px of pull for full strain
const num = (el, name, d) => { const v = parseFloat(getComputedStyle(el).getPropertyValue(name)); return Number.isFinite(v) ? v : d; };
/* semi-implicit spring: s chases x with stiffness k, damping ratio z */
const step = (s, v, x, k, z, dt) => { v += (-k * (s - x) - 2 * Math.sqrt(k) * z * v) * dt; return [s + v * dt, v]; };
/* effective visual scale (canvas zoom, ancestor transforms) read off the element itself */
const visScale = (el) => { const r = el.getBoundingClientRect(); return (r.width + r.height) / (el.offsetWidth + el.offsetHeight) || 1; };

export function attachGooey(el) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return { refresh() {}, detach() {} };
  let V = read();
  let raf = 0, last = 0, pid = null, down = false, drag = false, vs = 1;
  let x = 0, y = 0, vx = 0, vy = 0, e = 0, ve = 0, p = 0, vp = 0, tx = 0, ty = 0, dx = 0, dy = 0, px = 0, py = 0, th = 0, sx = 0, sy = 0, lo = [0, 0], hi = [0, 0];
  function read() { const o = {}; for (const [k, [name, d]] of Object.entries(VARS)) o[k] = num(el, name, d); return o; }
  /* bounds in layout px, relative to home — from live rects (scale-corrected) so any parent chain or
     transient layout cannot widen the give; the current translate is removed, so a mid-flight grab
     measures the true home. Grab at rest for exact scale. */
  function measure() {
    const par = el.offsetParent || el.parentElement;
    vs = visScale(el);
    const b = par.getBoundingClientRect(), r = el.getBoundingClientRect();
    const half = el.offsetWidth / 2, m = 6;
    const hcx = (r.left + r.width / 2 - b.left) / vs - x, hcy = (r.top + r.height / 2 - b.top) / vs - y;
    lo = [half + m - hcx, half + m - hcy];
    hi = [b.width / vs - half - m - hcx, b.height / vs - half - m - hcy];
  }
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const tick = () => {
    raf = 0;
    const now = performance.now();
    const dt = Math.min(Math.max((now - last) / 1000, 0.001), 1 / 30) * getScale(); // rides the workspace slow-mo
    last = now;
    [x, vx] = step(x, vx, tx, V.k, drag ? 0.9 : V.z, dt);
    [y, vy] = step(y, vy, ty, V.k, drag ? 0.9 : V.z, dt);
    if (down) { px += (dx - x - px) * 0.3; py += (dy - y - py) * 0.3; } // smoothed pull vector
    const pl = Math.hypot(px, py);
    [e, ve] = step(e, ve, drag ? Math.min(pl / FULL, 1) * V.st : 0, drag ? 220 : 160, 0.7, dt);
    [p, vp] = step(p, vp, down && !drag ? 1 : 0, 760, down ? 0.95 : 0.38, dt);
    e = Math.max(0, Math.min(V.st, e)); p = Math.min(1.2, Math.max(-0.35, p)); // output guards — shape never flashes
    if (pl > 6) th = Math.atan2(py, px); // gate: the strain axis never flips under tremor
    x = Math.min(hi[0], Math.max(lo[0], x));
    y = Math.min(hi[1], Math.max(lo[1], y));
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
    sx = ev.clientX; sy = ev.clientY; dx = dy = px = py = 0; tx = ty = 0;
    el.dataset.gooey = "press";
    kick();
  };
  const onMove = (ev) => {
    if (!down || ev.pointerId !== pid) return;
    dx = (ev.clientX - sx) / vs; dy = (ev.clientY - sy) / vs;
    if (!drag && Math.hypot(dx, dy) > 8) { drag = true; px = dx; py = dy; el.dataset.gooey = "drag"; }
    if (drag) {
      const d = Math.hypot(dx, dy), u = d / SOFT, t = Math.min(d, V.gv * u * u / (1 + u * u)); // resisted travel
      tx = Math.min(hi[0], Math.max(lo[0], d ? (dx / d) * t : 0));
      ty = Math.min(hi[1], Math.max(lo[1], d ? (dy / d) * t : 0));
    }
  };
  const onUp = (ev) => {
    if (!down || ev.pointerId !== pid) return;
    down = false; pid = null;
    if (drag) { el.dataset.gooeyMoved = "1"; setTimeout(() => delete el.dataset.gooeyMoved, 0); vx *= 0.3; vy *= 0.3; vp *= 0.3; } // shed pointer momentum — the snap must not slosh
    drag = false; tx = 0; ty = 0; delete el.dataset.gooey; kick();
  };
  const ac = new AbortController(); const opt = { signal: ac.signal };
  el.addEventListener("pointerdown", onDown, opt);
  el.addEventListener("pointermove", onMove, opt);
  el.addEventListener("pointerup", onUp, opt);
  el.addEventListener("pointercancel", onUp, opt);
  return {
    refresh() { V = read(); },
    detach() {
      ac.abort(); cancelAnimationFrame(raf);
      delete el.dataset.gooey; delete el.dataset.gooeyMoved;
      el.style.transform = "";
    },
  };
}
if (typeof window !== "undefined") window.Gooey = { attachGooey };
