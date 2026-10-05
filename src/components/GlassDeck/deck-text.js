/* ADAM/SHARED — src/components/GlassDeck/deck-text.js · the wordmark sheet */
// [plan:2026-10-05_000000-lump-sum-builds.md#phase-1] · canvas-only type, no font files (Task 46).
// — Sheet: transparent canvas → plane lying on the top plate; eyebrow + word, left-aligned, —
// —        auto-fitted to 74% of the plate; reads diagonally because the camera sits at 45°, —
// —        never skewed in 2D · ink is white at two alphas — the material tints it via its token —
// Export map: DECK_TEXT.make(w, h) → { canvas, paint(e, w) } · DECK_TEXT.face(weight, px)
(function () {
const api = {};
const css = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
const face = function (weight, px) {
return weight + ' ' + Math.round(px) + 'px ' + (css('--font-family-sans') || "'Inter', system-ui, sans-serif");
};
api.face = face;
api.make = function (w, h) {
const canvas = document.createElement('canvas');
canvas.width = w;
canvas.height = h;
const ctx = canvas.getContext('2d');
const paint = function (eyebrow, word) {
ctx.clearRect(0, 0, w, h);
ctx.fillStyle = 'rgba(255,255,255,0.94)';
ctx.textAlign = 'left';
try { ctx.letterSpacing = '0.01em'; } catch (e) {}
ctx.font = face(500, w * 0.056);
ctx.fillText(String(eyebrow || ''), w * 0.15, h * 0.44);
const target = w * 0.74;
let px = w * 0.32;
const set = function () { ctx.font = face(600, px); };
set();
try { ctx.letterSpacing = '-0.02em'; } catch (e) {}
let guard = 0;
while (ctx.measureText(String(word || '')).width > target && guard++ < 24) { px *= 0.94; set(); }
ctx.fillStyle = 'rgba(255,255,255,1)';
ctx.fillText(String(word || ''), w * 0.15, h * 0.76);
};
paint('Data', 'Utility');
return { canvas: canvas, paint: paint };
};
window.DECK_TEXT = api;
})();
