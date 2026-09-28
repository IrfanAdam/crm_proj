/* ADAM/SHARED — src/components/GemReward/gem-caustic.js · cut-shaped additive light pool */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-4] · the card's caustic drawn as the stone's own plan
// — silhouette — girdle polygon, facet spokes, table octagon, dispersive core — instead of free-floating —
// — bokeh blobs, so the pool reads as the stone's facet image (crisper-edged than the contact shadow) —
// — Fit: the staged pool plane is rad · 2.4 wide and the girdle spans 2 · rad, so a silhouette at FIT of —
// —      the canvas half-width lands 1:1 on the footprint at dress's existing scale (no scale change) —
// — Colour: white core + the stone's own colour; dispersion = small hue offsets taken off that same —
// —         colour (no new palette values). Additive, so it brightens the light stage, never stains it —
// — Gain: the card's stage sits at ~0.94 lum, so the pool is drawn well below full white — a hot core —
// —       only, with the facet grading in the unclipped band — tuned to the stage, not to the hero page —
// Export map: window.GEM_CAUSTIC.pool(color, cut) → THREE.CanvasTexture (null when the cut shape is absent)
(function () {
if (!window.THREE) return;
const T = window.THREE;
const S = 128;
const C = S / 2;
const FIT = 0.8333;            // girdle radius as a fraction of the canvas half-width — see the header
const GAIN = 1;                // pool weight: 1 = the tuned card value (the A/B drives this via api.gain)
const api = { gain: GAIN };
const rgba = function (c, a, off) {
const q = c.clone();
if (off) q.offsetHSL(off, 0, 0);
return 'rgba(' + Math.round(q.r * 255) + ',' + Math.round(q.g * 255) + ',' + Math.round(q.b * 255) + ',' + a + ')';
};
api.pool = function (color, cut) {
if (!window.GEM_CSHAPE || !window.GEM_CSHAPE.shape) return null;
const s = window.GEM_CSHAPE.shape(cut);
const g = api.gain;
const R = C * FIT;
const P = function (q) { return [C + (q[0] / s.rmax) * R, C + (q[1] / s.rmax) * R]; };
const path = function (pts) {
const ctx = c;
ctx.beginPath();
pts.forEach(function (q, i) { const p = P(q); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
ctx.closePath();
};
const blob = function (x, y, r, style) {
const b = c.createRadialGradient(x, y, 0, x, y, r);
b.addColorStop(0, style);
b.addColorStop(1, 'rgba(255,255,255,0)');
c.fillStyle = b;
c.fillRect(x - r, y - r, r * 2, r * 2);
};
const cv = document.createElement('canvas');
cv.width = cv.height = S;
const c = cv.getContext('2d');
const body = c.createRadialGradient(C, C, R * 0.04, C, C, R);
body.addColorStop(0, 'rgba(255,255,255,' + 0.34 * g + ')');
body.addColorStop(0.42, rgba(color, 0.2 * g));
body.addColorStop(0.86, rgba(color, 0.11 * g));
body.addColorStop(1, 'rgba(255,255,255,0)');
c.save();
path(s.girdle);
c.clip();
c.fillStyle = body;
c.fillRect(0, 0, S, S);
c.globalCompositeOperation = 'destination-out';       // facet divisions cut out of the pool body
c.lineCap = 'round';
s.notches.forEach(function (a) {
c.strokeStyle = 'rgba(0,0,0,0.2)';
c.lineWidth = 2.4;
c.beginPath();
c.moveTo(C, C);
c.lineTo(C + Math.cos(a) * R * 0.92, C + Math.sin(a) * R * 0.92);
c.stroke();
});
s.spokes.forEach(function (a) {
c.strokeStyle = 'rgba(0,0,0,0.28)';
c.lineWidth = 1.3;
c.beginPath();
c.moveTo(C, C);
c.lineTo(C + Math.cos(a) * R, C + Math.sin(a) * R);
c.stroke();
});
c.restore();
c.lineJoin = 'round';
c.strokeStyle = 'rgba(255,255,255,' + 0.45 * g + ')';  // the girdle silhouette: crisper than the shadow
c.lineWidth = 2.6;
path(s.girdle);
c.stroke();
c.strokeStyle = 'rgba(255,255,255,' + 0.6 * g + ')';
c.lineWidth = 1.4;
path(s.girdle);
c.stroke();
c.strokeStyle = rgba(color, 0.24 * g, 0.04);          // the table octagon: the pool's image of the table
c.lineWidth = 1;
path(s.table);
c.stroke();
blob(C, C, R * 0.52, 'rgba(255,255,255,' + 0.16 * g + ')');
blob(C - R * 0.06, C + R * 0.05, R * 0.13, rgba(color, 0.2 * g, 0.13));   // dispersive core: the stone's
blob(C + R * 0.07, C - R * 0.04, R * 0.1, rgba(color, 0.17 * g, -0.09));  // own colour, split by hue
blob(C, C, R * 0.06, 'rgba(255,255,255,' + 0.22 * g + ')');
const t = new T.CanvasTexture(cv);
t.colorSpace = T.SRGBColorSpace;
return t;
};
window.GEM_CAUSTIC = api;
})();
