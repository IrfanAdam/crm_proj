/* ADAM/PAGE — src/patterns/OppsHome/avatar-flights.js · pill faces → sheet blobs */
// Export map: flyAvatars · cancelFlights
import { relRect } from "./nearby-map.js";
const D = 560;   // flight duration per face
const STAG = 60;   // stagger per face
const FADE = 90;   // landing crossfade the clone + blob share (one element visible at a time)
const ARRIVE = (D - FADE) / D;   // clone parks on the blob rect, then only fades
const SOFT = "cubic-bezier(.25,1.15,.4,1)";   // landing spring: single small overshoot, no bounce
let gen = 0;
// — interrupt guard: a stale restore timeout never reveals sources mid-flight —
function restoreAvs(avs, g) {
  if (g !== gen) return;
  avs.forEach((av) => { av.getAnimations().forEach((a) => a.cancel()); av.style.opacity = ""; });
}
// — tear down an in-flight handoff (quick close): clones gone, blobs plain, pill back —
export function cancelFlights(screen) {
  gen++;
  screen.querySelectorAll(".map-sheet__flight").forEach((n) => n.remove());
  document.querySelectorAll("#nearby-open .avatar").forEach((av) => { av.getAnimations().forEach((a) => a.cancel()); av.style.opacity = ""; });
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
  // — photo faces fly to their rows; the +N count has no row, so it dissolves in place —
  const faces = avs.filter((av) => av.querySelector("img"));
  const counts = avs.filter((av) => !av.querySelector("img"));
  const plan = faces.map((av, i) => ({
    av, b: blobs[i], a: blobs[i] && relRect(av, screen), c: blobs[i] && relRect(blobs[i], screen),
  })).filter((p) => p.b && p.a && p.c);
  if (card) card.style.transform = ct;
  if (!plan.length) return;
  // — sources hide: clones carry the motion, so pill + clone never double —
  plan.forEach(({ av }) => { av.style.opacity = "0"; });
  counts.forEach((av) => { av.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "both", easing: "ease-out" }); });
  const lastLand = (plan.length - 1) * STAG + D;
  // — rows past the flown faces ease in only once the stagger has settled —
  blobs.slice(plan.length).forEach((b) => {
    b.animate([{ opacity: 0, transform: "scale(.92)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 220, delay: lastLand - 40, fill: "both", easing: "ease-out" });
  });
  plan.forEach(({ av, b, a, c }, i) => {
    const delay = i * STAG;
    const land = delay + D;
    // — the card's own blob scales up in place while the clone fades: no size pop —
    b.animate([{ opacity: 0, transform: "scale(.93)" }, { opacity: 1, transform: "scale(1.02)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 180, delay: land - 70, fill: "both", easing: SOFT });
    const cl = document.createElement("img");
    cl.src = av.querySelector("img").src;
    cl.alt = "";
    cl.className = "map-sheet__flight";
    Object.assign(cl.style, { left: `${a.l}px`, top: `${a.t}px`, width: `${a.w}px`, height: `${a.h}px` });
    screen.appendChild(cl);
    const dx = c.l - a.l + (c.w - a.w) / 2;
    const dy = c.t - a.t + (c.h - a.h) / 2;
    const sc = c.w / a.w;
    const lift = Math.max(28, Math.hypot(dx, dy) * 0.22);
    const mid = `translate(${dx * 0.48}px,${(dy * 0.48 - lift).toFixed(2)}px) scale(${(1 + (sc - 1) * 0.52).toFixed(3)})`;
    const park = `translate(${dx}px,${dy}px) scale(${sc})`;
    const flight = cl.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1, easing: "cubic-bezier(.22,.65,.32,1)" },
      { transform: mid, opacity: 1, offset: 0.45, easing: "cubic-bezier(.3,1.35,.5,1)" },
      { transform: park, opacity: 1, offset: ARRIVE },
      { transform: park, opacity: 0 },
    ], { duration: D, delay, easing: "linear", fill: "both" });
    flight.finished.then(() => cl.remove()).catch(() => cl.remove());
  });
  setTimeout(() => restoreAvs(avs, g), lastLand + 120);
}
