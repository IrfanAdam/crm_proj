/* ADAM/PAGE — src/patterns/OppsHome/sheet-html.js · sheet markup */
// Export map: sheetHTML
import { PROSPECTS } from "./nearby-map.js";
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
    + `<div class="map-sheet__header" id="sheet-header"><span class="map-sheet__header-title">3 Prospects</span><span class="map-sheet__header-sub">pan &amp; zoom</span></div>`
    + `<button class="map-sheet__close" id="sheet-close" type="button" aria-label="Close map">✕</button>`
    + `<div class="map-sheet__card"><span class="map-sheet__handle"></span>`
    + `<div class="map-sheet__list">${rows}</div></div></section></div>`;
}
