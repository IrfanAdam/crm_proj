/* ADAM/PAGE — src/patterns/OppsHome/live-map-breath.js · coverage-radius breath */
// Export map: breathe
import { HOTSPOT_M, PULSE_MS, K_MIN, T0 } from "./live-map-config.js";
import { getScale } from "../../logic/time-scale.js";
// — the coverage radius breathes: opacity rides the radius while the CSS keeps the colour —
// — setRadius/setStyle are Leaflet internals, not DOM layout writes; skipped under reduced motion —
// — two maps share one clock: only the first step per frame advances it —
let breathAcc = 0;
let breathLast = T0;
/* — A loop only runs while its circle can be seen: an IntersectionObserver parks it when the
   map scrolls out of the feed, `hidden` parks the sheet's copy, and a hidden document parks
   both. Restarting re-anchors the clock, so the phase continues where it froze — the parked
   time is not animation time. Nothing changes while the circle is on screen. — */
const loops = new Set();
const alive = (host) => host.isConnected && !document.hidden && !host.closest("[hidden]");
/* — an open dialog (map sheet, reward sheet, pitch overlay) is the active surface: a map it
   covers keeps its phase but stops drawing. Only queried on a state change, never per frame. — */
const covered = (host) => {
  for (const d of document.querySelectorAll('[role="dialog"]')) {
    if (!d.contains(host) && !d.closest("[hidden]")) return true;
  }
  return false;
};
const pump = () => loops.forEach((l) => l.sync());
addEventListener("visibilitychange", pump, { passive: true });
let hiddenWatch = 0;
function watchHidden() {
  if (hiddenWatch) return;
  hiddenWatch = new MutationObserver(pump);
  hiddenWatch.observe(document.body, { attributes: true, attributeFilter: ["hidden"], subtree: true });
}
export function breathe(circle, host) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let raf = 0;
  let onScreen = false;
  let parked = false;   // a resume must not add the parked gap to the phase
  const step = (now) => {
    raf = 0;
    if (!onScreen || !alive(host)) { parked = true; return; }   // nothing scheduled: fully parked
    if (now !== breathLast) {
      if (parked) parked = false;   // resume: re-anchor, keep the frozen phase
      else breathAcc += Math.max(0, now - breathLast) * getScale();
      breathLast = now;
    }
    const k = K_MIN + (1 - K_MIN) * (0.5 - 0.5 * Math.cos((breathAcc / PULSE_MS) * Math.PI * 2));
    const m = 0.35 + 0.65 * ((k - K_MIN) / (1 - K_MIN));
    circle.setRadius(HOTSPOT_M * k);
    circle.setStyle({ fillOpacity: m, opacity: m });
    raf = requestAnimationFrame(step);
  };
  const self = {
    sync() {
      if (!host.isConnected) { io.disconnect(); loops.delete(self); return; }
      const want = onScreen && alive(host) && !covered(host);
      if (want && !raf) raf = requestAnimationFrame(step);
      else if (!want && raf) { cancelAnimationFrame(raf); raf = 0; parked = true; }
    },
  };
  const io = new IntersectionObserver((es) => {
    onScreen = es[es.length - 1].isIntersecting;
    self.sync();
  });
  io.observe(host);
  loops.add(self);
  watchHidden();
}
