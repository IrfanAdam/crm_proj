/* ADAM/PAGE — src/patterns/OppsHome/map-flights.js · widget ↔ sheet element continuity */
// Export map: flyAvatars · cancelFlights · flyPill · flyPillBack
import { relRect } from "./nearby-map.js";
import { CLOSE, OPEN, walk, clamp01 } from "./morph-timing.js";
import { CLOSE_MS, OPEN_MS } from "./sheet-morph.js";
import { cancelFlights } from "./avatar-flights.js";
export { flyAvatars, cancelFlights } from "./avatar-flights.js";
/* The pill ⇄ card hand-off morphs one ghost box pill-box ⇄ card-box in layout px — never */
/* transform scale (scale stretches faces/label: the old slop) — inner layers cross-fade. */
function drive(screen, pill, card, dir, ms, done) {
  const p = relRect(pill, screen);
  const ct = card.style.transform;
  card.style.transform = "none";
  const c = relRect(card, screen);
  card.style.transform = ct;
  const rp = p.h / 2;
  const rc = parseFloat(getComputedStyle(card).borderTopLeftRadius) || 20;
  const g = document.createElement("div");
  g.setAttribute("aria-hidden", "true");
  g.style.cssText = "position:absolute;overflow:hidden;background:var(--bg-surface);"
    + "border:1px solid var(--border-thin);box-shadow:var(--shadow-md);z-index:1200;pointer-events:none";
  const pl = pill.cloneNode(true);
  pl.removeAttribute("id");
  pl.tabIndex = -1;
  pl.style.cssText = "position:static;transform:none;margin:auto";
  // — the clone must show faces: open hides the live pill's avatars for the flights —
  pl.querySelectorAll(".avatar").forEach((av) => { av.style.opacity = ""; });
  const pw = document.createElement("div");
  pw.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center";
  pw.appendChild(pl);
  const cw = document.createElement("div");
  cw.style.cssText = "position:absolute;inset:0;overflow:hidden";
  const cc = card.cloneNode(true);
  cc.style.cssText = "position:static;left:auto;right:auto;bottom:auto;transform:none;opacity:1;width:100%";
  cw.appendChild(cc);
  g.append(pw, cw);
  screen.appendChild(g);
  g.style.left = `${p.l}px`;
  g.style.top = `${p.t}px`;
  g.style.width = `${p.w}px`;
  g.style.height = `${p.h}px`;
  g.style.borderRadius = `${rp}px`;
  const t0 = performance.now();
  const step = (now) => {
    const p01 = clamp01((now - t0) / ms);
    const t = dir > 0 ? p01 : 1 - p01;
    const u = dir > 0 ? walk(OPEN, t) : walk(CLOSE, p01);
    const L = (a, b) => a + (b - a) * u;
    g.style.left = `${L(p.l, c.l).toFixed(2)}px`;
    g.style.top = `${L(p.t, c.t).toFixed(2)}px`;
    g.style.width = `${L(p.w, c.w).toFixed(2)}px`;
    g.style.height = `${L(p.h, c.h).toFixed(2)}px`;
    g.style.borderRadius = `${L(rp, rc).toFixed(2)}px`;
    pw.style.opacity = (1 - clamp01(t / 0.35)).toFixed(3);
    cw.style.opacity = clamp01((t - 0.55) / 0.35).toFixed(3);
    if (dir > 0) g.style.opacity = (1 - clamp01((t - 0.84) / 0.14)).toFixed(3);
    if (p01 < 1) requestAnimationFrame(step);
    else { g.remove(); if (done) done(); }
  };
  requestAnimationFrame(step);
}
// — the open's hand-off: the widget's pill grows into the sheet's card —
export function flyPill(screen, sheet) {
  const pill = document.getElementById("nearby-open");
  const card = sheet.querySelector(".map-sheet__card");
  if (!pill || !card) return;
  drive(screen, pill, card, 1, OPEN_MS);
}
/* — the close's hand-off: the card shrinks back onto the pill before the sheet hides, — */
/* — so the feed's pill is never seen popping in under the map. — */
export function flyPillBack(screen, sheet) {
  const pill = document.getElementById("nearby-open");
  const card = sheet.querySelector(".map-sheet__card");
  if (!pill || !card) return;
  // — quick close mid-flight: clones gone, blobs plain, pill faces back for the clone —
  cancelFlights(screen);
  // — real pill hides: ghost + pill never double in the last frame —
  pill.style.opacity = "0";
  drive(screen, pill, card, -1, CLOSE_MS, () => { pill.style.opacity = ""; });
}
