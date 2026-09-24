/* ADAM/SHARED — src/components/GemReward/gem-env.js · procedural studio environment */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · PMREM env builder (Task 22).
// — Env: near-black shell + a ring tent of small bright emitters (4 bands x 7 azimuths) —
// —      plus dim broad fill; HDR values >1 survive because PMREM renders with NoToneMapping —
// — Why small and many: a facet only glints when its mirror direction finds a source, so the —
// —      tent must cover the sphere; a few big panels just light every facet flat —
// Export map: GEM_ENV.texture(renderer) → PMREM texture for scene.environment · GEM_ENV.stage(canvas) → stage backdrop · GEM_ENV.lastMs
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
api.lastMs = 0;
function studio() {
const s = new T.Scene();
const shell = new T.MeshBasicMaterial({ color: new T.Color(0.02, 0.02, 0.025), side: T.BackSide });
s.add(new T.Mesh(new T.BoxGeometry(40, 40, 40), shell));
const lit = function (w, h, x, y, z, r, g, b) {
const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(r, g, b), side: T.DoubleSide }));
m.position.set(x, y, z);
m.lookAt(0, 0, 0);
s.add(m);
};
const glow = function (x, y, z, rad, i, tint) {
const m = new T.Mesh(new T.SphereGeometry(rad, 12, 10), new T.MeshBasicMaterial({ color: new T.Color(i * tint, i, i * (2 - tint)) }));
m.position.set(x, y, z);
s.add(m);
};
[[24, 24, 0, 14, 1, 0.08, 0.08, 0.09], [18, 18, 0, -13, 3, 0.3, 0.29, 0.27], [16, 16, -13, 14, 10, 120, 122, 128], [0.6, 12, 13, 12, 5, 85, 84, 82], [0.25, 7, 11, 0, -1, 22, 22, 23], [0.25, 6, -9, -1, 6, 18, 18, 19]].forEach(function (b) {
lit(b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7]);
});
[[0.85, 20, 0, 1.06, 12, 1.5], [0.42, 14, 0.45, 1, 11.6, 1.3], [0.05, 9, 0.9, 0.95, 12.4, 1.15], [-0.45, 9, 1.35, 0.94, 11.2, 1.2]].forEach(function (band, b) {
for (let i = 0; i < 7; i++) {
const az = ((i + b * 0.37) / 7) * Math.PI * 2 + band[2];
const rr = band[4] * Math.cos(band[0]) * (0.9 + 0.2 * ((i * 5 + b * 3) % 4) / 3);
const y = band[4] * Math.sin(band[0]) * (0.88 + 0.24 * ((i + b) % 3) / 2);
const size = band[5] * (0.55 + 0.9 * ((i * 3 + b) % 5) / 4);
const pow = band[1] * (0.7 + 0.6 * ((i + 2 * b) % 3) / 2);
glow(Math.cos(az) * rr, y, Math.sin(az) * rr, size, pow, band[3]);
}
});
[[0.75, 46, 0.2], [0.35, 52, 1.9], [-0.1, 44, 3.6], [-0.5, 40, 5.2]].forEach(function (p) {
[0, 2.1].forEach(function (off) {
const az = p[2] + off;
const rr = 12 * Math.cos(p[0]);
glow(Math.cos(az) * rr, 12 * Math.sin(p[0]), Math.sin(az) * rr, 0.3, p[1], 1);
});
});
return s;
}
api.stage = function (canvas) {
const cv = document.createElement('canvas');
cv.width = 512;
cv.height = 136;
const c = cv.getContext('2d');
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
api.texture = function (renderer) {
const t0 = performance.now();
const pmrem = new T.PMREMGenerator(renderer);
const rt = pmrem.fromScene(studio(), 0.02);
pmrem.dispose();
api.lastMs = Math.round(performance.now() - t0);
return rt.texture;
};
window.GEM_ENV = api;
})();
