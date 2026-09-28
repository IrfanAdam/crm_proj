/* ADAM/GLASS — src/glass/band-mirror.js · live progressive-blur mirror shared by both dock engines */
// Exports: cloneFeed (inert feed clone) · buildBand (stop-ladder mirror) · placeBand (box + copy geometry + scroll)
import { getZoom, toLayout } from "./rect-zoom.js";
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
// Runs on every scroll frame — this is what keeps the mirror live instead of frozen.
export function placeBand(band, lens, src) {
  if (!band || !lens || !src) return;
  const copies = band.querySelectorAll(".docklens__band-copy");
  if (!copies.length) return;
  const c = src.getBoundingClientRect();
  const l = lens.getBoundingClientRect();
  const q = getZoom();
  const base = toLayout({ l: c.left - l.left, t: c.top - l.top, w: c.width }, q);
  const real = document.querySelector(".device__edge:not(.device__edge--top)");
  if (real) {
    const r = real.getBoundingClientRect();
    const bl = (r.left - l.left) / q;
    const bt = (r.top - l.top) / q;
    band.style.left = `${bl}px`;
    band.style.top = `${bt}px`;
    band.style.width = `${r.width / q}px`;
    band.style.height = `${r.height / q}px`;
    copies.forEach((copy) => {
      copy.style.left = `${base.l - bl}px`;
      copy.style.top = `${base.t - bt}px`;
      copy.style.width = `${base.w}px`;
    });
  }
  const y = -src.scrollTop;
  copies.forEach((copy) => {
    copy.style.transform = `translateY(${y}px)`;
  });
}
