/* ADAM/GLASS — src/glass/lens-copy.jsx · backdrop-world construction + placement for the lens engine */
// Exports: buildWorld (content layer + progressive edge mirror inside the lens) · placeWorld (geometry)
import { getZoom, toLayout } from "./rect-zoom.js";
import { BOT, stopsHTML } from "../device/edge-stops.js";

// — Section — Backdrop world —
// The dock sits ABOVE the OS edge material, so the pixels behind it are the feed
// (blurred by the band) — not the raw feed. The lens copy therefore paints the same
// stack the screen shows: the scrolling feed at its 1:1 offset, then a fixed mirror
// of the bottom band (one blurred feed clone per stop, same full-width mask as the
// real band). What the lens refracts is then what is genuinely behind the glass.
export function buildWorld(lens, src) {
  lens.textContent = "";
  const world = document.createElement("div");
  world.className = "docklens__world";
  world.setAttribute("aria-hidden", "true");
  world.inert = true;
  world.appendChild(cloneFeed(src, "docklens__copy"));
  const band = document.createElement("div");
  band.className = "docklens__band";
  band.innerHTML = `<i class="docklens__band-fill" aria-hidden="true"></i>${stopsHTML(BOT)}`;
  band.querySelectorAll("span").forEach((s) => s.appendChild(cloneFeed(src, "docklens__band-copy")));
  world.appendChild(band);
  lens.appendChild(world);
  return world;
}

// — Section — Feed clone —
// Ids stripped so the clone never answers a source query (geometry reads must use
// #app-content scope); hidden from AT and inert — it is refraction material.
function cloneFeed(src, cls) {
  const node = src.cloneNode(true);
  node.classList.add(cls);
  node.removeAttribute("id");
  node.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  node.setAttribute("aria-hidden", "true");
  node.inert = true;
  return node;
}

// — Section — World placement —
// Feed slides 1:1 with the scroll (layout px stay raw: outer zoom is not part of the
// translate). The band is anchored to the lens box and shifted by the real band's
// fill position measured against the screen, so the mirror covers the same pixels
// no matter how the frame lays out. Base offsets are measured on layout changes only.
export function placeWorld(lens, src) {
  const world = lens.querySelector(".docklens__world");
  if (!world || !src) return;
  const copy = world.querySelector(".docklens__copy");
  if (!copy) return;
  const c = src.getBoundingClientRect(), l = lens.getBoundingClientRect();
  const base = toLayout({ l: c.left - l.left, t: c.top - l.top, w: c.width }, getZoom());
  copy.style.left = `${base.l}px`;
  copy.style.top = `${base.t}px`;
  copy.style.width = `${base.w}px`;
  copy.style.transform = `translateY(${-src.scrollTop}px)`;
  const band = world.querySelector(".docklens__band");
  const real = document.querySelector(".device__edge:not(.device__edge--top)");
  if (band && real) {
    const q = getZoom();
    const r = real.getBoundingClientRect();
    band.style.left = `${(r.left - l.left) / q}px`;
    band.style.top = `${(r.top - l.top) / q}px`;
    band.style.width = `${r.width / q}px`;
    band.style.height = `${r.height / q}px`;
  }
}
