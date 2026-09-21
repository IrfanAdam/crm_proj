/* ADAM/PAGE — src/patterns/OppsHome/avatar-flights.js · pill faces → sheet blobs */
// Export map: flyAvatars
import { relRect } from "./nearby-map.js";
// — one layout pass: all rects read before any clone (no mid-flight thrash) —
export function flyAvatars(screen, sheet) {
  const avs = [...document.querySelectorAll("#nearby-open .avatar")];
  const blobs = [...sheet.querySelectorAll(".map-sheet__blob")];
  screen.querySelectorAll(".map-sheet__flight").forEach((n) => n.remove());
  blobs.forEach((b) => b.getAnimations().forEach((a) => a.cancel()));
  const plan = avs.map((av, i) => ({
    av, b: blobs[i], a: blobs[i] && relRect(av, screen), c: blobs[i] && relRect(blobs[i], screen),
  })).filter((p) => p.b && p.a && p.c);
  plan.forEach(({ av, b, a, c }, i) => {
    // — blobs hidden until ~90ms before landing, then pop (old 320 doubled) —
    b.animate([{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "scale(1.08)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 200, delay: 470 + i * 60, fill: "both", easing: "cubic-bezier(.34,1.56,.64,1)" });
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
    const landO = `translate(${dx}px,${dy}px) scale(${(sc * 1.06).toFixed(3)})`;
    const land = `translate(${dx}px,${dy}px) scale(${sc})`;
    const flight = cl.animate([
      { transform: "translate(0,0) scale(1)", easing: "cubic-bezier(.22,.65,.32,1)" },
      { transform: mid, offset: 0.45, easing: "cubic-bezier(.34,1.56,.64,1)" },
      { transform: landO, offset: 0.82 },
      { transform: land },
    ], { duration: 560, delay: i * 60, easing: "linear", fill: "both" });
    flight.finished.then(() => cl.remove()).catch(() => cl.remove());
  });
}
