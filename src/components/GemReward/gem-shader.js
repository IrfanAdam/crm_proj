/* ADAM/SHARED — src/components/GemReward/gem-shader.js · chromatic dispersion patch */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · mirrors DISP in prototype/gems/gem_optics.py
// — three r160 has no `dispersion` parameter, and onBeforeCompile hands over the shader with its —
// — `#include` directives UNRESOLVED: the literal refraction call is not in the source yet, so a —
// — regex on the call silently no-ops. Patching the include itself is the only hook that fires. —
// Export map: GEM_SHADER.dispersion(src, spread) → fragment source with a 3-sample spectrum
(function () {
const api = {};
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
	vec4 t0 = getIBLVolumeRefraction(
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
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
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
