/* ADAM/PAGE — src/patterns/OppsHome/avatar-flights.js · pill faces → sheet blobs */
// Export map: flyAvatars · cancelFlights
import { relRect } from "./nearby-map.js";
const D = 560;   // flight duration per face
const STAG = 60;   // stagger per face
const FADE = 130;   // landing crossfade the clone + blob share (one element visible at a time)
const ARRIVE = (D - FADE) / D;   // clone parks on the blob rect, then only fades
let gen = 0;
// — interrupt guard: a stale restore timeout never reveals sources mid-flight —
function restoreAvs(avs, g) {
  if (g !== gen) return;
  avs.forEach((av) => { av.style.opacity = ""; });
}
// — tear down an in-flight handoff (quick close): clones gone, blobs plain, pill back —
export function cancelFlights(screen) {
  gen++;
  screen.querySelectorAll(".map-sheet__flight").forEach((n) => n.remove());
  document.querySelectorAll("#nearby-open .avatar").forEach((av) => { av.style.opacity = ""; });
  document.querySelectorAll(".map-sheet__blob").forEach((b) => b.getAnimations().forEach((a) => a.cancel()));
}
// — one layout pass: card unshifted (close leaves translateY 12px) before blob rects —
export function flyAvatars(screen, sheet) {
  const avs = [...document.querySelectorAll("#nearby-open .avatar")];
  const blobs = [...sheet.querySelectorAll(".map-sheet__blob")];
  const card = sheet.querySelector(".map-sheet__card");
  if (!avs.length || !blobs.length) return;
  cancelFlights(screen);
  const g = ++gen;
  const ct = card ? card.style.transform : "";
  if (card) card.style.transform = "none";
  const plan = avs.map((av, i) => ({
    av, b: blobs[i], a: blobs[i] && relRect(av, screen), c: blobs[i] && relRect(blobs[i], screen),
  })).filter((p) => p.b && p.a && p.c);
  if (card) card.style.transform = ct;
  if (!plan.length) return;
  // — sources hide: clones carry the motion, so pill + clone never double —
  plan.forEach(({ av }) => { av.style.opacity = "0"; });
  const lastLand = (plan.length - 1) * STAG + D;
  plan.forEach(({ av, b, a, c }, i) => {
    const delay = i * STAG;
    const land = delay + D;
    // — the card's own blob scales up in place while the clone fades: no size pop —
    b.animate([{ opacity: 0, transform: "scale(.9)" }, { opacity: 1, transform: "scale(1.04)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 200, delay: land - 150, fill: "both", easing: "cubic-bezier(.34,1.56,.64,1)" });
    const img = av.querySelector("img");
    const cl = img ? document.createElement("img") : av.cloneNode(true);
    if (img) cl.src = img.src;
    else { cl.removeAttribute("id"); cl.tabIndex = -1; }
    cl.className = "map-sheet__flight";
    if (img) cl.alt = "";
    Object.assign(cl.style, { left: `${a.l}px`, top: `${a.t}px`, width: `${a.w}px`, height: `${a.h}px` });
    if (!img) { cl.style.display = "inline-flex"; cl.style.alignItems = "center"; cl.style.justifyContent = "center"; }
    screen.appendChild(cl);
    const dx = c.l - a.l + (c.w - a.w) / 2;
    const dy = c.t - a.t + (c.h - a.h) / 2;
    const sc = c.w / a.w;
    const lift = Math.max(28, Math.hypot(dx, dy) * 0.22);
    const mid = `translate(${dx * 0.48}px,${(dy * 0.48 - lift).toFixed(2)}px) scale(${(1 + (sc - 1) * 0.52).toFixed(3)})`;
    const park = `translate(${dx}px,${dy}px) scale(${sc})`;
    const flight = cl.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1, easing: "cubic-bezier(.22,.65,.32,1)" },
      { transform: mid, opacity: 1, offset: 0.45, easing: "cubic-bezier(.34,1.56,.64,1)" },
      { transform: park, opacity: 1, offset: ARRIVE },
      { transform: park, opacity: 0 },
    ], { duration: D, delay, easing: "linear", fill: "both" });
    flight.finished.then(() => cl.remove()).catch(() => cl.remove());
  });
  setTimeout(() => restoreAvs(avs, g), lastLand + 80);
}
