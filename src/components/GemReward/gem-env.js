/* ADAM/SHARED — src/components/GemReward/gem-env.js · procedural studio environment */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · PMREM env builder (Task 22).
// — Env: near-black shell + a ring tent of small bright emitters (4 bands x 7 azimuths) —
// —      plus dim broad fill; HDR values >1 survive because PMREM renders with NoToneMapping —
// — Why small and many: a facet only glints when its mirror direction finds a source, so the —
// —      tent must cover the sphere; a few big panels just light every facet flat —
// Export map: GEM_ENV.texture(renderer) → PMREM texture for scene.environment · GEM_ENV.lastMs (stage/caustic textures live in gem-textures.js)
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
api.dispersion = function (src, spread) {
const d = spread || 7;
const lo = (1 - d / 100).toFixed(4), hi = (1 + d / 100).toFixed(4);
const call = function (i) { return 'getIBLVolumeRefraction(\n\t\tn, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,\n\t\tpos, modelMatrix, viewMatrix, projectionMatrix, material.ior * ' + i + ', material.thickness,\n\t\tmaterial.attenuationColor, material.attenuationDistance )'; };
const frag = '#ifdef USE_TRANSMISSION\n\tmaterial.transmission = transmission;\n\tmaterial.transmissionAlpha = 1.0;\n\tmaterial.thickness = thickness;\n\tmaterial.attenuationDistance = attenuationDistance;\n\tmaterial.attenuationColor = attenuationColor;\n\t#ifdef USE_TRANSMISSIONMAP\n\t\tmaterial.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;\n\t#endif\n\t#ifdef USE_THICKNESSMAP\n\t\tmaterial.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;\n\t#endif\n\tvec3 pos = vWorldPosition;\n\tvec3 v = normalize( cameraPosition - pos );\n\tvec3 n = inverseTransformDirection( normal, viewMatrix );\n\tvec4 t0 = ' + call(lo) + ';\n\tvec4 t1 = ' + call('1.0') + ';\n\tvec4 t2 = ' + call(hi) + ';\n\tvec4 transmitted = vec4( t0.r, t1.g, t2.b, t1.a );\n\tmaterial.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );\n\ttotalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );\n#endif';
return src.replace('#include <transmission_fragment>', frag);
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
