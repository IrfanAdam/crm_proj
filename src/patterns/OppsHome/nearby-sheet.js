/* ADAM/PAGE — src/patterns/OppsHome/nearby-sheet.js · sheet + matched morph */
// Export map: sheetHTML · initSheet · openSheet
import { wirePan } from "./map-pan.js";
import { PROSPECTS, gridSVG, pinsHTML, relRect, flyAvatars, flyPill } from "./nearby-map.js";
let openFn = null;
let sheetApi = null;
let inlineApi = null;
export function openSheet() { if (openFn) openFn(); }
export function sheetHTML() {
  const rows = PROSPECTS.map((p) => `<div class="map-sheet__row">`
    + `<span class="map-sheet__blob"><img src="https://i.pravatar.cc/64?img=${p.img}" alt=""/></span>`
    + `<span class="map-sheet__who"><b>${p.name}</b><i>${p.meta} · ${p.dist}</i></span>`
    + `<button type="button" aria-label="Open ${p.name}">→</button></div>`).join("");
  return `<div class="map-sheet" id="nearby-sheet" hidden>`
    + `<div class="map-sheet__scrim" data-close></div>`
    + `<section class="map-sheet__panel" role="dialog" aria-modal="true" aria-label="Prospects nearby">`
    + `<div class="map-sheet__map" id="sheet-map"><div class="map-sheet__view" id="sheet-view">${gridSVG("sh-g")}${pinsHTML()}</div>`
    + `<button class="opps__nav map-sheet__recenter" id="sheet-reset" type="button" aria-label="Recenter map">➤</button></div>`
    + `<button class="map-sheet__close" id="sheet-close" type="button" aria-label="Close map">✕</button>`
    + `<div class="map-sheet__card"><span class="map-sheet__handle"></span>`
    + `<div class="map-sheet__head"><span><b>3 prospects nearby</b><i>Within 12km · updated now</i></span></div>`
    + `<div class="map-sheet__list">${rows}</div></div></section></div>`;
}
function fromState() {
  const screen = document.querySelector(".device__screen");
  const m = relRect(document.getElementById("nearby-map"), screen);
  const sx = m.w / screen.clientWidth;
  const sy = m.h / screen.clientHeight;
  return { screen, m, sx, sy, from: `translate(${m.l}px,${m.t}px) scale(${sx},${sy})` };
}
function placeClose(sheet, screen) {
  const big = document.querySelector(".opps__avatar");
  let r = big && relRect(big, screen);
  if (!r || r.t + r.h < 0 || r.t > screen.clientHeight) r = relRect(document.querySelector(".opps__compact-avatar"), screen);
  const c = sheet.querySelector("#sheet-close");
  Object.assign(c.style, { left: `${r.l}px`, top: `${r.t}px`, width: `${r.w}px`, height: `${r.h}px` });
}
function open() {
  const sheet = document.getElementById("nearby-sheet");
  if (!sheet || !sheet.hidden) return;
  const feed = document.getElementById("app-content");
  sheet.hidden = false;
  if (sheetApi && inlineApi) sheetApi.set(inlineApi.get());
  if (feed) feed.style.overflow = "hidden";
  const { screen, m, sx, sy, from } = fromState();
  placeClose(sheet, screen);
  const panel = sheet.querySelector(".map-sheet__panel");
  const done = [];
  panel.style.transformOrigin = "0 0";
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const scrim = sheet.querySelector(".map-sheet__scrim");
    const card = sheet.querySelector(".map-sheet__card");
    const dip = `translate(${m.l}px,${m.t + 18}px) scale(${sx * 0.97},${sy * 0.97})`;
    const anim = panel.animate([{ transform: from, borderRadius: "14px", easing: "cubic-bezier(.5,0,.8,.4)" },
      { transform: dip, borderRadius: "14px", offset: 0.28, easing: "cubic-bezier(.2,.9,.25,1)" },
      { transform: "none", borderRadius: "0px" }], { duration: 460 });
    done.push(anim.finished);
    done.push(scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280 }).finished);
    done.push(card.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 340, delay: 100, fill: "backwards" }).finished);
    flyAvatars(screen, sheet);
    flyPill(screen, sheet);
  }
  const closeBtn = sheet.querySelector("#sheet-close");
  Promise.allSettled(done).then(() => { placeClose(sheet, screen); closeBtn?.focus({ preventScroll: true }); });
}
function close() {
  const sheet = document.getElementById("nearby-sheet");
  if (!sheet || sheet.hidden) return;
  if (sheetApi && inlineApi) inlineApi.set(sheetApi.get());
  const feed = document.getElementById("app-content");
  const openBtn = document.getElementById("nearby-open");
  const finish = () => { sheet.hidden = true; if (feed) feed.style.overflow = ""; openBtn?.focus({ preventScroll: true }); };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
  const { from } = fromState();
  const panel = sheet.querySelector(".map-sheet__panel");
  const scrim = sheet.querySelector(".map-sheet__scrim");
  const card = sheet.querySelector(".map-sheet__card");
  panel.style.transformOrigin = "0 0";
  const done = [panel.animate([{ transform: "none" }, { transform: from }], { duration: 260, easing: "cubic-bezier(.5,0,.8,.4)" }).finished];
  done.push(scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220 }).finished);
  done.push(card.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(16px)" }], { duration: 220 }).finished);
  Promise.allSettled(done).then(finish);
}
export function initSheet(api) {
  inlineApi = api;
  const sheet = document.getElementById("nearby-sheet");
  const openBtn = document.getElementById("nearby-open");
  if (!sheet || !openBtn) return;
  openBtn.onclick = () => open();
  openFn = open;
  if (sheet.dataset.wired) return;
  sheet.dataset.wired = "1";
  sheetApi = wirePan(sheet.querySelector("#sheet-map"), sheet.querySelector("#sheet-view"), { x: 0, y: 0, z: 0.85, min: 0.6, max: 3 });
  sheet.querySelector("#sheet-close")?.addEventListener("click", close);
  sheet.querySelector("[data-close]")?.addEventListener("click", close);
  sheet.querySelector("#sheet-reset")?.addEventListener("click", () => sheetApi.reset());
  sheet.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}
