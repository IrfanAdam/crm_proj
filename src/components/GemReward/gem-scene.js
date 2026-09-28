/* ADAM/SHARED — src/components/GemReward/gem-scene.js · gem cut → camera/surface rig */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-7] · camera/fit/surface builder (Task 22) + bare-stage opt-out.
// — Env: gem-env.js supplies the PMREM studio; degrade to key+ambient if it is absent —
// — Surface: MeshPhysicalMaterial flatShading; ior per stone; transmission on GPU, off on software (?gem=high) —
// — Cut: faces rewound outward (no winding hole) · Frame: fills FILL of the stage, centred, dropY re-aims it —
// Export map: GEM_SCENE.geometry(cut) · surface(color, soft, ior) · inner(...) · ghost(...) internal shells · frame(rig) drop · stage(renderer, color, cut, aspect, ior) → rig (software-GL detect lives in gem-env.js)
(function () {
const api = {};
const FILL = 0.75;
const FOV = 32;
window.GEM_SCENE = api;
if (!window.THREE) return;
const T = window.THREE;
api.geometry = function (cut) {
const p = cut.positions;
const v = [];
const fv = [];
cut.cells.forEach(function (c, ci) {
const a = p[c[0]], b = p[c[1]], d = p[c[2]];
if (!a || !b || !d) return;
const nx = (b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]);
const ny = (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]);
const nz = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
const ox = (a[0] + b[0] + d[0]) / 3, oy = (a[1] + b[1] + d[1]) / 3, oz = (a[2] + b[2] + d[2]) / 3;
const f = nx * ox + ny * oy + nz * oz < 0 ? [a, d, b] : [a, b, d];
const z = 0.8 + 0.4 * (Math.sin(ci * 12.9898) * 43758.5453 % 1 + 1) % 1;
f.forEach(function (q) { v.push(q[0], q[1], q[2]); fv.push(z, z, z); });
});
const geo = new T.BufferGeometry();
geo.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
geo.setAttribute('color', new T.BufferAttribute(new Float32Array(fv), 3));
geo.computeVertexNormals();
geo.computeBoundingBox();
return geo;
};
api.surface = function (color, soft, ior) {
const m = new T.MeshPhysicalMaterial({ color: color, metalness: 0, roughness: 0.06, ior: ior || 2.4, clearcoat: 1, clearcoatRoughness: 0.04, flatShading: true, envMapIntensity: 1.6, emissive: color.clone().multiplyScalar(0.12), iridescence: 0.45, iridescenceIOR: 1.9, iridescenceThicknessRange: [120, 640], sheen: 0.12, sheenRoughness: 0.25, sheenColor: new T.Color(1, 1, 1), vertexColors: true });
m.onBeforeCompile = function (s) {
s.fragmentShader = s.fragmentShader.replace('float roughnessFactor = roughness;', 'float roughnessFactor = roughness * (0.72 + 0.56 * vColor.r);');
if (window.GEM_SHADER && window.GEM_SHADER.dispersion) s.fragmentShader = window.GEM_SHADER.dispersion(s.fragmentShader);
};
if (!soft) {
m.transmission = 0.95;
m.thickness = 0.9;
m.attenuationColor = color.clone().lerp(new T.Color(1, 1, 1), 0.15);
m.attenuationDistance = 0.6;
m.onBeforeCompile = function (s) {
if (window.GEM_SHADER && window.GEM_SHADER.dispersion) s.fragmentShader = window.GEM_SHADER.dispersion(s.fragmentShader);
};
}
return m;
};
api.inner = function (color, ior, side, opacity) {
const b = new T.MeshPhysicalMaterial({ color: color, metalness: 0, roughness: 0.05, ior: ior || 2.4, flatShading: true, side: side || T.BackSide, transparent: true, opacity: opacity || 0.72, blending: T.AdditiveBlending, depthWrite: false, envMapIntensity: 1.5, emissive: color.clone().multiplyScalar(0.18), vertexColors: true });
b.onBeforeCompile = function (s) { s.fragmentShader = s.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor;'); };
return b;
};
api.ghost = function (geo, color, ior, side, scale, opacity) { const m = new T.Mesh(geo, api.inner(color, ior, side, opacity)); m.renderOrder = -1; m.scale.setScalar(scale); return m; };
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
const key = new T.DirectionalLight(0xfff4e6, 1.2);
const cross = new T.DirectionalLight(0xdce8ff, 0.55);
key.position.set(3, 5, 4);
cross.position.set(-4, 3, -2);
scene.add(key, cross, new T.AmbientLight(0xffffff, 0.12));
const floors = window.GEM_BARE ? window.GEM_BARE.dress(T, scene, geo, bb, h, rad, color, bare, gscale, cy * gscale) : null;
const group = new T.Group();
const far = api.ghost(geo, color, ior, T.BackSide, 0.955, 0.66);
const near = api.ghost(geo, color, ior, T.FrontSide, 0.9, 0.26);
const body = new T.Mesh(geo, api.surface(color, soft, ior));
group.add(far, near, body);
scene.add(group);
if (bare) group.scale.setScalar(gscale);
const rig = { scene: scene, camera: camera, group: group, stageBg: scene.background, floors: floors, mats: [body.material, far.material, near.material], baseCamY: cy + h * 0.16, baseLookY: cy - h * 0.02, dropY: 0 };
api.frame(rig);
return rig;
};
})();
