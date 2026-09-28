/* ADAM/SHARED — src/components/IllusionCube/illusion-overlay.js · floating text */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-3}] · Task 22: wordmark+texts.
// — Glyphs: white canvas alpha x0.9 (the decoded alphaOverride); chrome via photo —
// —   system mono stands in for Azeret Mono (recorded follow-up, not this phase) —
// Export map: ILLUSION_TEXT.alpha(i) · .subtext() · .blurb() · .build(tex) → group
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
const inks = [];
const MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace';
// — Canvas: white glyphs, transparent ground, repaintable on fonts.ready —
const sheet = function (w, h, paint) {
const cv = document.createElement('canvas');
cv.width = w;
cv.height = h;
const tex = new T.CanvasTexture(cv);
tex.colorSpace = T.SRGBColorSpace;
tex.anisotropy = 4;
const draw = function () { paint(cv.getContext('2d'), w, h); tex.needsUpdate = true; };
draw();
inks.push(draw);
return tex;
};
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
inks.forEach(function (d) { d(); });
});
// — Wordmark: five glyph canvases, 51.44 world pitch across the face —
const LETTERS = ['A', 'L', 'P', 'H', 'A'];
api.alpha = function (i) {
return sheet(128, 128, function (c) {
c.clearRect(0, 0, 128, 128);
c.fillStyle = 'rgba(255,255,255,0.9)';
c.font = '600 96px ' + MONO;
c.textAlign = 'center';
c.textBaseline = 'middle';
c.fillText(LETTERS[i], 64, 70);
});
};
// — Subtext and blurb rows —
api.subtext = function () {
return sheet(512, 64, function (c) {
c.clearRect(0, 0, 512, 64);
c.fillStyle = 'rgba(255,255,255,0.9)';
c.font = '500 36px ' + MONO;
c.textAlign = 'center';
c.textBaseline = 'middle';
c.fillText('data in here don\'t lie', 256, 34);
});
};
api.blurb = function () {
return sheet(512, 64, function (c) {
c.clearRect(0, 0, 512, 64);
c.fillStyle = 'rgba(255,255,255,0.9)';
c.font = '600 34px system-ui,sans-serif';
c.textAlign = 'center';
c.textBaseline = 'middle';
c.fillText('Only CRM stack you need', 256, 34);
});
};
// — Material: chrome sample, alpha-gated for the reveal via uniforms.uAlpha —
const chrome = function (tex, alpha) {
const m = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
m.opacity = 1;
m.uniforms = { uAlpha: { value: alpha } };
m.onBeforeCompile = function (s) {
s.uniforms.uAlpha = m.uniforms.uAlpha;
s.fragmentShader = s.fragmentShader.replace('void main() {', 'uniform float uAlpha;\nvoid main() {');
s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= uAlpha;');
};
return m;
};
// — Build: wordmark row, subtext, hidden blurb —
api.build = function (tex) {
const group = new T.Group();
for (let i = 0; i < 5; i++) {
const mesh = new T.Mesh(new T.PlaneGeometry(40, 40), chrome(api.alpha(i), 1));
mesh.position.set((i - 2) * 51.44, 130, 102);
mesh.renderOrder = 5;
group.add(mesh);
}
const sub = new T.Mesh(new T.PlaneGeometry(120, 15), chrome(api.subtext(), 0.6));
sub.position.set(0, 100, 102);
sub.renderOrder = 5;
group.add(sub);
const blurb = new T.Mesh(new T.PlaneGeometry(120, 15), chrome(api.blurb(), 0));
blurb.position.set(0, 84, 102);
blurb.renderOrder = 5;
group.add(blurb);
group.userData.blurb = blurb;
return group;
};
window.ILLUSION_TEXT = api;
})();
