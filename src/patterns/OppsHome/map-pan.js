/* ADAM/PAGE — src/patterns/OppsHome/map-pan.js · shared pan + zoom */
// Export map: wirePan
// — Pan + zoom —
export function wirePan(box, view, home) {
  let x = home.x;
  let y = home.y;
  let z = home.z;
  const active = new Map();
  const paint = () => {
    view.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${z})`;
  };
  const clamp = () => {
    const r = box.getBoundingClientRect();
    const m = 0.75 * Math.min(r.width, r.height) * z;
    x = Math.max(-m, Math.min(m, x));
    y = Math.max(-m, Math.min(m, y));
  };
  const end = (e) => {
    active.delete(e.pointerId);
    if (active.size < 2) box._pd = 0;
    if (!active.size) view.classList.remove("opps__map-view--live");
  };
  box.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    box.setPointerCapture(e.pointerId);
    active.set(e.pointerId, { x: e.clientX, y: e.clientY });
    view.classList.add("opps__map-view--live");
  });
  box.addEventListener("pointermove", (e) => {
    if (!active.has(e.pointerId)) return;
    const p = active.get(e.pointerId);
    if (active.size === 1) {
      x += e.clientX - p.x;
      y += e.clientY - p.y;
      clamp();
      paint();
    }
    active.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (active.size === 2) {
      const pts = [...active.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (box._pd) z = Math.max(home.min, Math.min(home.max, z * (d / box._pd)));
      box._pd = d;
      clamp();
      paint();
    }
  });
  ["pointerup", "pointercancel"].forEach((t) => box.addEventListener(t, end));
  box.addEventListener("wheel", (e) => {
    e.preventDefault();
    const k = e.deltaY < 0 ? 1.15 : 0.87;
    z = Math.max(home.min, Math.min(home.max, z * k));
    clamp();
    paint();
  }, { passive: false });
  paint();
  return {
    reset() { x = home.x; y = home.y; z = home.z; paint(); },
    get() { return { x, y, z }; },
    set(s) { x = s.x || 0; y = s.y || 0; z = Math.max(home.min, Math.min(home.max, s.z || home.z)); clamp(); paint(); },
  };
}
