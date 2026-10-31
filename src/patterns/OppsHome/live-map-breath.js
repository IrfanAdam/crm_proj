/* ADAM/PAGE — src/patterns/OppsHome/live-map-breath.js · coverage-radius breath */
// Export map: breathe
import { HOTSPOT_M, PULSE_MS, K_MIN, T0 } from "./live-map-config.js";
import { getScale } from "../../logic/time-scale.js";
// — the coverage radius breathes: opacity rides the radius while the CSS keeps the colour —
// — setRadius/setStyle are Leaflet internals, not DOM layout writes; skipped under reduced motion —
let breathAcc = 0;
let breathLast = T0;
export function breathe(circle, host) {
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
