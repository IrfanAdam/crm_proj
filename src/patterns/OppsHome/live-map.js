/* ADAM/PAGE — src/patterns/OppsHome/live-map.js · real tiles (Leaflet + Esri light grey) */
// Export map: HOME · ZOOM · HEADING · RING_MS · REHOME_GLIDE_S · REHOME_GLIDE_SLOW_S · createLiveMap
import { leaflet, pinIcon, meIcon } from "./leaflet-lazy.js";
import { getScale } from "../../logic/time-scale.js";
// Mumbai home — zoomed out to city level (was street-level dummy grid)
export const HOME = [19.0759, 72.8777];
export const ZOOM = 12;
// mock compass heading (phone-sensor stand-in). The map is oriented HEADING-UP, so this
// direction — not map north — is what points to the top of the frame, and the blip arrow
// (which reads screen-up) is the user's north.
export const HEADING = 215;
const BEARING = 360 - HEADING;   // map rotation that puts HEADING at screen-up
const TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const HOTSPOT_M = 2000;   // coverage radius drawn around HOME
const PULSE_MS = 2600;    // radius breath cycle
const K_MIN = 0.74;       // the breath contracts to this share of the radius
const T0 = performance.now();   // one clock for every map's breath + ring, so the widget and
export const RING_MS = 1800;    // the sheet are in phase when the morph hands over
// — home-glide length (s): pan + zoom on one monotonic ease-out-expo — fast
// launch, long soft tail, no overshoot reversal (the reversal read as judder) —
export const REHOME_GLIDE_S = 0.9;
// — minimise glides slower: the morph-back covers the first half, so the tail is
// still playing when the widget is revealed — the settle stays visible —
export const REHOME_GLIDE_SLOW_S = 1.4;
// — pin/me icons live in leaflet-lazy.js (they need the loaded Leaflet instance) —
// — blip = blue heading arrow (inline SVG, so no icon font is needed); CSS cancels the pane
// — bearing, so the arrow points screen-up = the heading (factory in leaflet-lazy.js) —
// — the coverage radius breathes: opacity rides the radius while the CSS keeps the colour —
// — setRadius/setStyle are Leaflet internals, not DOM layout writes; skipped under reduced motion —
let breathAcc = 0;
let breathLast = T0;
function breathe(circle, host) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const step = (now) => {
    // — two maps share one clock: only the first step per frame advances it —
    if (now !== breathLast) {
      breathAcc += Math.max(0, now - breathLast) * getScale();
      breathLast = now;
    }
    const k = K_MIN + (1 - K_MIN) * (0.5 - 0.5 * Math.cos((breathAcc / PULSE_MS) * Math.PI * 2));
    if (host.isConnected && !host.closest("[hidden]")) {
      const m = 0.35 + 0.65 * ((k - K_MIN) / (1 - K_MIN));
      circle.setRadius(HOTSPOT_M * k);
      circle.setStyle({ fillOpacity: m, opacity: m });
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
export async function createLiveMap(el, pins, opts = {}) {
  const L = await leaflet();
  const map = L.map(el, {
    center: opts.center || HOME,
    zoom: opts.zoom ?? ZOOM,
    rotate: true,
    bearing: BEARING,
    rotateControl: false,
    shiftKeyRotate: false,
    attributionControl: false,   // no licence strip in the prototype chrome
    zoomControl: false,
    boxZoom: false,
    keyboard: true,
    zoomSnap: opts.zoomSnap ?? 1,   // the widget runs free (0) so the home glide
    zoomDelta: opts.zoomDelta ?? 1, // can ease zoom instead of cutting it
    dragging: opts.dragging ?? true,
    touchZoom: opts.touchZoom ?? true,
    doubleClickZoom: opts.doubleClickZoom ?? true,
    scrollWheelZoom: opts.scrollWheelZoom ?? true,
  });
  // the rotation pivot is the container centre, so re-apply on resize — a map built while
  // hidden (0×0, e.g. the sheet) would otherwise stay rotated about its corner
  const applyBearing = () => map.setBearing(BEARING);
  applyBearing();
  new ResizeObserver(applyBearing).observe(el);
  // the blip's ring rides the wall clock (negative delay = its phase, not its start time),
  // so the widget's ring and the sheet's are at the same point of the cycle when they swap
  el.style.setProperty("--me-delay", `-${Math.round(performance.now() % RING_MS)}ms`);
  L.tileLayer(TILES, { maxZoom: 19 }).addTo(map);
  const hot = L.circle(HOME, { radius: HOTSPOT_M, className: "opps__hotspot", fill: true, weight: 1, interactive: false }).addTo(map);
  breathe(hot, el);
  // my position rides above every pin (zIndexOffset) — it must never hide behind a marker
  L.marker(HOME, { icon: meIcon(), zIndexOffset: 1000, interactive: false, keyboard: false }).addTo(map);
  (pins || []).forEach((p) => L.marker(p.ll, { icon: pinIcon(p.n), interactive: false, keyboard: false }).addTo(map));
  return {
    map,
    get() { const c = map.getCenter(); return { center: [c.lat, c.lng], zoom: map.getZoom() }; },
    set(s) { if (s && s.center) map.setView(s.center, s.zoom ?? map.getZoom(), { animate: false }); },
    // — full home glide: pan AND zoom ease together on one monotonic expo —
    // per-frame discrete setViews (never Leaflet's internal zoom animation, which
    // unglues pins under rotation), so everything stays glued the whole way home.
    // _gliding tells the idle timer to ignore the flight's own moveends —
    glideHome(durS = REHOME_GLIDE_S) {
      this.cancelGlide();
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) { map.setView(HOME, ZOOM, { animate: false }); return; }
      const c = map.getCenter(), z0 = map.getZoom();
      const dLat = HOME[0] - c.lat, dLng = HOME[1] - c.lng, dZ = ZOOM - z0;
      if (!dLat && !dLng && !dZ) return;
      const t0 = performance.now(), dur = durS * 1000;
      const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
      let raf = 0;
      map._gliding = true;
      map._glideCancel = () => { cancelAnimationFrame(raf); map._gliding = null; map._glideCancel = null; };
      const frame = (now) => {
        const t = Math.min(1, (now - t0) / dur), k = easeOutExpo(t);
        map.setView([c.lat + dLat * k, c.lng + dLng * k], z0 + dZ * k, { animate: false });
        if (t < 1) raf = requestAnimationFrame(frame);
        else { map._gliding = null; map._glideCancel = null; }
      };
      raf = requestAnimationFrame(frame);
    },
    cancelGlide() { if (map._glideCancel) map._glideCancel(); },
  };
}
