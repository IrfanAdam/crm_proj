/* ADAM/PAGE — src/patterns/OppsHome/pill-ghost.js · ghost drawer DOM for pill ⇄ card flight */
// Export map: buildGhost
import { relRect } from "./nearby-map.js";
import { buildFaces } from "./face-handoff.js";
// — measures pill/card rects (card transform neutralised while measuring), builds the
// — ghost drawer parked on the pill rect; the caller animates it via its paint loop —
export function buildGhost(screen, sheet, pill, card) {
  const p = relRect(pill, screen);
  const ct = card.style.transform;
  card.style.transform = "none";
  const c = relRect(card, screen);
  const h = relRect(sheet.querySelector(".map-sheet__list"), screen);
  const dh = { x: h.l + h.w / 2 - (c.l + c.w / 2), y: h.t + h.h / 2 - (c.t + c.h / 2) };
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
  return { ghost, pl, pw, cw, p, c, dh, rp, rc, paintFaces };
}
