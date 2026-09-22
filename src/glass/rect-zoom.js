/* ADAM/GLASS — src/glass/rect-zoom.js · zoom-corrected geometry for canvas-scaled content */
// Exports: getZoom (effective visual scale) · toLayout (visual delta to layout px)

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
