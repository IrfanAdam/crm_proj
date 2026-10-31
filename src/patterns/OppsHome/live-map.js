/* ADAM/PAGE — src/patterns/OppsHome/live-map.js · real tiles (Leaflet + Esri light grey) */
// Export map: HOME · ZOOM · HEADING · RING_MS · REHOME_GLIDE_S · REHOME_GLIDE_SLOW_S · createLiveMap
import { leaflet, pinIcon, meIcon } from "./leaflet-lazy.js";
import { HOME, ZOOM, BEARING, TILES, HOTSPOT_M, RING_MS, REHOME_GLIDE_S } from "./live-map-config.js";
import { breathe } from "./live-map-breath.js";
export { HOME, ZOOM, HEADING, RING_MS, REHOME_GLIDE_S, REHOME_GLIDE_SLOW_S } from "./live-map-config.js";
// — pin/me icons live in leaflet-lazy.js (they need the loaded Leaflet instance) —
// — blip = blue heading arrow (inline SVG, so no icon font is needed); CSS cancels the pane
// — bearing, so the arrow points screen-up = the heading (factory in leaflet-lazy.js) —
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
