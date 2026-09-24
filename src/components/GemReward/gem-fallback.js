/* ADAM/SHARED — src/components/GemReward/gem-fallback.js · no-THREE 2D gem */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · CDN-blocked degrade (Task 22).
// — Paint: token-colored 2D gem on the same canvas when three.js is unavailable —
// Export map: window.GEM_FALLBACK = { paint(canvas, paint) } · zero deps.
(function () {
const api = {};
api.paint = function (canvas, paint) {
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = Math.round(Math.max(canvas.clientWidth, 320) * dpr);
canvas.height = Math.round(Math.max(canvas.clientHeight, 140) * dpr);
const g = canvas.getContext('2d');
if (!g) return;
const cx = canvas.width / 2, cy = canvas.height / 2, r = canvas.height * 0.34;
const s = [[0, -1.16], [0.8, -0.1], [0, 1.1], [-0.8, -0.1]].map(function (p) { return [cx + p[0] * r, cy + p[1] * r]; });
const grad = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
grad.addColorStop(0, 'rgba(255,255,255,0.94)');
grad.addColorStop(0.45, paint);
grad.addColorStop(1, 'rgba(0,0,0,0.34)');
g.beginPath();
g.moveTo(s[0][0], s[0][1]);
g.lineTo(s[1][0], s[1][1]);
g.lineTo(s[2][0], s[2][1]);
g.lineTo(s[3][0], s[3][1]);
g.closePath();
g.fillStyle = grad;
g.fill();
g.lineJoin = 'round';
g.lineWidth = Math.max(1, r * 0.05);
g.strokeStyle = 'rgba(255,255,255,0.72)';
g.stroke();
g.beginPath();
g.moveTo(s[3][0], s[3][1]);
g.lineTo(s[2][0], s[2][1]);
g.moveTo(s[0][0], s[0][1]);
g.lineTo(s[1][0], s[1][1]);
g.stroke();
};
window.GEM_FALLBACK = api;
})();
