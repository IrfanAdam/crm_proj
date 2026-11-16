/* ADAM/PAGE — src/patterns/OppsHome/sheet-morph.js · widget ↔ full-screen map morph */
// Export map: MARGIN · fitLayer · morph
/* The tiles never scale. A clipping window grows from the widget's rect to the screen while
   the tile layer keeps its own size and stays centred on HOME, so the morph starts on the
   widget's own map and lands back on it — no squashed copy, no matched-scale maths. */
import { CLOSE, FADE, OPEN, clamp01, walk } from "./morph-timing.js";
import { getScale } from "../../logic/time-scale.js";
export const MARGIN = 18;   // tile-layer bleed past the screen — covers the settle overshoot
export const OPEN_MS = 460;
export const CLOSE_MS = 320;
// — the layer is wider than the screen on all sides, so an overshoot never shows bare background —
/* one measurement per screen size, not one per call site: open() sizes the layer before the
   map invalidates (so the view lands centred) and morph() would re-read and re-write the
   same box a beat later. The cache makes the second call free. */
const fit = new WeakMap();
export function fitLayer(screen, layer) {
  const w = screen.clientWidth + MARGIN * 2;
  const h = screen.clientHeight + MARGIN * 2;
  const c = fit.get(layer);
  if (c && c.w === w && c.h === h) return;
  fit.set(layer, { w, h });
  layer.style.width = `${w}px`;
  layer.style.height = `${h}px`;
}
// — drive one morph; `rect` is the widget's inner box in screen px, `dir` +1 open / −1 close —
export function morph(parts, rect, dir, done, instant) {
  const { screen, win, layer, scrim, card, x, header } = parts;
  const W = screen.clientWidth;
  const H = screen.clientHeight;
  const open = dir > 0;
  const stops = open ? OPEN : CLOSE;
  const fade = open ? FADE.open : FADE.close;
  const lf = open ? fade.layer : null;
  const cx0 = rect.l + rect.w / 2;
  const cy0 = rect.t + rect.h / 2;
  fitLayer(screen, layer);
  const alpha = (kind, p) => {
    const [a, b] = fade[kind];
    return clamp01((p - a) / (b - a));
  };
  // — clip-window morph writes layout boxes intentionally: the window IS the geometry
  // — (no transform equivalent exists for a growing clip rect) — compositor-only N/A here.
  const paint = (p) => {
    const u = walk(stops, p);
    const w = rect.w + (W - rect.w) * u;
    const h = rect.h + (H - rect.h) * u;
    const cx = cx0 + (W / 2 - cx0) * u;
    const cy = cy0 + (H / 2 - cy0) * u;
    win.style.left = `${(cx - w / 2).toFixed(2)}px`;
    win.style.top = `${(cy - h / 2).toFixed(2)}px`;
    win.style.width = `${w.toFixed(2)}px`;
    win.style.height = `${h.toFixed(2)}px`;
    win.style.borderRadius = `${(rect.r * (1 - clamp01(u))).toFixed(2)}px`;
    const edge = Math.sin(Math.PI * clamp01(p));
    win.style.setProperty("--win-ring", (edge * 0.55).toFixed(3));
    win.style.setProperty("--win-sh", (edge * 0.28).toFixed(3));
    const rawC = open ? alpha("card", p) : 0;   // close holds the card at 0: the ghost
    // carries an identical card clone, so any real-card opacity doubles it (c_006 in audit)
    // — easeOutCubic for card so it rides the window's settle, not linear; translateY stays
    //    at 0 — the drawer never pushes down; it only fades in at its final seat —
    const ce = rawC >= 1 ? 1 : rawC <= 0 ? 0 : 1 - Math.pow(1 - rawC, 3);
    const bx = alpha("x", p);
    // — constant targets are compared, not re-written: an inline write dirties style even
    // — when the value is the same, and these two stay put for the whole flight —
    const lo = lf ? clamp01((p - lf[0]) / (lf[1] - lf[0])).toFixed(3) : "1";
    if (layer.style.opacity !== lo) layer.style.opacity = lo;
    scrim.style.opacity = alpha("scrim", p).toFixed(3);
    card.style.opacity = ce.toFixed(3);
    if (card.style.transform !== "none") card.style.transform = "none";
    if (header) header.style.opacity = bx.toFixed(3);   // header blur trails the avatar landing
    x.style.opacity = bx.toFixed(3);
    const pe = bx > 0.2 ? "" : "none";
    if (x.style.pointerEvents !== pe) x.style.pointerEvents = pe;
  };
  paint(0);
  if (instant) {
    paint(1);
    done();
    return () => {};
  }
  const t0 = performance.now();
  const ms = open ? OPEN_MS : CLOSE_MS;
  let raf = 0;
  const step = (now) => {
    const p = clamp01((now - t0) / (ms / getScale()));
    paint(p);
    if (p < 1) {
      raf = requestAnimationFrame(step);
      return;
    }
    win.style.removeProperty("--win-ring");
    win.style.removeProperty("--win-sh");
    done();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
