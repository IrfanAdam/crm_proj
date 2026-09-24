/* ADAM/SHARED — src/components/GemReward/gem-scene.js · gem cut → camera/surface rig */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · camera/fit/surface builder (Task 22).
// — Env: gem-env.js supplies the PMREM studio; degrade to key+ambient if it is absent —
// — Surface: MeshPhysicalMaterial flatShading; ior per stone from CATEGORIES; transmission on GPU, off on software (?gem=high) —
// — Cut: faces rewound outward, so no GEM_CUT winding can punch a hole in a facet —
// — Frame: camera sits so the gem fills FILL of the stage height, centred, stage stays 140px —
// Export map: GEM_SCENE.soft(renderer) · geometry(cut) · surface(color, soft, ior) · inner(color, ior, side, opacity) · ghost(geo, color, ior, side, scale, opacity) internal shells · stage(renderer, color, cut, aspect, ior)
(function () {
const api = {};
const FILL = 0.75;
const FOV = 32;
api.soft = function (renderer) {
try {
const gl = renderer.getContext();
const dbg = gl.getExtension('WEBGL_debug_renderer_info');
const name = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
return /swiftshader|llvmpipe|software|basic render/i.test(String(name));
} catch (e) { return true; }
};
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
const f = nx * ox + ny * oy + nz * oz < 0 ? [a, d, b] : [a, b, d];
f.forEach(function (q) { v.push(q[0], q[1], q[2]); });
});
const geo = new T.BufferGeometry();
geo.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
geo.computeVertexNormals();
geo.computeBoundingBox();
return geo;
};
api.surface = function (color, soft, ior) {
const m = new T.MeshPhysicalMaterial({ color: color, metalness: 0, roughness: 0.06, ior: ior || 2.4, clearcoat: 1, clearcoatRoughness: 0.04, flatShading: true, envMapIntensity: 1.6, emissive: color.clone().multiplyScalar(0.12), iridescence: 0.45, iridescenceIOR: 1.9, iridescenceThicknessRange: [120, 640], sheen: 0.12, sheenRoughness: 0.25, sheenColor: new T.Color(1, 1, 1) });
if (!soft) {
m.transmission = 0.95;
m.thickness = 0.9;
m.attenuationColor = color.clone().lerp(new T.Color(1, 1, 1), 0.3);
m.attenuationDistance = 0.6;
m.onBeforeCompile = function (s) {
s.fragmentShader = s.fragmentShader.replace(/vec4 transmitted = getIBLVolumeRefraction\([\s\S]*?\);/, 'vec4 t0 = getIBLVolumeRefraction(n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90, pos, modelMatrix, viewMatrix, projectionMatrix, material.ior * 0.975, material.thickness, material.attenuationColor, material.attenuationDistance);\nvec4 t1 = getIBLVolumeRefraction(n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90, pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness, material.attenuationColor, material.attenuationDistance);\nvec4 t2 = getIBLVolumeRefraction(n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90, pos, modelMatrix, viewMatrix, projectionMatrix, material.ior * 1.025, material.thickness, material.attenuationColor, material.attenuationDistance);\nvec4 transmitted = vec4(t0.r, t1.g, t2.b, t1.a);');
};
}
return m;
};
api.inner = function (color, ior, side, opacity) {
const b = new T.MeshPhysicalMaterial({ color: color, metalness: 0, roughness: 0.05, ior: ior || 2.4, flatShading: true, side: side || T.BackSide, transparent: true, opacity: opacity || 0.72, blending: T.AdditiveBlending, depthWrite: false, envMapIntensity: 1.5, emissive: color.clone().multiplyScalar(0.18) });
return b;
};
api.ghost = function (geo, color, ior, side, scale, opacity) { const m = new T.Mesh(geo, api.inner(color, ior, side, opacity)); m.renderOrder = -1; m.scale.setScalar(scale); return m; };
api.stage = function (renderer, color, cut, aspect, ior) {
const geo = api.geometry(cut);
const bb = geo.boundingBox;
const h = Math.max(bb.max.y - bb.min.y, 0.001);
const cy = (bb.max.y + bb.min.y) / 2;
const rad = Math.max(Math.abs(bb.max.x), Math.abs(bb.min.x), Math.abs(bb.max.z), Math.abs(bb.min.z));
const tan = Math.tan((FOV * Math.PI) / 360);
const dist = Math.max(h / FILL / (2 * tan), rad / (0.9 * tan * Math.max(aspect, 0.4)));
const camera = new T.PerspectiveCamera(FOV, aspect, 0.1, 60);
camera.position.set(0, cy + h * 0.16, dist);
camera.lookAt(0, cy - h * 0.02, 0);
const scene = new T.Scene();
if (window.GEM_ENV) scene.environment = window.GEM_ENV.texture(renderer);
if (window.GEM_TEXTURES && window.GEM_TEXTURES.stage) scene.background = window.GEM_TEXTURES.stage(renderer.domElement);
const soft = !/(\?|&)gem=high/.test(window.location.search) && api.soft(renderer);
const key = new T.DirectionalLight(0xfff4e6, 1.2);
key.position.set(3, 5, 4);
scene.add(key);
scene.add(new T.AmbientLight(0xffffff, 0.12));
if (window.GEM_TEXTURES && window.GEM_TEXTURES.caustic) {
const cm = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: window.GEM_TEXTURES.caustic(color), transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
cm.rotation.x = -Math.PI / 2;
cm.position.y = bb.min.y - h * 0.2;
cm.scale.setScalar(rad * 2.4);
cm.renderOrder = -1;
scene.add(cm);
}
const group = new T.Group();
group.add(api.ghost(geo, color, ior, T.BackSide, 0.955, 0.66));
group.add(api.ghost(geo, color, ior, T.FrontSide, 0.9, 0.26));
group.add(new T.Mesh(geo, api.surface(color, soft, ior)));
scene.add(group);
return { scene: scene, camera: camera, group: group, stageBg: scene.background };
};
})();
