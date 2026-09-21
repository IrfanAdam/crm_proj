/* ADAM/PAGE — src/patterns/OppsHome/nearby-sheet.js · sheet + matched morph (live tiles) */
// Export map: sheetHTML · initSheet · openSheet
import { createLiveMap, RING_MS } from "./live-map.js";
import { fitLayer, morph } from "./sheet-morph.js";
import { flyAvatars, flyPill, flyPillBack } from "./map-flights.js";
import { PINS, PROSPECTS, relRect } from "./nearby-map.js";
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
    + `<div class="map-sheet__win" id="sheet-win"><div class="map-sheet__map" id="sheet-map">`
    + `<div class="map-sheet__view" id="sheet-view"><div class="map-sheet__tiles" id="sheet-tiles"></div></div></div></div>`
    + `<button class="map-sheet__close" id="sheet-close" type="button" aria-label="Close map">✕</button>`
    + `<div class="map-sheet__card"><span class="map-sheet__handle"></span>`
    + `<div class="map-sheet__head"><span><b>3 prospects nearby</b><i>Within 12km · updated now</i></span></div>`
    + `<div class="map-sheet__list">${rows}</div></div></section></div>`;
}
function parts() {
  const sheet = document.getElementById("nearby-sheet");
  return { sheet, screen: document.querySelector(".device__screen"), win: sheet.querySelector(".map-sheet__win"),
    layer: sheet.querySelector("#sheet-map"), scrim: sheet.querySelector(".map-sheet__scrim"),
    card: sheet.querySelector(".map-sheet__card"), x: sheet.querySelector("#sheet-close") };
}
// — the widget's inner box in screen px (the 1px border and its radius come off the box) —
function fromState() {
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
function placeClose(sheet, screen) {
  const big = document.querySelector(".opps__avatar");
  let r = big && relRect(big, screen);
  if (!r || r.t + r.h < 0 || r.t > screen.clientHeight) r = relRect(document.querySelector(".opps__compact-avatar"), screen);
  const c = sheet.querySelector("#sheet-close");
  Object.assign(c.style, { left: `${r.l}px`, top: `${r.t}px`, width: `${r.w}px`, height: `${r.h}px` });
}
function open() {
  const p = parts();
  if (!p.sheet || !p.sheet.hidden) return;
  const feed = document.getElementById("app-content");
  const { screen, rect } = fromState();
  p.sheet.hidden = false;
  fitLayer(screen, p.layer);
  // — unhidden layer went 0×0 → screen-sized: invalidate before set, or the view lands off-centre —
  if (sheetApi) sheetApi.map.invalidateSize();
  // — ring phase rides the wall clock; re-anchor at unhide so the blip resumes in phase —
  p.layer.style.setProperty("--me-delay", `-${Math.round(performance.now() % RING_MS)}ms`);
  if (sheetApi && inlineApi) sheetApi.set(inlineApi.get());
  if (feed) feed.style.overflow = "hidden";
  placeClose(p.sheet, screen);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced) flyAvatars(screen, p.sheet);
  if (!reduced) flyPill(screen, p.sheet);
  morph(p, rect, 1, () => { placeClose(p.sheet, screen); p.x.focus({ preventScroll: true }); }, reduced);
}
function close() {
  const p = parts();
  if (!p.sheet || p.sheet.hidden) return;
  const feed = document.getElementById("app-content");
  const openBtn = document.getElementById("nearby-open");
  const { screen, rect } = fromState();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finish = () => { p.sheet.hidden = true; if (feed) feed.style.overflow = ""; openBtn?.focus({ preventScroll: true }); };
  if (!reduced) flyPillBack(screen, p.sheet);
  morph(p, rect, -1, finish, reduced);
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
  sheetApi = createLiveMap(sheet.querySelector("#sheet-tiles"), PINS, {});
  /* while the sheet is open its view is the source of truth, so the widget underneath is
     already at the landed view when the morph closes — no tile reload during the reveal */
  const sync = () => { if (inlineApi) inlineApi.set(sheetApi.get()); };
  sheetApi.map.on("moveend", sync);
  sheetApi.map.on("zoomend", sync);
  sheet.querySelector("#sheet-close")?.addEventListener("click", close);
  sheet.querySelector("[data-close]")?.addEventListener("click", close);
  sheet.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}
