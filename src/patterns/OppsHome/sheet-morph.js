/* ADAM/PAGE — src/patterns/OppsHome/sheet-morph.js · widget ↔ full-screen map morph */
// Export map: MARGIN · fitLayer · morph
/* The tiles never scale. A clipping window grows from the widget's rect to the screen while
   the tile layer keeps its own size and stays centred on HOME, so the morph starts on the
   widget's own map and lands back on it — no squashed copy, no matched-scale maths. */
import { CLOSE, FADE, OPEN, clamp01, walk } from "./morph-timing.js";
export const MARGIN = 18;   // tile-layer bleed past the screen — covers the settle overshoot
export const OPEN_MS = 460;
export const CLOSE_MS = 320;
// — the layer is wider than the screen on all sides, so an overshoot never shows bare background —
export function fitLayer(screen, layer) {
  layer.style.width = `${screen.clientWidth + MARGIN * 2}px`;
  layer.style.height = `${screen.clientHeight + MARGIN * 2}px`;
}
// — drive one morph; `rect` is the widget's inner box in screen px, `dir` +1 open / −1 close —
export function morph(parts, rect, dir, done, instant) {
  const { screen, win, layer, scrim, card, x } = parts;
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
    const c = alpha("card", p);
    const bx = alpha("x", p);
    layer.style.opacity = lf ? clamp01((p - lf[0]) / (lf[1] - lf[0])).toFixed(3) : "1";
    scrim.style.opacity = alpha("scrim", p).toFixed(3);
    card.style.opacity = c.toFixed(3);
    card.style.transform = `translateY(${((1 - c) * 24).toFixed(2)}px)`;
    x.style.opacity = bx.toFixed(3);
    x.style.pointerEvents = bx > 0.2 ? "" : "none";
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
    const p = clamp01((now - t0) / ms);
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
