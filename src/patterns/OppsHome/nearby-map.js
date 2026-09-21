/* ADAM/PAGE — src/patterns/OppsHome/nearby-map.js · inline minimap */
// Export map: PINS · PROSPECTS · gridSVG · pinsHTML · relRect · flyAvatars · flyPill · mapViewHTML · initMap
import { wirePan } from "./map-pan.js";
// — Data (shared with the sheet) —
export const PINS = [
  { n: 1, x: 30, y: 30 },
  { n: 2, x: 68, y: 26 },
  { n: 3, x: 52, y: 62 },
];
export const PROSPECTS = [
  { name: "PayLeap", meta: "Fintech · Series B", dist: "0.8km away", img: "12" },
  { name: "Nimai Hospitals", meta: "Healthcare · Renewal", dist: "5.3km away", img: "32" },
  { name: "KiranaOne", meta: "Retail · 12 stores", dist: "11km away", img: "59" },
];
export const gridSVG = (gid) => `<svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">`
  + `<defs><pattern id="${gid}" width="26" height="18" patternUnits="userSpaceOnUse">`
  + `<path d="M26 0H0V18" style="fill:none;stroke:var(--primitive-sapphire-ui-100);stroke-width:1"/></pattern></defs>`
  + `<rect width="600" height="420" style="fill:var(--primitive-sapphire-ui-50)"/>`
  + `<rect width="600" height="420" style="fill:url(#${gid})"/>`
  + `<path d="M-20 310L620 130" style="fill:none;stroke:var(--primitive-sapphire-ui-100);stroke-width:6"/>`
  + `<path d="M150 -20L430 440" style="fill:none;stroke:var(--primitive-sapphire-ui-100);stroke-width:5"/>`
  + `<path d="M-20 90L620 260" style="fill:none;stroke:var(--primitive-sapphire-ui-200);stroke-width:2"/>`
  + `<rect x="380" y="250" width="120" height="90" rx="14" style="fill:var(--primitive-green-100);opacity:.35"/></svg>`;
export const pinsHTML = () => PINS.map((p) => `<span class="opps__pin" style="left:${p.x}%;top:${p.y}%">${p.n}</span>`).join("");
const avatarsHTML = () => PROSPECTS.map((p) => `<span class="avatar"><img src="https://i.pravatar.cc/48?img=${p.img}" alt=""/></span>`).join("");
// — View —
export function mapViewHTML() {
  return `<div class="opps__map-view" id="nearby-view">${gridSVG("nm-g")}${pinsHTML()}</div>`
    + `<button class="opps__nearby" id="nearby-open" type="button" aria-haspopup="dialog">${avatarsHTML()}3 prospects nearby →</button>`
    + `<button class="opps__nav" id="nearby-reset" type="button" aria-label="Recenter map">➤</button>`;
}
// — Wiring (tap anywhere on the map opens the sheet; drag still pans) —
export function initMap(onTap) {
  const box = document.getElementById("nearby-map");
  const view = document.getElementById("nearby-view");
  if (!box || !view) return null;
  const api = wirePan(box, view, { x: 0, y: 0, z: 0.8, min: 0.6, max: 2.75 });
  document.getElementById("nearby-reset")?.addEventListener("click", () => api.reset());
  let sx = 0;
  let sy = 0;
  let st = 0;
  let down = false;
  box.addEventListener("pointerdown", (e) => { down = true; sx = e.clientX; sy = e.clientY; st = performance.now(); });
  box.addEventListener("pointercancel", () => { down = false; });
  box.addEventListener("pointerup", (e) => {
    if (!down) return;
    down = false;
    const moved = Math.hypot(e.clientX - sx, e.clientY - sy);
    if (moved < 8 && performance.now() - st < 450 && !e.target.closest("button") && onTap) onTap();
  });
  return api;
}
// — rect of el in screen-local layout px (scroll + canvas-zoom safe) —
export function relRect(el, screen) {
  const r = el.getBoundingClientRect();
  const s = screen.getBoundingClientRect();
  const k = screen.clientWidth / s.width;
  return { l: (r.left - s.left) * k, t: (r.top - s.top) * k, w: el.offsetWidth, h: el.offsetHeight };
}
// — avatar continuity: pill avatars fly into the sheet blobs —
export function flyAvatars(screen, sheet) {
  const imgs = [...document.querySelectorAll("#nearby-open .avatar img")];
  const blobs = [...sheet.querySelectorAll(".map-sheet__blob")];
  imgs.forEach((im, i) => {
    const b = blobs[i];
    if (!b) return;
    const a = relRect(im, screen);
    const c = relRect(b, screen);
    b.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1)" }], { duration: 240, delay: 240 + i * 90, fill: "backwards" });
    const cl = document.createElement("img");
    cl.src = im.src;
    cl.alt = "";
    cl.className = "map-sheet__flight";
    Object.assign(cl.style, { left: `${a.l}px`, top: `${a.t}px`, width: `${a.w}px`, height: `${a.h}px` });
    screen.appendChild(cl);
    const dx = c.l - a.l + (c.w - a.w) / 2;
    const dy = c.t - a.t + (c.h - a.h) / 2;
    const to = `translate(${dx}px,${dy}px) scale(${c.w / a.w})`;
    const flight = cl.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx / 2}px,${dy / 2 - 36}px) scale(1.35)`, opacity: 1, offset: 0.55 },
      { transform: to, opacity: 0.95 }], { duration: 560, delay: i * 60, easing: "cubic-bezier(.3,.7,.3,1)" });
    flight.finished.then(() => cl.remove()).catch(() => cl.remove());
  });
}
export function flyPill(screen, sheet) {
  const pill = document.getElementById("nearby-open");
  const card = sheet.querySelector(".map-sheet__card");
  if (!pill || !card) return;
  const p = relRect(pill, screen);
  const c = relRect(card, screen);
  const g = document.createElement("div");
  g.className = "map-sheet__ghost";
  g.style.cssText = `left:${p.l}px;top:${p.t}px;width:${p.w}px;height:${p.h}px`;
  screen.appendChild(g);
  const to = `translate(${c.l - p.l}px,${c.t - p.t}px) scale(${c.w / p.w},${c.h / p.h})`;
  g.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 },
    { transform: to, opacity: 0 }], { duration: 520, easing: "cubic-bezier(.3,.7,.3,1)" })
    .finished.then(() => g.remove()).catch(() => g.remove());
}
