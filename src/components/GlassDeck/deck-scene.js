/* ADAM/SHARED — src/components/GlassDeck/deck-scene.js · stage: plates + wordmark + camera */
// [plan:2026-10-05_000000-lump-sum-builds.md#phase-1] · (Task 46).
// — Plates: alpha glass, never transmission — r160's pass captures only opaque geometry and —
// —         would swallow the stacked plates; the hierarchy is an opacity ladder instead —
// — Tint: read off :root tokens; the env is the gem studio so the family matches —
// — Camera: azimuth locked at 45° (the diamond read); stations move elevation + dolly only —
// Export map: DECK_SCENE.stage(renderer, aspect) → rig · lay(rig, k) · tok(name, fb) · AZ · STATIONS
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
const FOV = 24;
const css = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
api.tok = function (n, fb) { return css(n) || fb; };
api.AZ = Math.PI / 4;
api.LOOK = -0.118;
api.STATIONS = { contact: { el: 39, p: 0.925 }, read: { el: 35, p: 0.92 }, settle: { el: 30, p: 0.93 } };
const plate = function (hex, opacity, rough, glow, env, cc, ehex, spec) {
return new T.MeshPhysicalMaterial({
color: new T.Color(hex), metalness: 0, roughness: rough, ior: 1.45,
transparent: true, opacity: opacity, depthWrite: false,
clearcoat: cc, clearcoatRoughness: 0.05, envMapIntensity: env,
specularIntensity: spec == null ? 1 : spec,
emissive: new T.Color(ehex || hex), emissiveIntensity: glow,
});
};
api.lay = function (rig, k) {
const ts = window.DECK_FORM.THICKS, n = ts.length, g = window.DECK_FORM.GAP * k;
let H = g * (n - 1);
for (let i = 0; i < n; i++) H += ts[i];
rig.H = H;
let y = -H / 2;
for (let i = 0; i < n; i++) {
y += ts[i] / 2;
rig.slabs[i].position.y = y;
y += ts[i] / 2 + g;
}
rig.text.plane.position.y = H / 2 + 0.006;
};
api.stage = function (renderer, aspect) {
const scene = new T.Scene();
scene.background = new T.Color(api.tok('--primitive-sapphire-ui-50', 0xf5f9ff));
if (window.GEM_ENV) scene.environment = window.GEM_ENV.texture(renderer);
const W = window.DECK_FORM.W, ts = window.DECK_FORM.THICKS;
const group = new T.Group();
const mats = [
plate(api.tok('--primitive-sapphire-ui-400', 0x218aea), 0.995, 0.16, 1, 0, 0.05, api.tok('--primitive-sapphire-ui-500', 0x1666af), 0.1),
plate(api.tok('--primitive-sapphire-ui-400', 0x218aea), 0.42, 0.2, 0.3, 0.7, 1),
plate(api.tok('--primitive-sapphire-ui-300', 0x7cbefb), 0.1, 0.24, 0.08, 0.4, 1),
];
const slabs = mats.map(function (m, i) {
const mesh = new T.Mesh(window.DECK_FORM.slab(W, ts[i]), m);
mesh.renderOrder = 2 + i;
group.add(mesh);
return mesh;
});
const sheet = window.DECK_TEXT.make(1024, 1024);
const tex = new T.CanvasTexture(sheet.canvas);
tex.colorSpace = T.SRGBColorSpace;
tex.anisotropy = 4;
const plane = new T.Mesh(
new T.PlaneGeometry(W * 0.94, W * 0.94),
new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, color: new T.Color(api.tok('--primitive-sapphire-ui-50', 0xf5f9ff)) })
);
plane.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
plane.position.y = 0.006;
plane.renderOrder = 6;
group.add(plane);
scene.add(group);
const key = new T.DirectionalLight(0xffffff, 0.95);
key.position.set(2.4, 6, -2.6);
const fill = new T.DirectionalLight(0xdfe9ff, 0.4);
fill.position.set(-3.2, 3, 2.6);
scene.add(key, fill, new T.AmbientLight(0xffffff, 0.35));
const tan = Math.tan((FOV * Math.PI) / 360);
const dist = Math.max(0.78 / (0.8 * tan * Math.max(aspect, 0.5)), 1.05);
scene.fog = new T.Fog(scene.background, dist * 1.25, dist * 2.5);
const camera = new T.PerspectiveCamera(FOV, aspect, 0.1, 60);
const rig = {
scene: scene, camera: camera, group: group, slabs: slabs, dist: dist, fov: FOV,
text: { canvas: sheet.canvas, paint: sheet.paint, tex: tex, plane: plane },
cam: { el: 35, p: 0.92 }, target: { el: 35, p: 0.92 }, mode: 'hold', t: 0, clock: 0,
};
api.lay(rig, 1);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
sheet.paint('Data', 'Utility');
tex.needsUpdate = true;
});
return rig;
};
window.DECK_SCENE = api;
})();
