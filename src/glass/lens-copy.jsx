/* ADAM/GLASS — src/glass/lens-copy.jsx · backdrop-world construction + placement for the lens engine */
// Exports: buildWorld (content layer + progressive edge mirror inside the lens) · placeWorld (geometry)
import { getZoom, toLayout } from "./rect-zoom.js";
import { buildBand, cloneFeed, placeBand } from "./band-mirror.js";

// — Section — Backdrop world —
// The dock sits ABOVE the OS edge material, so the pixels behind it are the feed
// (blurred by the band) — not the raw feed. The lens copy therefore paints the same
// stack the screen shows: the scrolling feed at its 1:1 offset, then a live mirror
// of the bottom band. What the lens refracts is then what is genuinely behind the glass.
export function buildWorld(lens, src) {
  lens.textContent = "";
  const world = document.createElement("div");
  world.className = "docklens__world";
  world.setAttribute("aria-hidden", "true");
  world.inert = true;
  world.appendChild(cloneFeed(src, "docklens__copy"));
  world.appendChild(buildBand(src));
  lens.appendChild(world);
  return world;
}

// — Section — World placement —
// Feed slides 1:1 with the scroll (layout px stay raw: outer zoom is not part of the
// translate). The band mirror re-places every frame so it never freezes mid-scroll.
export function placeWorld(lens, src) {
  const world = lens.querySelector(".docklens__world");
  if (!world || !src) return;
  const copy = world.querySelector(".docklens__copy");
  if (!copy) return;
  const c = src.getBoundingClientRect();
  const l = lens.getBoundingClientRect();
  const base = toLayout({ l: c.left - l.left, t: c.top - l.top, w: c.width }, getZoom());
  copy.style.left = `${base.l}px`;
  copy.style.top = `${base.t}px`;
  copy.style.width = `${base.w}px`;
  copy.style.transform = `translateY(${-src.scrollTop}px)`;
  placeBand(world.querySelector(".docklens__band"), lens, src);
}
