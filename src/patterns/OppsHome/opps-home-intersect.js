/* ADAM/PATTERN — src/patterns/OppsHome/opps-home-intersect.js · map-pulse parking
   Marker pulse is the app's only infinite animation. It lives in the map card; once the
   feed scrolls that card off-screen the ring is invisible, so park the animation instead
   of ticking it forever. No visual change: an invisible animation has no sampled frame. */
// Exports: observeMapPulse(root) — flags `opps--map-off` on the pattern root.
let io = null;
export function observeMapPulse(root) {
  io?.disconnect();
  const map = root?.querySelector(".opps__map");
  if (!map || !("IntersectionObserver" in window)) return;
  io = new IntersectionObserver(([e]) => root.classList.toggle("opps--map-off", !e.isIntersecting), { threshold: 0 });
  io.observe(map);
}
