/* ADAM/GLASS — src/glass/band-mirror.js · live progressive-blur mirror shared by both dock engines */
// Exports: cloneFeed (inert feed clone) · buildBand (stop-ladder mirror) · placeBand (box + copy geometry + scroll)
import { dockRects } from "./rect-zoom.js";
import { BOT, stopsHTML } from "../device/edge-stops.js";

// — Section — Feed clone —
// Ids stripped so the clone never answers a source query (geometry reads must use
// #app-content scope); hidden from AT and inert — it is refraction material.
export function cloneFeed(src, cls) {
  const node = src.cloneNode(true);
  node.classList.add(cls);
  node.removeAttribute("id");
  node.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  node.setAttribute("aria-hidden", "true");
  node.inert = true;
  return node;
}

// — Section — Mirror construction —
// One blurred feed clone per stop of the real band's ladder, each masked by its own
// --a/--z. Stops paint weakest-first so the strongest zone wins where they overlap.
export function buildBand(src) {
  const band = document.createElement("div");
  band.className = "docklens__band";
  band.setAttribute("aria-hidden", "true");
  band.innerHTML = `<i class="docklens__band-fill" aria-hidden="true"></i>${stopsHTML(BOT)}`;
  band.querySelectorAll("span").forEach((s) => s.appendChild(cloneFeed(src, "docklens__band-copy")));
  return band;
}

// — Section — Mirror placement —
// The band box tracks the real .device__edge rect; each copy shows the feed pixels the
// real band sees (base offset relative to the band box) and slides 1:1 with scroll.
// This runs on every scroll frame, so it takes the shared measure record (`g`) and the
// frame's scroll slide (`y`) when the caller has them — one measure and one scroll read
// serve all ~15 copies instead of a rect per copy. Falls back to measuring on its own.
export function placeBand(band, lens, src, g, y) {
  if (!band || !lens || !src) return;
  const copies = band.querySelectorAll(".docklens__band-copy");
  if (!copies.length) return;
  const m = g || dockRects(lens, src);
  if (!m) return;
  const b = m.band;
  if (b) {
    band.style.left = `${b.l}px`;
    band.style.top = `${b.t}px`;
    band.style.width = `${b.w}px`;
    band.style.height = `${b.h}px`;
  }
  const slide = y === undefined ? -src.scrollTop : y;
  copies.forEach((copy) => {
    if (b) {
      copy.style.left = `${m.base.l - b.l}px`;
      copy.style.top = `${m.base.t - b.t}px`;
      copy.style.width = `${m.base.w}px`;
    }
    copy.style.transform = `translateY(${slide}px)`;
  });
}
