/* ADAM/SHARED — src/components/GemReward/gem-shader-body.js · body transmission override */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-4] · extracted from gem-shader.js (line budget).
// — dispersion(src, spread): swaps <transmission_fragment> for 3 real IOR taps (lo/ior/hi) →
// —   vec4(t0.r, t1.g, t2.b, t1.a), then applies the bounded highlight ladder on the body.
(function () {
const api = {};
window.GEM_SHADER_BODY = api;
const refract = function (lo, hi) {
return `\tfloat face = abs( dot( n, v ) );\n\tvec4 t0 = getIBLVolumeRefraction(n, v, 0.0, material.diffuseColor, material.specularColor, material.specularF90, pos, modelMatrix, viewMatrix, projectionMatrix, material.ior * mix( 1.0, ${lo}, face ), material.thickness, material.attenuationColor, material.attenuationDistance );\n\tvec4 t1 = getIBLVolumeRefraction(n, v, 0.0, material.diffuseColor, material.specularColor, material.specularF90, pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness, material.attenuationColor, material.attenuationDistance );\n\tvec4 t2 = getIBLVolumeRefraction(n, v, 0.0, material.diffuseColor, material.specularColor, material.specularF90, pos, modelMatrix, viewMatrix, projectionMatrix, material.ior * mix( 1.0, ${hi}, face ), material.thickness, material.attenuationColor, material.attenuationDistance );\n\tvec4 transmitted = mix( t1, vec4( t0.r, t1.g, t2.b, t1.a ), 0.6 );\n\tfloat graze = 1.0 - face;\n\ttransmitted.rgb *= mix( vec3( 1.0 ), material.attenuationColor * 1.35, graze * 0.5 );\n\tfloat tzdark = 1.0 - clamp( max( transmitted.r, max( transmitted.g, transmitted.b ) ), 0.0, 1.0 );\n\tfloat lowside = smoothstep( 0.15, -0.8, normalize( refract( -v, n, 1.0 / material.ior ) ).y );\n\ttransmitted.rgb = transmitted.rgb * ( 1.0 + tzdark * mix( 0.18, 0.42, lowside ) ) + material.diffuseColor * tzdark * 0.06;\n\ttransmitted.rgb = mix( transmitted.rgb, material.diffuseColor * 1.0, 0.05 * tzdark * lowside );\n\tvec3 bgd = normalize( refract( -v, n, 1.0 / material.ior ) );\n\tvec4 bgcp = projectionMatrix * viewMatrix * vec4( pos + bgd * 3.0, 1.0 );\n\tvec2 bguv = bgcp.xy / max( abs( bgcp.w ), 1e-4 ) * 0.5 + 0.5;\n\tvec3 bg = texture2D( bgTex, clamp( bguv, 0.0, 1.0 ) ).rgb * material.diffuseColor;\n\ttransmitted.rgb = mix( transmitted.rgb, bg, bgOn * mix( 0.60, 0.15, tzdark ) );\n\t// the RT behind the stone can be the white page, which a flat facet would clip to a white sheet:\n\t// a near-neutral bright sample carries no stone colour, so pull it back onto the stone's own hue.\n\tfloat tmx = max( transmitted.r, max( transmitted.g, transmitted.b ) );\n\tfloat tchroma = tmx - min( transmitted.r, min( transmitted.g, transmitted.b ) );\n\tfloat wwhite = smoothstep( 0.42, 0.80, tmx ) * ( 1.0 - smoothstep( 0.05, 0.20, tchroma ) );\n\ttransmitted.rgb *= mix( vec3( 1.0 ), material.attenuationColor * 1.85, wwhite * 0.92 );\n\t// the one bright rung, bounded so nothing can clip: a key-light sparkle on the internal ray.\n\tfloat dk = pow( max( dot( bgd, normalize( vec3( 3.0, 5.0, 4.0 ) ) ), 0.0 ), 55.0 );\n\thlad = clamp( dk * 1.35, 0.0, 0.92 );\n\ttransmitted.rgb = mix( transmitted.rgb, vec3( 0.94 ), hlad );\n\tmaterial.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );`;
};
const HEAD = '\tfloat hlad = 0.0;\n\tmaterial.transmission = transmission;\n\tmaterial.transmissionAlpha = 1.0;\n\tmaterial.thickness = thickness;\n\tmaterial.attenuationDistance = attenuationDistance;\n\tmaterial.attenuationColor = attenuationColor;\n\t#ifdef USE_TRANSMISSIONMAP\n\t\tmaterial.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;\n\t#endif\n\t#ifdef USE_THICKNESSMAP\n\t\tmaterial.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;\n\t#endif\n\tvec3 pos = vWorldPosition;\n\tvec3 v = normalize( cameraPosition - pos );\n\tvec3 n = inverseTransformDirection( normal, viewMatrix );\n\tvec3 baseDiffuse = totalDiffuse;';
const chunk = function (lo, hi) {
return `#ifdef USE_TRANSMISSION\n${HEAD}\n${refract(lo, hi)}\n\ttotalDiffuse = mix( baseDiffuse, transmitted.rgb, material.transmission );\n#endif`;
};
const CEIL = `#include <dithering_fragment>
// Highlight ladder for the body, applied to the tone-mapped display colour.
// The bright rung is a *saturated* colour built from the stone's own hue (about 196..213 luma at ~86
// saturation), so lifting the top of the range brightens the stone without bleaching it: a mix toward
// pure white is what sheets the table view and turns every highlight achromatic. Only the upper tail
// (hl > 0.5) is pulled onto that rung, so the mid and dark bands keep their values.
// The body's indirect specular is a mirror reflection of the studio sky on one wide flat facet; it is
// dimmed so that facet cannot sheet the stone.
	totalSpecular *= 0.60;
	vec3 attN = material.attenuationColor / max( max( material.attenuationColor.r, max( material.attenuationColor.g, material.attenuationColor.b ) ), 0.001 );
	vec3 hb = attN - vec3( dot( attN, vec3( 0.33333 ) ) );
	// the base is chosen so the rung's *luma* is exactly 0.80 for any stone hue
	float hlu = dot( hb, vec3( 0.2126, 0.7152, 0.0722 ) );
	vec3 htop = clamp( vec3( 0.85 - 0.72 * hlu ) + hb * 0.72, 0.0, 0.98 );
	float hl = dot( gl_FragColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
	float hw = smoothstep( 0.46, 0.58, hl );
	// per-facet selector: the rung lands on whole facets, so the highlights stay separate sparkles
	// instead of merging into one connected bright band.
	float hsel = step( 0.50, gemHashf( floor( n * 29.0 ) + 7.3 ) );
	gl_FragColor.rgb = mix( gl_FragColor.rgb, htop, hw * hsel * 0.92 );
`;
api.dispersion = function (src, spread) {
const d = spread == null ? 2 : spread;
const lo = (1 - d / 100).toFixed(4);
const hi = (1 + d / 100).toFixed(4);
const hash = 'float gemHashf( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }';
return src.replace('#include <transmission_pars_fragment>', '#include <transmission_pars_fragment>\nuniform sampler2D bgTex;\nuniform float bgOn;\n' + hash).replace('#include <transmission_fragment>', chunk(lo, hi)).replace('#include <dithering_fragment>', CEIL);
};
})();
