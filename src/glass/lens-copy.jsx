/* ADAM/GLASS — src/glass/lens-copy.jsx · live-copy construction + placement for the lens engine */
// Exports: buildCopy (clone source into copy) · placeCopy (zoom-corrected geometry + slide)
import { getZoom, toLayout } from "./rect-zoom.js";

// — Section — Copy construction —
// Clone the source feed into the parked copy. Ids are stripped so the clone
// never answers a source query (geometry reads must use #app-content scope);
// hidden from AT and inert — it is refraction material, not content.
export function buildCopy(copy, src) {
  copy.textContent = "";
  const node = src.cloneNode(true);
  node.removeAttribute("id");
  node.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  node.setAttribute("aria-hidden", "true");
  node.inert = true;
  copy.appendChild(node);
}

// — Section — Copy placement —
// Zoom-corrected base geometry (visual rects divided by zoom) plus the 1:1
// scroll slide. Base offsets are measured on layout changes only — never per
// frame in the scroll path (a rect read per frame would force a layout).
export function placeCopy(copy, lens, src) {
  if (!copy || !lens || !src) return;
  const c = src.getBoundingClientRect(), l = lens.getBoundingClientRect();
  const base = toLayout({ l: c.left - l.left, t: c.top - l.top, w: c.width }, getZoom());
  copy.style.left = `${base.l}px`;
  copy.style.top = `${base.t}px`;
  copy.style.width = `${base.w}px`;
  copy.style.transform = `translateY(${-src.scrollTop}px)`;
}
