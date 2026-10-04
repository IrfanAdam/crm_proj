/* ADAM/SHARED — src/components/GemReward/gem-scene.js · gem cut → camera/surface rig */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · camera/fit/surface builder (Task 22) + bare-stage opt-out.
// — Env: gem-env.js supplies the PMREM studio; degrade to key+ambient if it is absent —
// — Surface: MeshPhysicalMaterial flatShading; ior per stone; transmission on GPU, off on software (?gem=high) —
// — Optics: one uniform facet (no per-tri tint); a BackSide far-side proxy (gem-shader.farside) shades the —
// —        interior with real refraction/TIR and the body samples it through three's transmission RT. No overlays. —
// — Cut: faces rewound outward (no winding hole) · Frame: fills FILL of the stage, centred, dropY re-aims it —
// Export map: GEM_SCENE.geometry(cut) · surface(color, soft, ior) · frame(rig) drop · stage(renderer, color, cut, aspect, ior) → rig (software-GL detect lives in gem-env.js)
(function () {
const api = {};
const FILL = 0.75;
const RAMP = function (t, T) {
const lite = t.clone().lerp(new T.Color(1, 1, 1), 0.62), deep = t.clone().multiply(new T.Color(0.3, 0.35, 0.7));
return { lite: lite, mid: t, deep: deep, pink: lite.clone().lerp(new T.Color(1, 0.62, 0.85), 0.75) };
};
const FOV = 32;
window.GEM_SCENE = api;
if (!window.THREE) return;
const T = window.THREE;
api.geometry = function (cut) {
const p = cut.positions;
const v = [];
cut.cells.forEach(function (c) {
const a = p[c[0]], b = p[c[1]], d = p[c[2]];
if (!a || !b || !d) return;
const nx = (b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]);
const ny = (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]);
const nz = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
const ox = (a[0] + b[0] + d[0]) / 3, oy = (a[1] + b[1] + d[1]) / 3, oz = (a[2] + b[2] + d[2]) / 3;
const s = nx * ox + ny * oy + nz * oz < 0 ? -1 : 1, f = s < 0 ? [a, d, b] : [a, b, d];
f.forEach(function (q) { v.push(q[0], q[1], q[2]); });
});
const geo = new T.BufferGeometry();
geo.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
geo.computeVertexNormals();
geo.computeBoundingBox();
return geo;
};
api.surface = function (color, soft, ior) {
const white = new T.Color(1, 1, 1);
const m = new T.MeshPhysicalMaterial({ color: color.clone().lerp(white, 0.45), metalness: 0, roughness: 0.06, ior: ior || 2.4, flatShading: true, envMapIntensity: 1.6, dithering: true });
if (!soft) {
m.transmission = 1.0;
m.thickness = 0.9;
m.attenuationColor = color.clone().lerp(white, 0.1);
m.attenuationDistance = 1.45;
m.onBeforeCompile = function (s) {
if (window.GEM_SHADER && window.GEM_SHADER.dispersion) s.fragmentShader = window.GEM_SHADER.dispersion(s.fragmentShader);
s.uniforms.bgTex = (m.userData.bgU = { value: null });     // the actual backdrop, sampled through the body (demo bg)
s.uniforms.bgOn = (m.userData.bgOnU = { value: 0 });
};
}
return m;
};
api.frame = function (rig) {
const drop = rig.dropY || 0;
rig.camera.position.set(0, rig.baseCamY + drop, rig.camera.position.z);
rig.camera.lookAt(0, rig.baseLookY + drop, 0);
};
api.stage = function (renderer, color, cut, aspect, ior) {
const geo = api.geometry(cut);
const bb = geo.boundingBox;
const h = Math.max(bb.max.y - bb.min.y, 0.001);
const cy = (bb.max.y + bb.min.y) / 2;
const rad = Math.max(Math.abs(bb.max.x), Math.abs(bb.min.x), Math.abs(bb.max.z), Math.abs(bb.min.z));
const bare = renderer.domElement.dataset.gemStage === 'off';
const gscale = bare ? parseFloat(renderer.domElement.dataset.gemScale) || 1 : 1;
const tan = Math.tan((FOV * Math.PI) / 360);
const dist = Math.max(h / FILL / (2 * tan), rad / (0.9 * tan * Math.max(aspect, 0.4)));
const camera = new T.PerspectiveCamera(FOV, aspect, 0.1, 60);
camera.position.set(0, cy + h * 0.16, dist);
camera.lookAt(0, cy - h * 0.02, 0);
const scene = new T.Scene();
if (window.GEM_ENV) scene.environment = window.GEM_ENV.texture(renderer);
if (window.GEM_TEXTURES && window.GEM_TEXTURES.stage && !bare) scene.background = window.GEM_TEXTURES.stage(renderer.domElement);
const soft = !/(\?|&)gem=high/.test(window.location.search) && (!window.GEM_ENV || window.GEM_ENV.soft(renderer));
const key = new T.DirectionalLight(0xfffdf8, 1.2);
const cross = new T.DirectionalLight(0xdce8ff, 0.28);
const bounce = new T.DirectionalLight(0xfffaf4, 0.5);
key.position.set(3, 5, 4);
cross.position.set(-4, 3, -2);
bounce.position.set(-1, -4, 3);
scene.add(key, cross, bounce, new T.AmbientLight(0xffffff, 0.10));
const floors = window.GEM_BARE ? window.GEM_BARE.dress(T, scene, geo, bb, h, rad, color, bare, gscale, cy * gscale, cut) : null;
const group = new T.Group();
const body = new T.Mesh(geo, api.surface(color, soft, ior));
group.add(body);
const proxy = window.GEM_SHADER && window.GEM_SHADER.farside ? new T.Mesh(geo, window.GEM_SHADER.farside({ envMap: scene.environment, ior: ior || 2.4, tint: color, ramp: RAMP(color, T), stageTex: (scene.background && scene.background.isTexture) ? scene.background : null })) : null;
if (proxy) { proxy.scale.setScalar(0.997); group.add(proxy); }
scene.add(group);
if (bare) group.scale.setScalar(gscale);
const rig = { scene: scene, camera: camera, group: group, stageBg: scene.background, floors: floors, mats: [body.material].concat(proxy ? [proxy.material] : []), baseCamY: cy + h * 0.16, baseLookY: cy - h * 0.02, dropY: 0 };
api.frame(rig);
return rig;
};
})();
