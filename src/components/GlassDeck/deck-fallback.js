/* ADAM/SHARED — src/components/GlassDeck/deck-fallback.js · no-THREE stand-in */
// [plan:2026-10-05_000000-lump-sum-builds.md#phase-1] · (Task 46).
// — Paints the deck as three rounded diamonds on the token ramp — the panel still reads as —
// —   the pattern when WebGL is missing; colours only via getComputedStyle tokens —
// Export map: DECK_FALLBACK.paint(canvas)
(function () {
const api = {};
const css = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
api.paint = function (canvas) {
const c = canvas.getContext('2d');
const w = canvas.width = canvas.clientWidth || 640;
const h = canvas.height = canvas.clientHeight || 400;
c.fillStyle = css('--primitive-sapphire-ui-50') || 'rgb(245,249,255)';
c.fillRect(0, 0, w, h);
const stops = ['--primitive-sapphire-ui-200', '--primitive-sapphire-ui-300', '--primitive-sapphire-ui-400'];
const fall = ['rgb(193,224,253)', 'rgb(124,190,251)', 'rgb(33,138,234)'];
for (let i = 2; i >= 0; i--) {
const s = w * 0.34;
c.save();
c.translate(w / 2, h / 2 + (i - 1) * h * 0.075);
c.rotate(Math.PI / 4);
c.globalAlpha = 0.28 + i * 0.24;
c.fillStyle = css(stops[i]) || fall[i];
c.beginPath();
c.roundRect(-s / 2, -s / 2, s, s, s * 0.27);
c.fill();
c.restore();
}
};
window.DECK_FALLBACK = api;
})();
