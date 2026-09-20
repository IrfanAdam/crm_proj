const PINS = [{ n: 1, x: 24, y: 24 }, { n: 2, x: 74, y: 30 }];
export function mapViewHTML() {
  const pins = PINS.map((p) => `<span class="opps__pin" style="left:${p.x}%;top:${p.y}%">${p.n}</span>`).join("");
  return `<div class="opps__map-view" id="nearby-view"><svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="nm-g" width="26" height="18" patternUnits="userSpaceOnUse"><path d="M26 0H0V18" style="fill:none;stroke:var(--primitive-sapphire-ui-100);stroke-width:1"/></pattern></defs><rect width="600" height="420" style="fill:var(--primitive-sapphire-ui-50)"/><rect width="600" height="420" style="fill:url(#nm-g)"/><path d="M-20 310L620 130" style="fill:none;stroke:var(--primitive-sapphire-ui-100);stroke-width:6"/><path d="M150 -20L430 440" style="fill:none;stroke:var(--primitive-sapphire-ui-100);stroke-width:5"/><path d="M-20 90L620 260" style="fill:none;stroke:var(--primitive-sapphire-ui-200);stroke-width:2"/><rect x="380" y="250" width="120" height="90" rx="14" style="fill:var(--primitive-green-100);opacity:.35"/></svg>${pins}</div><span class="opps__nearby"><span class="avatar"><img src="https://i.pravatar.cc/48?img=5" alt=""/></span><span class="avatar"><img src="https://i.pravatar.cc/48?img=44" alt=""/></span><span class="avatar"><img src="https://i.pravatar.cc/48?img=68" alt=""/></span>3 prospects nearby →</span><button class="opps__nav" id="nearby-reset" type="button" aria-label="Recenter map">➤</button>`;
}
export function initMap() {
  const box = document.getElementById("nearby-map"), view = document.getElementById("nearby-view");
  if (!box || !view) return;
  let x = 0, y = 0, z = 1, drag = null; const pills = new Map();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const paint = () => { view.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${z})`; };
  const clamp = () => { const r = box.getBoundingClientRect(), m = 0.75 * Math.min(r.width, r.height) * z; x = Math.max(-m, Math.min(m, x)); y = Math.max(-m, Math.min(m, y)); };
  box.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; box.setPointerCapture(e.pointerId); pills.set(e.pointerId, { x: e.clientX, y: e.clientY }); view.classList.add("opps__map-view--live"); });
  box.addEventListener("pointermove", (e) => {
    if (!pills.has(e.pointerId)) return; const p = pills.get(e.pointerId);
    if (pills.size === 1) { x += e.clientX - p.x; y += e.clientY - p.y; clamp(); paint(); }
    pills.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pills.size === 2) { const [a, b] = [...pills.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (box._pd) { z = Math.max(1, Math.min(2.75, z * (d / box._pd))); clamp(); paint(); } box._pd = d; }
  });
  const end = (e) => { pills.delete(e.pointerId); if (pills.size < 2) box._pd = 0; if (!pills.size) view.classList.remove("opps__map-view--live"); };
  box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
  box.addEventListener("wheel", (e) => { e.preventDefault(); const r = box.getBoundingClientRect(), nz = Math.max(1, Math.min(2.75, z * (e.deltaY < 0 ? 1.15 : 0.87))); const k = nz / z - 1; x -= (e.clientX - (r.left + r.width / 2)) * k; y -= (e.clientY - (r.top + r.height / 2)) * k; z = nz; clamp(); paint(); }, { passive: false });
  box.addEventListener("dblclick", () => { z = z > 1.5 ? 1 : 2; x = 0; y = 0; paint(); });
  document.getElementById("nearby-reset")?.addEventListener("click", () => { x = 0; y = 0; z = 1; if (reduce) view.classList.add("opps__map-view--live"); paint(); if (reduce) requestAnimationFrame(() => view.classList.remove("opps__map-view--live")); });
  paint();
}
