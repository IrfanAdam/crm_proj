/* ADAM/SHARED — src/components/GemReward/gem-textures.js · stage + caustic textures */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · CanvasTexture builders (Task 22).
// — Stage: matches the CSS card stage (base = the canvas' computed colour, so the lab's —
// —        subtree data-theme is honoured) + soft glow + contact pool; the gem refracts it —
// — Caustic: the focused light pool under the stone — faceted spokes, not a smooth blob —
// Export map: GEM_TEXTURES.stage(canvas) · GEM_TEXTURES.caustic(color)
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
const rgb = function (v, a) {
const s = String(v).trim();
const m = s.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i);
if (m) {
const h = m[1];
const n = h.length === 3 ? h.split('').map(function (c) { return parseInt(c + c, 16); }) : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
return 'rgba(' + n[0] + ',' + n[1] + ',' + n[2] + ',' + a + ')';
}
const d = s.match(/\d+/g);
return d && d.length >= 3 ? 'rgba(' + d[0] + ',' + d[1] + ',' + d[2] + ',' + a + ')' : 'rgba(128,128,128,' + a + ')';
};
api.stage = function (canvas) {
const cv = document.createElement('canvas');
cv.width = 512;
cv.height = 136;
const c = cv.getContext('2d');
c.fillStyle = canvas ? getComputedStyle(canvas).backgroundColor : 'transparent';
c.fillRect(0, 0, 512, 136);
const g1 = c.createRadialGradient(256, 30, 0, 256, 30, 380);
g1.addColorStop(0, rgb(getComputedStyle(document.documentElement).getPropertyValue('--bg-surface'), 0.72));
g1.addColorStop(0.76, 'rgba(255,255,255,0)');
c.fillStyle = g1;
c.fillRect(0, 0, 512, 136);
const g2 = c.createRadialGradient(256, 117, 0, 256, 117, 90);
g2.addColorStop(0, rgb(getComputedStyle(document.documentElement).getPropertyValue('--text-primary'), 0.26));
g2.addColorStop(0.7, 'rgba(0,0,0,0)');
c.fillStyle = g2;
c.fillRect(0, 0, 512, 136);
const t = new T.CanvasTexture(cv);
t.colorSpace = T.SRGBColorSpace;
return t;
};
api.caustic = function (color) {
const cv = document.createElement('canvas');
cv.width = 128;
cv.height = 128;
const c = cv.getContext('2d');
const g = c.createRadialGradient(64, 64, 2, 64, 64, 62);
g.addColorStop(0, 'rgba(255,255,255,0.85)');
g.addColorStop(0.35, 'rgba(' + Math.round(color.r * 255) + ',' + Math.round(color.g * 255) + ',' + Math.round(color.b * 255) + ',0.4)');
g.addColorStop(1, 'rgba(0,0,0,0)');
c.fillStyle = g;
c.fillRect(0, 0, 128, 128);
c.globalCompositeOperation = 'destination-out';
[[0.2, 4], [1.1, 7], [2.35, 5], [3.05, 3], [4.6, 6], [5.75, 4]].forEach(function (w) {
c.save();
c.translate(64, 64);
c.rotate(w[0]);
c.fillStyle = 'rgba(0,0,0,0.22)';
c.beginPath();
c.moveTo(0, 0);
c.lineTo(64, -w[1]);
c.lineTo(64, w[1]);
c.closePath();
c.fill();
c.restore();
});
c.globalCompositeOperation = 'source-over';
[[40, 52, 0.5], [86, 44, 0.4], [60, 88, 0.35]].forEach(function (p) {
const b = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], 15);
b.addColorStop(0, 'rgba(255,255,255,' + p[2] + ')');
b.addColorStop(1, 'rgba(255,255,255,0)');
c.fillStyle = b;
c.fillRect(p[0] - 16, p[1] - 16, 32, 32);
});
const t = new T.CanvasTexture(cv);
t.colorSpace = T.SRGBColorSpace;
return t;
};
window.GEM_TEXTURES = api;
})();
