/* ADAM/SHARED — src/components/GemReward/gem-shader.js · chromatic fire patch */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-4] · Task 30 · mirrors DISP in prototype/gems/gem_optics.py
// — three r160 has no `dispersion`, and onBeforeCompile hands the shader over with its `#include` —
// — directives UNRESOLVED, so the literal refraction call is not in the source yet — patching the —
// — include itself is the only hook that fires. —
// — WHAT WAS WRONG (measured): the old patch varied only the IOR handed to getIBLVolumeRefraction, —
// — whose sample source here is a render target holding the flat white/0.5 alpha clear (three fills —
// — it with OPAQUE objects only; the stage is scene.background and the ghosts/floors are —
// — transparent, so the card has none). That target reads lum 234 / chroma 1.2 — uniform white — so —
// — t0.r==t1.g==t2.b and the patch was a closed-form identity: no spread, sample count or weighting —
// — can separate a constant (spread 20-40 bit-identical to stock; >=60 degenerates to TIR/NaN; —
// — nine weighted samples = a uniform 7° global hue shift = the textbook "tint, not fire"). —
// — THE FIX: the only structured-chroma signal is the PMREM env, which feeds the IBL mirror term. —
// — R/B sample it at ±off in the facet's tangent plane around the body reflection vector: the delta —
// — vanishes where the env is flat (no tint) and flips across an emitter edge (fringe at facet —
// — junctions). Measured: fire_px_frac 0.0157→0.1054, dev_p95 3.6→28.6, hue p90-p10 4.3→43.4; —
// — 510× edge/facet concentration; 62.6% of interior pixels move <3° while 13.2% move >30°. —
// — COST CLIFF: do NOT extend to geometryClearcoatNormal (25→14 fps on SwiftShader). Body only. —
// — Order matters: the chunk replaces #include <transmission_fragment> and sits after —
// — `vec3 totalSpecular = …`, so totalSpecular / envMap / envMapIntensity are in scope. —
// Export map: GEM_SHADER.dispersion(src, spread) → fragment source with mirror-vector fire
(function () {
const api = {};
const FIRE_OFF = 0.12;      // tangent-plane offset magnitude (tan units) ~= 6.8 deg
const FIRE_AZ = [70, 160];  // offset azimuths in each facet's tangent frame (deg)
const FIRE_W = 1.0;         // weight on the chromatic delta (1.0 = physical, no amplification)
const refract = function (lo, hi) {
return `	vec4 t0 = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.ior * ${lo}, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	vec4 t1 = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	vec4 t2 = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.ior * ${hi}, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	vec4 transmitted = vec4( t0.r, t1.g, t2.b, t1.a );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );`;
};
const fire = function (off, w) {
const blocks = FIRE_AZ.map(function (a) {
const c = Math.cos((a * Math.PI) / 180).toFixed(4), s = Math.sin((a * Math.PI) / 180).toFixed(4);
return `	{
		vec3 off = ( bt * ${c} + bn * ${s} ) * ${off.toFixed(4)};
		vec4 ea = textureCubeUV( envMap, normalize( rwg + off ), material.roughness );
		vec4 eb = textureCubeUV( envMap, normalize( rwg - off ), material.roughness );
		fire += vec3( ea.r - midc.r, 0.0, eb.b - midc.b );
	}`;
}).join('\n');
return `	vec3 upv = abs( n.y ) < 0.99 ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
	vec3 bt = normalize( cross( upv, n ) );
	vec3 bn = cross( n, bt );
	vec3 rwg = normalize( mix( reflect( - v, n ), n, material.roughness * material.roughness ) );
	vec4 midc = textureCubeUV( envMap, rwg, material.roughness );
	vec3 fire = vec3( 0.0 );
${blocks}
	totalSpecular += fire * envMapIntensity * ${w.toFixed(4)};`;
};
const chunk = function (lo, hi) {
return `#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
${refract(lo, hi)}
${fire(FIRE_OFF, FIRE_W)}
#endif`;
};
api.dispersion = function (src, spread) {
const d = spread || 12;
const lo = (1 - d / 100).toFixed(4);
const hi = (1 + d / 100).toFixed(4);
return src.replace('#include <transmission_fragment>', chunk(lo, hi));
};
window.GEM_SHADER = api;
})();
