/* ADAM/PAGE — src/patterns/OppsHome/face-handoff.js · faces fly screen-space via centre */
// Export map: buildFaces
import { relRect } from "./nearby-map.js";
import { clamp01 } from "./morph-timing.js";
const STAG = 0.1;   // per-face stagger in openness units — reads as choreography
const SPAN = 0.6;   // every face parks before the HAND swap
const POP = 0.45;   // mid-path swell at the centre waypoint
const ARC = 0.12;   // waypoint lift share of travel
const CLOSE_SPAN = 0.8;   // return leg: faces unpark sooner, no dead wait while the ghost shrinks
// — faces are screen-space siblings above the ghost: the ghost's overshoot never drags —
// — parked clones. Each path bends through a lifted centre waypoint, swelling mid-path —
// — so the flight reads as a swoop, not a slide. The count bubble swaps to its photo. —
export function buildFaces(screen, pill, sheet) {
  const cx = screen.clientWidth / 2;
  const srcs = [...pill.querySelectorAll(".avatar")];
  const blobs = [...sheet.querySelectorAll(".map-sheet__blob")];
  const faces = srcs.map((av, i) => {
    if (!blobs[i]) return null;
    const a = relRect(av, screen);
    const b = relRect(blobs[i], screen);
    const cl = av.cloneNode(true);
    cl.removeAttribute("id");
    cl.classList.add("map-sheet__face");
    cl.setAttribute("aria-hidden", "true");
    cl.style.opacity = "";
    av.style.opacity = "0";   // live source hides: its clone carries it, never doubled
    cl.style.margin = "0";
    cl.style.position = "absolute";
    cl.style.zIndex = "1300";
    cl.style.pointerEvents = "none";
    cl.style.overflow = "hidden";
    cl.style.boxSizing = "border-box";
    cl.style.border = "2px solid var(--bg-surface)";
    cl.style.transformOrigin = "0 0";
    cl.style.willChange = "transform";
    cl.style.left = "0";
    cl.style.top = "0";
    cl.style.width = `${a.w}px`;
    cl.style.height = `${a.h}px`;
    const img = cl.querySelector("img");
    if (img) img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block";
    let label = null;
    let swap = null;
    if (!img) {
      label = document.createElement("span");
      label.textContent = cl.textContent;
      label.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;height:100%";
      swap = document.createElement("img");
      swap.src = blobs[i].querySelector("img")?.src || "";
      swap.alt = "";
      swap.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0";
      cl.textContent = "";
      cl.append(label, swap);
    }
    screen.appendChild(cl);
    const ax = a.l + a.w / 2;
    const ay = a.t + a.h / 2;
    const bx = b.l + b.w / 2;
    const by = b.t + b.h / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const dist = Math.hypot(dx, dy) || 1;
    const side = Math.sign(cx - (ax + bx) / 2) || 1;
    const qx = (ax + bx) / 2 + side * dist * ARC;
    const qy = (ay + by) / 2 - dist * ARC;
    return { el: cl, ax, ay, bx, by, qx, qy, aw: a.w, ah: a.h, bw: b.w, bh: b.h, i, label, swap };
  }).filter(Boolean);
  const ease = (f) => (f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2);
  return (s, rev) => faces.forEach((o) => {
    const span = rev ? CLOSE_SPAN : SPAN;
    const f = clamp01((s - o.i * STAG) / span);
    const e = ease(f);
    const g = 1 - e;
    const px = g * g * o.ax + 2 * g * e * o.qx + e * e * o.bx;
    const py = g * g * o.ay + 2 * g * e * o.qy + e * e * o.by;
    const k = 1 + POP * Math.sin(Math.PI * e);
    const sc = ((o.aw + (o.bw - o.aw) * e) / o.aw) * k;
    const tx = px - o.aw * sc / 2;
    const ty = py - o.ah * sc / 2;
    o.el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${sc.toFixed(4)})`;
    const ring = Math.round((1 - clamp01((f - 0.5) / 0.4)) * 100);
    o.el.style.borderColor = `color-mix(in srgb, var(--bg-surface) ${ring}%, transparent)`;
    if (o.label) o.label.style.opacity = (1 - clamp01((f - 0.5) / 0.3)).toFixed(3);
    if (o.swap) o.swap.style.opacity = clamp01((f - 0.5) / 0.3).toFixed(3);
  });
}
