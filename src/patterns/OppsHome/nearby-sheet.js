/* ADAM/PAGE — src/patterns/OppsHome/nearby-sheet.js · sheet + matched morph (live tiles) */
// Export map: sheetHTML · initSheet · openSheet
import { createLiveMap, RING_MS, REHOME_GLIDE_SLOW_S } from "./live-map.js";
import { fitLayer, morph } from "./sheet-morph.js";
import { flyPill, flyPillBack } from "./map-flights.js";
import { PINS } from "./nearby-map.js";
import { parts, fromState, placeClose } from "./sheet-geometry.js";
export { sheetHTML } from "./sheet-html.js";
let openFn = null;
let sheetApi = null;
let inlineApi = null;
export function openSheet() { if (openFn) openFn(); }
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
  if (sheetApi && inlineApi) { inlineApi.cancelGlide(); sheetApi.set(inlineApi.get()); }
  if (feed) feed.style.overflow = "hidden";
  placeClose(p.sheet, screen);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  // — minimise glides the widget home behind the sheet (slow glide: the morph
  // reveals it mid-flight), so closing visibly settles onto current position —
  try { if (inlineApi?.glideHome) inlineApi.glideHome(REHOME_GLIDE_SLOW_S); } catch {}
  const finish = () => { p.sheet.hidden = true; if (feed) feed.style.overflow = ""; openBtn?.focus({ preventScroll: true }); };
  if (!reduced) flyPillBack(screen, p.sheet);
  morph(p, rect, -1, finish, reduced);
}
export async function initSheet(api) {
  inlineApi = api;
  const sheet = document.getElementById("nearby-sheet");
  const openBtn = document.getElementById("nearby-open");
  if (!sheet || !openBtn) return;
  openBtn.onclick = () => open();
  openFn = open;
  if (sheet.dataset.wired) return;
  sheet.dataset.wired = "1";
  sheetApi = await createLiveMap(sheet.querySelector("#sheet-tiles"), PINS, {});
  /* while the sheet is open its view syncs into the widget underneath; close()
     re-homes the widget first (hidden behind the sheet), so the morph always
     reveals current position — no tile reload during the reveal */
  const sync = () => { if (inlineApi) inlineApi.set(sheetApi.get()); };
  sheetApi.map.on("moveend", sync);
  sheetApi.map.on("zoomend", sync);
  sheet.querySelector("#sheet-close")?.addEventListener("click", close);
  sheet.querySelector("[data-close]")?.addEventListener("click", close);
  sheet.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}
