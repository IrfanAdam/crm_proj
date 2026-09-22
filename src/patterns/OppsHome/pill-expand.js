/* ADAM/PAGE — src/patterns/OppsHome/pill-expand.js · one ghost, one clock, both directions */
// Export map: driveExpand · cancelExpand
import { relRect } from "./nearby-map.js";
import { CLOSE, OPEN, clamp01, walk } from "./morph-timing.js";
import { buildFaces } from "./face-handoff.js";
import { getScale } from "../../logic/time-scale.js";
// — ghost content crossfades on ONE window: pill layer full until X0, card layer from —
// — X0, so exactly one layer shows at every instant (the old .35/.55 split flashed blank).
const X0 = 0.55;
const X1 = 0.75;
const HAND = 0.84;   // ghost ⇄ real-card swap (mirrors FADE.open.card [.84,.98])
let gen = 0;
// — interrupt teardown: ghost + faces gone, live pill whole. Flight state is inline —
// — styles only, so node removal + opacity resets end it — no WAAPI ledger to chase. —
export function cancelExpand(screen) {
  gen++;
  screen?.querySelectorAll(".map-sheet__ghost").forEach((n) => n.remove());
  screen?.querySelectorAll(".map-sheet__face").forEach((n) => n.remove());
  const pill = document.getElementById("nearby-open");
  pill?.querySelectorAll(".avatar").forEach((av) => { av.style.opacity = ""; });
  if (pill) pill.style.opacity = "";
}
// — s = openness (open 0→1, close 1→0): box, layers and faces all read s. —
export function driveExpand(screen, sheet, dir, ms, done) {
  const pill = document.getElementById("nearby-open");
  const card = sheet.querySelector(".map-sheet__card");
  if (!pill || !card) return;
  cancelExpand(screen);   // a previous ghost never stacks
  const g = ++gen;
  const p = relRect(pill, screen);
  const ct = card.style.transform;
  card.style.transform = "none";
  const c = relRect(card, screen);
  const paintFaces = buildFaces(screen, pill, sheet);
  card.style.transform = ct;
  const rp = p.h / 2;
  const rc = parseFloat(getComputedStyle(card).borderTopLeftRadius) || 20;
  const ghost = document.createElement("div");
  ghost.className = "map-sheet__ghost";
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.cssText = "position:absolute;overflow:hidden;background:var(--bg-surface);"
    + "border:1px solid var(--border-thin);box-shadow:var(--shadow-md);z-index:1200;pointer-events:none";
  const pl = pill.cloneNode(true);
  pl.removeAttribute("id");
  pl.tabIndex = -1;
  pl.style.cssText = "position:static;transform:none;margin:auto;background:transparent";
  pl.style.borderColor = "transparent";
  pl.style.boxShadow = "none";
  pl.querySelectorAll(".avatar").forEach((av) => { av.style.opacity = "0" });
  const pw = document.createElement("div");
  pw.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center";
  pw.appendChild(pl);
  const cw = document.createElement("div");
  cw.style.cssText = "position:absolute;inset:0;overflow:hidden";
  const cc = card.cloneNode(true);
  cc.style.cssText = "position:static;left:auto;right:auto;bottom:auto;transform:none;opacity:1;width:100%";
  cc.querySelectorAll(".map-sheet__blob").forEach((b) => { b.style.opacity = "0" });
  cw.appendChild(cc);
  ghost.append(pw, cw);
  ghost.style.left = `${p.l}px`;
  ghost.style.top = `${p.t}px`;
  ghost.style.width = `${p.w}px`;
  ghost.style.height = `${p.h}px`;
  ghost.style.borderRadius = `${rp}px`;
  if (dir < 0) pill.style.opacity = "0";   // real pill hides: ghost + pill never double
  screen.appendChild(ghost);
  const t0 = performance.now();
  // — ghost box writes layout intentionally (same class as sheet-morph): the ghost
  // — carries real pixels between rects; opacity/translate layers stay compositor-only.
  const paint = (s) => {
    const u = dir > 0 ? walk(OPEN, s) : walk(CLOSE, 1 - s);
    const L = (a, b) => a + (b - a) * u;
    ghost.style.left = `${L(p.l, c.l).toFixed(2)}px`;
    ghost.style.top = `${L(p.t, c.t).toFixed(2)}px`;
    ghost.style.width = `${L(p.w, c.w).toFixed(2)}px`;
    ghost.style.height = `${L(p.h, c.h).toFixed(2)}px`;
    ghost.style.borderRadius = `${L(rp, rc).toFixed(2)}px`;
    pw.style.opacity = (1 - clamp01((s - X0) / (X1 - X0))).toFixed(3);
    cw.style.opacity = clamp01((s - X0) / (X1 - X0)).toFixed(3);
    paintFaces(s, dir < 0);
    if (dir > 0) ghost.style.opacity = (1 - clamp01((s - HAND) / (1 - HAND))).toFixed(3);
  };
  paint(dir > 0 ? 0 : 1);
  const step = (now) => {
    if (g !== gen) return;   // superseded: cancelExpand already tore us down
    const p01 = clamp01((now - t0) / (ms / getScale()));
    paint(dir > 0 ? p01 : 1 - p01);
    if (p01 < 1) { requestAnimationFrame(step); return; }
    ghost.remove();
    screen.querySelectorAll(".map-sheet__face").forEach((n) => n.remove());
    pill.querySelectorAll(".avatar").forEach((av) => { av.style.opacity = ""; });
    pill.style.opacity = "";
    if (done) done();
  };
  requestAnimationFrame(step);
}
