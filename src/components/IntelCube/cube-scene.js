/* ADAM/SHARED — src/components/IntelCube/cube-scene.js · block rig: shell + core + camera */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-5] · stage builder (Task 20).
// — Shell: alpha glass, not transmission — r160's transmission pass captures only opaque geometry, —
// —        so a transmissive shell would swallow the glowing core; alpha plus an explicit render —
// —        order (halos → cores → motes → shell) keeps the interior alive behind the glass —
// — Tint: colours are read off :root tokens · env is the gem studio so the family matches —
// Export map: CUBE_SCENE.stage(renderer, aspect) → rig · glass(opacity) · tok(name, fallback)
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
const FOV = 30;
const FILL = 0.7;
const B = { w: 1, bh: 0.74, ph: 0.26, gap: 0.012, br: 0.085, pr: 0.055 };
const css = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
api.tok = function (n, fb) { return css(n) || fb; };
api.glass = function (opacity) {
const m = new T.MeshPhysicalMaterial({
color: new T.Color(api.tok('--primitive-sapphire-ui-300', 0x7cbefb)),
metalness: 0, roughness: 0.038, ior: 1.5, transparent: true, opacity: opacity,
clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 2.8, depthWrite: false,
iridescence: 1, iridescenceIOR: 1.9, iridescenceThicknessRange: [110, 700],
});
return m;
};
api.stage = function (renderer, aspect) {
const scene = new T.Scene();
if (window.GEM_ENV) scene.environment = window.GEM_ENV.texture(renderer);
const total = B.bh + B.gap + B.ph;
const tok = {
cool: api.tok('--primitive-sapphire-ui-400', 0x218aea),
core: api.tok('--primitive-red-beryl-400', 0xea005e),
warm: api.tok('--primitive-orange-400', 0xff7a2f),
violet: api.tok('--primitive-amethyst-400', 0xa54cff),
mote: api.tok('--primitive-sapphire-ui-100', 0xebf5fe),
};
const group = new T.Group();
const body = new T.Mesh(window.CUBE_FORM.block(B.w, B.bh, B.w, B.br, 40), api.glass(0.28));
body.position.y = -total / 2 + B.ph + B.gap + B.bh / 2;
const plinth = new T.Mesh(window.CUBE_FORM.block(0.94, B.ph, 0.94, B.pr, 24), api.glass(0.34));
plinth.position.y = -total / 2 + B.ph / 2;
body.renderOrder = 4;
plinth.renderOrder = 4;
group.add(body, plinth);
const main = new T.Mesh(window.CUBE_FORM.blob(0.3, 4), window.CUBE_CORE.blob([tok.cool, tok.core, tok.warm], { amp: 0.14, freq: 1.25, seed: 3.1, alpha: 0.95 }));
main.position.set(0.08, 0.05, 0.02);
main.renderOrder = 2;
const small = new T.Mesh(window.CUBE_FORM.blob(0.17, 3), window.CUBE_CORE.blob([tok.cool, tok.violet, tok.core], { amp: 0.08, freq: 2.0, seed: 7.4, alpha: 0.5 }));
small.position.set(-0.16, 0.2, -0.12);
small.renderOrder = 2;
group.add(main, small);
if (window.GEM_TEXTURES) {
const ground = new T.Mesh(new T.PlaneGeometry(2.2, 1.4), new T.MeshBasicMaterial({ map: window.GEM_TEXTURES.shadow(), transparent: true, opacity: 0.5, depthWrite: false }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -total / 2 - 0.006;
scene.add(ground);
}
scene.add(group);
const key = new T.DirectionalLight(0xffffff, 1.0);
key.position.set(3, 5, 4);
const cross = new T.DirectionalLight(0xdce8ff, 0.5);
cross.position.set(-4, 3, -2);
scene.add(key, cross, new T.AmbientLight(0xffffff, 0.35));
const h = total * 1.38;
const rad = 0.6;
const tan = Math.tan((FOV * Math.PI) / 360);
const dist = Math.max(h / FILL / (2 * tan), rad / (0.72 * tan * Math.max(aspect, 0.5)));
const camera = new T.PerspectiveCamera(FOV, aspect, 0.1, 60);
camera.position.set(0, dist * 0.44, dist);
camera.lookAt(0, 0.02, 0);
const rig = { scene: scene, camera: camera, group: group, fov: FOV, cores: [], halos: [], motes: null, clock: 0 };
rig.cores.push({ mesh: main, mat: main.material, phase: 0 });
rig.cores.push({ mesh: small, mat: small.material, phase: 11 });
const sprite = window.CUBE_CORE.sprite();
const halo = function (hex, scale, x, y, z, op, phase) {
const s = new T.Sprite(new T.SpriteMaterial({ map: sprite, color: new T.Color(hex), transparent: true, opacity: op, depthWrite: false, toneMapped: false }));
s.scale.set(scale, scale, 1);
s.position.set(x, y, z);
s.renderOrder = 1;
group.add(s);
rig.halos.push({ sprite: s, op: op, phase: phase });
};
halo(tok.core, 0.62, 0.11, 0.07, 0.12, 0.34, 0);
halo(tok.warm, 0.42, -0.1, -0.12, 0.08, 0.3, 2.1);
halo(tok.cool, 0.88, -0.02, 0.1, -0.1, 0.22, 4.2);
const motes = new T.Points(window.CUBE_FORM.motes(40), window.CUBE_CORE.motes(tok.mote));
motes.renderOrder = 3;
group.add(motes);
rig.motes = motes;
return rig;
};
window.CUBE_SCENE = api;
})();
