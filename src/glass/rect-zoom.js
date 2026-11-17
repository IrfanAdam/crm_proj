/* ADAM/GLASS — src/glass/rect-zoom.js · zoom-corrected geometry + the dock measure cache */
// Exports: getZoom (effective visual scale) · toLayout (visual delta to layout px) ·
//          dockRects (one cached record per lens) · dropDockRects (force a re-measure)

// — Section — Effective visual scale —
// The device is transform:scale(var(--zoom)) inside the canvas scaler, so
// getBoundingClientRect() returns scaled (screen) px while DOM copy geometry
// lives in unscaled local px. In app-fullscreen the frame transform is gone
// (transform:none) while --zoom is still set — using it there offsets the copy.
export function getZoom() {
  const d = document.getElementById("device");
  if (!d || getComputedStyle(d).transform === "none") return 1;
  const s = document.getElementById("canvas-scaler");
  const v = s ? parseFloat(getComputedStyle(s).getPropertyValue("--zoom")) : 1;
  return Number.isFinite(v) && v > 0 ? v : 1;
}

// — Section — Visual delta to layout px —
// Divide a visual rect delta by the zoom. Only rect-derived bases are divided —
// the scroll slide stays raw translateY (layout px, unaffected by outer scale).
export function toLayout(rect, zoom) {
  return { l: rect.l / zoom, t: rect.t / zoom, w: rect.w / zoom };
}

// — Section — Dock measure cache —
// Every box the dock path measures is pinned to the same device screen, and the
// record holds DELTAS between two of them — so a scroll cannot change it (it moves
// content inside the boxes, not the boxes) and neither can the page moving under
// the device. Measured on the live tree: #app-content / .docklens__lens / .device__edge
// rects are byte-identical at scrollTop 0, 320 and 770. So measure on invalidation
// only; the scroll path reads the record and the scroll offset, nothing else.
const rects = new WeakMap();
const watched = new Set();
let epoch = 0;
let wired = false;
let ro = null;
let last = null;      // the pair in use — refreshed on the next frame after a bump
let pending = 0;

// An invalidation while nothing is scrolling must NOT be served by the next scroll
// frame: that turns "one rect pass per invalidation" into a rect pass inside a gesture.
// Refresh on the next frame instead — idle frames are cheap, and a mid-gesture bump
// would have paid exactly one measure in the next frame either way.
export function dropDockRects() {
  epoch++;
  if (!last || pending || typeof requestAnimationFrame !== "function") return;
  pending = requestAnimationFrame(() => { pending = 0; dockRects(last[0], last[1]); });
}

function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  const bump = dropDockRects;
  window.addEventListener("resize", bump, { passive: true });
  window.addEventListener("orientationchange", bump, { passive: true });
  window.addEventListener("app-tab", bump);
  window.addEventListener("transitionend", (e) => e.target.id === "device" && bump());
  document.fonts?.addEventListener("loadingdone", bump);
  document.fonts?.ready?.then(bump);
  const zoomCtl = document.getElementById("ws-proto-stack");
  zoomCtl?.addEventListener("input", bump);
  zoomCtl?.addEventListener("click", bump);
  // body class flips retune the frame itself (app-fullscreen drops the canvas transform).
  // #device's device--large / device--scrolled only fade the TOP edge's opacity, so no box
  // measured here moves: watching them would buy a forced layout per scroll gesture, as
  // would any scroll-settle debounce (it lands mid-gesture). Sizes are the RO's job below.
  new MutationObserver(bump).observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

// Size is the one thing a delta cannot survive, so watch the three source boxes.
// (Set-guarded: a fresh observe() fires immediately and would invalidate every frame.)
function watchBox(el) {
  if (!el || watched.has(el) || typeof ResizeObserver === "undefined") return;
  watched.add(el);
  ro ||= new ResizeObserver(dropDockRects);
  ro.observe(el);
}

export function dockRects(lens, src) {
  if (!lens || !src) return null;
  wire();
  last = [lens, src];
  const hit = rects.get(lens);
  if (hit && hit.epoch === epoch && hit.src === src) return hit;
  const q = getZoom();
  const c = src.getBoundingClientRect();
  const l = lens.getBoundingClientRect();
  const edge = document.querySelector(".device__edge:not(.device__edge--top)");
  const b = edge && edge.getBoundingClientRect();
  const rec = {
    epoch, src, zoom: q,
    base: toLayout({ l: c.left - l.left, t: c.top - l.top, w: c.width }, q),
    band: b && { l: (b.left - l.left) / q, t: (b.top - l.top) / q, w: b.width / q, h: b.height / q },
  };
  rects.set(lens, rec);
  watchBox(lens); watchBox(src); watchBox(edge);
  return rec;
}
