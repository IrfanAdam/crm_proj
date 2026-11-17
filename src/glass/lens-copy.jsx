/* ADAM/GLASS — src/glass/lens-copy.jsx · backdrop-world construction + placement for the lens engine */
// Exports: buildWorld (content layer + progressive edge mirror inside the lens) · placeWorld (geometry)
import { dockRects } from "./rect-zoom.js";
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
// translate). Base offsets come from the measure cache: this runs on every scroll
// frame against a tree the dock has already mirrored ~15 times, so a rect read here
// forces layout for all of it. Only the scroll offset is read per frame, once, and
// the record is shared with the band mirror.
export function placeWorld(lens, src) {
  const world = lens && lens.querySelector(".docklens__world");
  if (!world || !src) return;
  const copy = world.querySelector(".docklens__copy");
  if (!copy) return;
  const g = dockRects(lens, src);
  if (!g) return;
  const y = -src.scrollTop;
  copy.style.left = `${g.base.l}px`;
  copy.style.top = `${g.base.t}px`;
  copy.style.width = `${g.base.w}px`;
  copy.style.transform = `translateY(${y}px)`;
  placeBand(world.querySelector(".docklens__band"), lens, src, g, y);
}
