/* ADAM/SHARED — src/components/IllusionCube/illusion-overlay.js · floating text */
// [plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-5}] · Tasks 15-16: decoded anchors.
// — Fonts: the scene's own Inter 600 + Azeret Mono 500 via FontFace(/fonts/…), repaint on fonts.ready —
// — Flush-left rule: the logo group, the subtext row and the blurb row all start at world x −73.0 —
// — Canvas letters stay as the no-JSON fallback; the blurb keeps userData.blurb + uniforms.uAlpha — · subtext ink = decoded navy (Subtext Material colour layer, α0.6 → 0.85 painted)
// Export map: ILLUSION_TEXT.alpha(i) · .subtext() · .blurb() · .build(tex) → group
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
const inks = [];
const MONO = '"Azeret Mono",ui-monospace,SFMono-Regular,Menlo,monospace';
const SANS = 'Inter,system-ui,sans-serif';
// — Decoded boxes + centre anchors (left edge = centre x − box/2 = −73.0 for both rows) —
const SUB = { box: [136.6592, 14.533], pos: [-4.67042297636263, 18.733398437500014, 101.0939895519962] };
const BLB = { box: [84.8305, 47.8768], pos: [-30.58474375808499, 110.03010329138462, 98.66477613230134] };
const INK = function () { const S = window.ILLUSION_SCENE; return new T.Color(S && S.tok ? S.tok('--primitive-gray-white', 0xffffff) : 0xffffff).getStyle(); };
const INK_SUB = function () { const S = window.ILLUSION_SCENE; return new T.Color(S && S.tok ? S.tok('--primitive-illusion-ink', 0x263b51) : 0x263b51).getStyle(); };
// — Faces: the real files in public/fonts (mirror-served); repaint the sheets when they land —
const face = function (n, u, w) {
if (!window.FontFace || !document.fonts || !document.fonts.add) return;
const f = new FontFace(n, 'url(' + u + ')', { weight: String(w) });
document.fonts.add(f);
if (f.load) f.load().catch(function () {});
};
face('Inter', '/fonts/inter-600.ttf', 600);
face('Azeret Mono', '/fonts/azeret-mono-500.ttf', 500);
// — Canvas sheet: white ink on clear ground, centred text, repaintable —
const sheet = function (w, h, paint, ink) {
const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
const tex = new T.CanvasTexture(cv);
tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
const draw = function () {
const c = cv.getContext('2d');
c.clearRect(0, 0, w, h);
c.fillStyle = (ink || INK)(); c.textAlign = 'center'; c.textBaseline = 'middle';
paint(c, w, h);
tex.needsUpdate = true;
};
draw();
inks.push(draw);
return tex;
};
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { inks.forEach(function (d) { d(); }); });
// — Wordmark fallback: five glyph canvases, only when the vector JSON never lands —
const LETTERS = 'ALPHA';
api.alpha = function (i) {
return sheet(128, 128, function (c) { c.font = '600 96px ' + MONO; c.fillText(LETTERS[i], 64, 70); });
};
// — Subtext: Azeret Mono 500, tracking −0.04 em, left inks on the box edge (x 0 ⇒ world −73.0) —
api.subtext = function () {
return sheet(1373, 146, function (c) {
c.font = '500 102px ' + MONO; try { c.letterSpacing = '-4.1px'; } catch (e) {}
c.textAlign = 'left'; c.fillText("data in here don't lie", 0, 73);
}, INK_SUB);
};
// — Blurb: Inter 600, two lines, pitch = box/2 (287px); ink calibrated to the 84.83 box width —
api.blurb = function () {
return sheet(1018, 575, function (c) {
c.font = '600 104px ' + SANS; c.textAlign = 'left';
c.fillText('Only CRM stack you', 0, 144);
c.fillText('need', 0, 431);
});
};
// — Material: chrome sample, alpha-gated for the reveal via uniforms.uAlpha —
const chrome = function (tex, alpha) {
const m = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
m.uniforms = { uAlpha: { value: alpha } };
m.onBeforeCompile = function (s) {
s.uniforms.uAlpha = m.uniforms.uAlpha;
s.fragmentShader = s.fragmentShader.replace('void main() {', 'uniform float uAlpha;\nvoid main() {');
s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= uAlpha;');
};
return m;
};
// — Row mesh: decoded box on the decoded centre anchor —
const row = function (name, tex, box, pos, alpha) {
const m = new T.Mesh(new T.PlaneGeometry(box[0], box[1]), chrome(tex, alpha));
m.name = name; m.position.set(pos[0], pos[1], pos[2]); m.renderOrder = 5;
return m;
};
// — Build: vector wordmark group (else canvas letters), subtext row, hidden blurb —
api.build = function (tex) {
const group = new T.Group();
const hold = new T.Group(); group.add(hold);
const logo = window.ILLUSION_LOGO;
const wire = function (g) { if (!g) return; while (hold.children.length) hold.remove(hold.children[0]); hold.add(g); };
if (logo && logo.build) wire(logo.build(tex));
if (logo && logo.when) logo.when(wire);
if (!hold.children.length) for (let i = 0; i < 5; i++) {
const mesh = new T.Mesh(new T.PlaneGeometry(40, 40), chrome(api.alpha(i), 0.9));
mesh.position.set((i - 2) * 51.44, 130, 102); mesh.renderOrder = 5; hold.add(mesh);
}
group.add(row('subtext', api.subtext(), SUB.box, SUB.pos, 0.85)); const blurb = row('blurb', api.blurb(), BLB.box, BLB.pos, 0);
group.add(blurb); group.userData.blurb = blurb;
return group;
};
window.ILLUSION_TEXT = api;
})();
