/* ADAM/PAGE — src/patterns/OppsHome/nearby-map.js · inline minimap (live tiles) */
// Export map: PINS · PROSPECTS · relRect · mapViewHTML · initMap
import { createLiveMap } from "./live-map.js";
// — Data (shared with the sheet; pins are real Mumbai spots near BKC) —
export const PINS = [
  { n: 1, ll: [19.0596, 72.8656] },
  { n: 2, ll: [19.0728, 72.8826] },
  { n: 3, ll: [19.0176, 72.8562] },
];
export const PROSPECTS = [
  { name: "PayLeap", meta: "Fintech · Series B", dist: "0.8km away", img: "12" },
  { name: "Nimai Hospitals", meta: "Healthcare · Renewal", dist: "5.3km away", img: "32" },
  { name: "KiranaOne", meta: "Retail · 12 stores", dist: "11km away", img: "59" },
];
// — Facepile (DS avatar-stack): faces overlap; the last bubble carries the overflow count —
const MAX_FACES = 2;
const faceHTML = (p) => `<span class="avatar avatar--sm"><img src="https://i.pravatar.cc/48?img=${p.img}" alt=""/></span>`;
const moreHTML = (n) => `<span class="avatar avatar--sm avatar--count" aria-hidden="true">+${n}</span>`;
const avatarsHTML = () => {
  const shown = PROSPECTS.slice(0, MAX_FACES);
  const rest = PROSPECTS.length - shown.length;
  return `<span class="avatar-stack">${shown.map(faceHTML).join("")}${rest > 0 ? moreHTML(rest) : ""}</span>`;
};
// — View —
export function mapViewHTML() {
  return `<div class="opps__map-view" id="nearby-view"><div class="opps__tiles" id="nearby-tiles"></div></div>`
    + `<button class="opps__nearby" id="nearby-open" type="button" aria-haspopup="dialog" aria-label="${PROSPECTS.length} prospects nearby">${avatarsHTML()}prospects nearby →</button>`;
}
// — Wiring (tap the tiles opens the sheet; home stays a quiet preview: no drag) —
// — async: Leaflet loads on first map mount (see leaflet-lazy.js), so callers chain —
export async function initMap(onTap) {
  const box = document.getElementById("nearby-map");
  const tiles = document.getElementById("nearby-tiles");
  if (!box || !tiles) return null;
  const api = await createLiveMap(tiles, PINS, { dragging: false, touchZoom: false, doubleClickZoom: false, scrollWheelZoom: true });
  if (onTap) api.map.on("click", onTap);
  // — pressed state: the whole widget dents uniformly while held; the morph snaps it off
  // pre-measure (see fromState) so the window never starts smaller than the widget —
  const release = () => box.removeAttribute("data-pressed");
  box.addEventListener("pointerdown", () => box.setAttribute("data-pressed", "true"));
  box.addEventListener("pointerup", release);
  box.addEventListener("pointercancel", release);
  box.addEventListener("pointerleave", release);
  return api;
}
// — rect of el in screen-local layout px (scroll + canvas-zoom safe) —
export function relRect(el, screen) {
  const r = el.getBoundingClientRect();
  const s = screen.getBoundingClientRect();
  const k = screen.clientWidth / s.width;
  return { l: (r.left - s.left) * k, t: (r.top - s.top) * k, w: el.offsetWidth, h: el.offsetHeight };
}
