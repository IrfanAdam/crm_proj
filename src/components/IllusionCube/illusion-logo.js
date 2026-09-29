/* ADAM/SHARED — src/components/IllusionCube/illusion-logo.js · vector wordmark */
// [plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-5}] · Task 15: six real shapes.
// — Fetch alpha-vectors.json once; per shape moveTo(p0) + C cn[i] cp[i+1] p[i+1] (modulo wrap) + Z —
// — Mesh route: THREE.Shape → ShapeGeometry, bezier outlines (not font text); counters ride the loop —
// — Anchor (−73, 75.39, 101.09399) scale 0.04434023 +y no flip; per shape offsets x=shape.x, z=shape.z —
// Export map: ILLUSION_LOGO.build(tex) → Group|null · .group() · .when(cb) · .ok()
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
const URL = '/cube-illusion/alpha/alpha-vectors.json';
const POS = [-72.99999999999999, 75.39, 101.0939895519962];
const SCALE = 0.044340229494009085;
const WHITE = function () {
const S = window.ILLUSION_SCENE;
return new T.Color(S && S.tok ? S.tok('--primitive-gray-white', 0xffffff) : 0xffffff);
};
let data = null, group = null, dead = false, tex = null;
const subs = [];
api.group = function () { return group; };
api.ok = function () { return !!group; };
api.when = function (cb) { if (group) cb(group); else if (!dead) subs.push(cb); };
// — Points verbatim: control in = cn[i], control out = cp[i+1], wrap with modulo — never flip —
const shapeOf = function (pts) {
const s = new T.Shape();
s.moveTo(pts[0].p[0], pts[0].p[1]);
for (let i = 0; i < pts.length; i++) {
const a = pts[i], b = pts[(i + 1) % pts.length];
s.bezierCurveTo(a.cn[0], a.cn[1], b.cp[0], b.cp[1], b.p[0], b.p[1]);
}
s.closePath();
return s;
};
// — Logo stack: white α0.9 core under a subtle photo-matcap sheen (uMix 0 without a photo) —
const VERT = ['varying vec3 vN;',
'void main(){vN=normalize(normalMatrix*normal);',
'gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'].join('\n');
const FRAG = ['uniform sampler2D uTex; uniform float uMix; uniform float uAlpha; uniform vec3 uWhite;',
'varying vec3 vN;',
'void main(){',
'vec3 mc=texture2D(uTex,matUV(normalize(vN).xy,0.0)).rgb;',
'gl_FragColor=vec4(mix(uWhite,mc,uMix),uAlpha);',
'#include <colorspace_fragment>',
'}'].join('\n');
const matOf = function (photo) {
const G = window.ILLUSION_GL || {};
const U = { uTex: { value: photo || null }, uMix: { value: photo ? 0.18 : 0 } };
U.uWhite = { value: WHITE() };
U.uAlpha = { value: 0.9 };
const m = new T.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: (G.MATCAP || '') + FRAG,
transparent: true, depthWrite: false });
m.toneMapped = false;
return m;
};
// — One mesh per decoded shape, in child order, at its authored x/z offset —
const make = function () {
const g = new T.Group();
g.position.set(POS[0], POS[1], POS[2]);
g.scale.setScalar(SCALE);
const mat = matOf(tex && tex.photo);
for (let i = 0; i < data.shapes.length; i++) {
const sh = data.shapes[i];
const mesh = new T.Mesh(new T.ShapeGeometry(shapeOf(sh.points)), mat);
mesh.position.set(sh.x, 0, sh.z);
mesh.renderOrder = 5;
g.add(mesh);
}
return g;
};
const wire = function () {
if (!group) return;
const cbs = subs.splice(0, subs.length);
cbs.forEach(function (cb) { cb(group); });
};
api.build = function (t) {
tex = t || tex;
if (!group && data) group = make();
wire();
return group;
};
fetch(URL).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
if (!d || !d.shapes || !d.shapes.length) { dead = true; return; }
data = d;
if (!group) group = make();
wire();
}).catch(function () { dead = true; });
window.ILLUSION_LOGO = api;
})();
