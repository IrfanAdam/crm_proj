/* ADAM/PAGE — src/patterns/OppsHome/sheet-geometry.js · widget/sheet rect helpers */
// Export map: parts · fromState · placeClose
import { relRect } from "./nearby-map.js";
export function parts() {
  const sheet = document.getElementById("nearby-sheet");
  return { sheet, screen: document.querySelector(".device__screen"), win: sheet.querySelector(".map-sheet__win"),
    layer: sheet.querySelector("#sheet-map"), scrim: sheet.querySelector(".map-sheet__scrim"),
    header: sheet.querySelector("#sheet-header"),
    card: sheet.querySelector(".map-sheet__card"), x: sheet.querySelector("#sheet-close") };
}
// — the widget's inner box in screen px (the 1px border and its radius come off the box) —
export function fromState() {
  const box = document.getElementById("nearby-map");
  const screen = document.querySelector(".device__screen");
  box.style.transition = "none"; box.removeAttribute("data-pressed");
  const m = relRect(box, screen);
  box.style.transition = "";
  const cs = getComputedStyle(box);
  const bw = parseFloat(cs.borderTopWidth) || 0;
  const rect = { l: m.l + bw, t: m.t + bw, w: m.w - bw * 2, h: m.h - bw * 2, r: (parseFloat(cs.borderTopLeftRadius) || 0) - bw };
  return { screen, rect };
}
export function placeClose(sheet, screen) {
  const big = document.querySelector(".opps__avatar");
  let r = big && relRect(big, screen);
  if (!r || r.t + r.h < 0 || r.t > screen.clientHeight) r = relRect(document.querySelector(".opps__compact-avatar"), screen);
  const c = sheet.querySelector("#sheet-close");
  Object.assign(c.style, { left: `${r.l}px`, top: `${r.t}px`, width: `${r.w}px`, height: `${r.h}px` });
  const h = sheet.querySelector("#sheet-header");
  if (h) h.style.height = `${r.t + r.h}px`;
}
