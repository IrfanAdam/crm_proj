/* ADAM/PAGE — src/patterns/OppsHome/map-flights.js · widget ↔ sheet element continuity */
// Export map: flyAvatars · flyPill · flyPillBack
import { relRect } from "./nearby-map.js";
import { CLOSE, OPEN, walk, clamp01 } from "./morph-timing.js";
import { OPEN_MS, CLOSE_MS } from "./sheet-morph.js";
const FLY = "cubic-bezier(.4,0,.2,1)";
/* The pill ⇄ card hand-off morphs one ghost box pill-box ⇄ card-box in layout px — never */
/* transform scale (scale stretches faces/label: the old slop) — inner layers cross-fade. */
function drive(screen, pill, card, dir, ms) {
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
    if (dir > 0) g.style.opacity = (1 - clamp01((t - 0.85) / 0.15)).toFixed(3);
    if (p01 < 1) requestAnimationFrame(step);
    else g.remove();
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
  drive(screen, pill, card, -1, CLOSE_MS);
}
// — avatar continuity: the pill's faces fly into the sheet's blobs — all rects are read
//   before any clone is written, so setup costs one layout pass (no mid-flight thrash) —
export function flyAvatars(screen, sheet) {
  const imgs = [...document.querySelectorAll("#nearby-open .avatar img")];
  const blobs = [...sheet.querySelectorAll(".map-sheet__blob")];
  const plan = imgs.map((im, i) => ({ im, b: blobs[i], a: blobs[i] && relRect(im, screen), c: blobs[i] && relRect(blobs[i], screen) })).filter((p) => p.b);
  plan.forEach(({ im, b, a, c }, i) => {
    // — blobs stay hidden until their clone is ~90ms from landing, then pop with overshoot;
    //   old 320+ i*60 started 240ms early → double avatars mid-flight —
    b.animate([{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "scale(1.08)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 200, delay: 470 + i * 60, fill: "both", easing: "cubic-bezier(.34,1.56,.64,1)" });
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
      { transform: to, opacity: 1 }], { duration: 560, delay: i * 60, easing: FLY, fill: "both" });
    flight.finished.then(() => cl.remove()).catch(() => cl.remove());
  });
}
