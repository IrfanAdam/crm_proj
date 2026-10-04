/* ADAM/SHARED — src/components/GemReward/gem-shader.js · real gem optics */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-4] · Round3: far-side proxy + 3-IOR dispersion.
// — dispersion(src, spread): swaps <transmission_fragment> for 3 real IOR taps (lo/ior/hi) →
// —   vec4(t0.r, t1.g, t2.b, t1.a). Default spread is SMALL (~3%): the RT is now structured, so a
// —   wide split lands the R/G/B taps on different facets → neon channel separation, not dispersion.
// — farside(opts): opaque BackSide ShaderMaterial for the far-side facets — per-facet Snell
// —   refract + true TIR (env internal reflection + key-light glint) + projected stage-backdrop
// —   window (faded out when the projection leaves the backdrop). Being opaque it renders into
// —   three's transmission RT; the body occludes it in the main pass (no overlay).
(function () {
const api = {};
window.GEM_SHADER = api;
const GAIN = 2.6;
const TIR_BOOST = 1.6;
const TINT_MIX = 0.3;
const ENV_BROAD = 0.28;
const WIN_GAIN = 1.8;
const SUN_GAIN = 9.0;
const refract = function (lo, hi) {
return `\tfloat face = abs( dot( n, v ) );\n\tvec4 t0 = getIBLVolumeRefraction(n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90, pos, modelMatrix, viewMatrix, projectionMatrix, material.ior * mix( 1.0, ${lo}, face ), material.thickness, material.attenuationColor, material.attenuationDistance );\n\tvec4 t1 = getIBLVolumeRefraction(n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90, pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness, material.attenuationColor, material.attenuationDistance );\n\tvec4 t2 = getIBLVolumeRefraction(n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90, pos, modelMatrix, viewMatrix, projectionMatrix, material.ior * mix( 1.0, ${hi}, face ), material.thickness, material.attenuationColor, material.attenuationDistance );\n\tvec4 transmitted = mix( t1, vec4( t0.r, t1.g, t2.b, t1.a ), 0.6 );\n\tfloat graze = 1.0 - face;\n\ttransmitted.rgb *= mix( vec3( 1.0 ), material.attenuationColor * 1.35, graze * 0.5 );\n\tfloat tzdark = 1.0 - clamp( max( transmitted.r, max( transmitted.g, transmitted.b ) ), 0.0, 1.0 );\n\tfloat lowside = smoothstep( 0.15, -0.8, normalize( refract( -v, n, 1.0 / material.ior ) ).y );\n\ttransmitted.rgb += material.diffuseColor * tzdark * mix( 0.22, 0.44, lowside );\n\ttransmitted.rgb += vec3( 0.05 ) * tzdark;\n\ttransmitted.rgb = mix( transmitted.rgb, material.diffuseColor * 1.0, 0.16 * tzdark * lowside );\n\tvec3 bgd = normalize( refract( -v, n, 1.0 / material.ior ) );\n\tvec4 bgcp = projectionMatrix * viewMatrix * vec4( pos + bgd * 3.0, 1.0 );\n\tvec2 bguv = bgcp.xy / max( abs( bgcp.w ), 1e-4 ) * 0.5 + 0.5;\n\tvec3 bg = texture2D( bgTex, clamp( bguv, 0.0, 1.0 ) ).rgb * material.diffuseColor;\n\ttransmitted.rgb = mix( transmitted.rgb, bg, bgOn * mix( 0.60, 0.15, tzdark ) );\n\tmaterial.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );`;
};
const HEAD = '\tmaterial.transmission = transmission;\n\tmaterial.transmissionAlpha = 1.0;\n\tmaterial.thickness = thickness;\n\tmaterial.attenuationDistance = attenuationDistance;\n\tmaterial.attenuationColor = attenuationColor;\n\t#ifdef USE_TRANSMISSIONMAP\n\t\tmaterial.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;\n\t#endif\n\t#ifdef USE_THICKNESSMAP\n\t\tmaterial.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;\n\t#endif\n\tvec3 pos = vWorldPosition;\n\tvec3 v = normalize( cameraPosition - pos );\n\tvec3 n = inverseTransformDirection( normal, viewMatrix );\n\tvec3 baseDiffuse = totalDiffuse;';
const chunk = function (lo, hi) {
return `#ifdef USE_TRANSMISSION\n${HEAD}\n${refract(lo, hi)}\n\ttotalDiffuse = mix( baseDiffuse, transmitted.rgb, material.transmission );\n#endif`;
};
api.dispersion = function (src, spread) {
const d = spread == null ? 2 : spread;
const lo = (1 - d / 100).toFixed(4);
const hi = (1 + d / 100).toFixed(4);
return src.replace('#include <transmission_pars_fragment>', '#include <transmission_pars_fragment>\nuniform sampler2D bgTex;\nuniform float bgOn;').replace('#include <transmission_fragment>', chunk(lo, hi));
};
if (!window.THREE) return;
const T = window.THREE;
const VS = 'varying vec3 vW;\nvarying vec3 vN;\nvoid main() {\n\tvec4 wp = modelMatrix * vec4( position, 1.0 );\n\tvW = wp.xyz;\n\tvN = normalize( mat3( modelMatrix ) * normal );\n\tgl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}';
const FS = 'uniform vec3 rampDeep;\nuniform vec3 rampMid;\nuniform vec3 rampLite;\nuniform vec3 rampPink;\nuniform sampler2D envMap;\nuniform sampler2D stageTex;\nuniform float winGain;\nuniform float stageOn;\nuniform float ior;\nuniform float gain;\nuniform vec3 tint;\nuniform mat4 projectionMatrix;\nvarying vec3 vW;\nvarying vec3 vN;\n#include <cube_uv_reflection_fragment>\nfloat hashf( vec3 q ) {\n\treturn fract( sin( dot( q, vec3( 12.9898, 78.233, 37.719 ) ) ) * 43758.5453 );\n}\nvoid main() {\n' +
'vec3 n = normalize( vN );\n' +
'vec3 w = normalize( vW - cameraPosition );\n' +
'vec3 refr = refract( w, - n, ior );\n' +
'float tir = 1.0 - step( 1e-4, dot( refr, refr ) );\n' +
'vec3 dir = normalize( mix( refr, reflect( w, - n ), tir ) );\n' +
'vec3 wp = vW + dir * 3.0;\n' +
'vec4 cp = projectionMatrix * viewMatrix * vec4( wp, 1.0 );\n' +
'vec2 uv = cp.xy / max( abs( cp.w ), 1e-4 ) * 0.5 + 0.5;\n' +
'float inUv = step( 0.0, uv.x ) * step( uv.x, 1.0 ) * step( 0.0, uv.y ) * step( uv.y, 1.0 );\n' +
'vec3 stage = texture2D( stageTex, clamp( uv, 0.0, 1.0 ) ).rgb;\n' +
`vec3 win = stage * winGain;\n` +
'vec3 bounceSrc = mix( vec3( 0.50, 0.50, 0.52 ), stage, stageOn );\n' +
'#ifdef ENVMAP_TYPE_CUBE_UV\n' +
`vec3 env = textureCubeUV( envMap, dir, 0.03 ).rgb + textureCubeUV( envMap, normalize( vN ), 0.6 ).rgb * ${ENV_BROAD.toFixed(2)} + bounceSrc * smoothstep( 0.05, -0.55, dir.y );\n` +
'#else\n' +
'vec3 env = vec3( 0.04 ) + bounceSrc * smoothstep( 0.05, -0.55, dir.y );\n' +
'#endif\n' +
'vec3 through = mix( env, win, stageOn * ( 1.0 - tir ) * inUv );\n' +
`float hn = hashf( floor( n * 23.0 ) + floor( vW * 11.0 ) );\n` +
`float up = dot( n, normalize( vec3( 0.15, 1.0, 0.1 ) ) );\n` +
`float t1r = smoothstep( -0.9, 1.25, up );\n` +
`t1r = clamp( t1r + ( hn - 0.5 ) * 0.28 - smoothstep( 0.45, 1.05, up ) * 0.28, 0.0, 1.0 );\n` +
`t1r = floor( t1r * 6.0 ) / 6.0;\n` +
`vec3 rampc = mix( rampDeep, rampMid, smoothstep( 0.0, 0.55, t1r ) );\n` +
`rampc = mix( rampc, rampLite, smoothstep( 0.55, 1.0, t1r ) );\n` +
`rampc = mix( rampc, rampPink, step( 0.86, hashf( floor( n * 47.0 ) + 3.7 ) ) * 0.85 );\n` +
'\tthrough *= mix( vec3( 1.0 ), rampc * 1.9, 0.62 );\n' +
`float gdot = max( dot( dir, normalize( vec3( 3.0, 5.0, 4.0 ) ) ), 0.0 );\n` +
`float glint = pow( gdot, 150.0 ) * ${SUN_GAIN.toFixed(1)};\n` +
`float glowMix = smoothstep( 0.88, 0.995, gdot ) * ( 1.0 - clamp( glint, 0.0, 1.0 ) );\n` +
`vec3 rim = tint * glowMix;\n` +
`vec3 col = through * gain * mix( vec3( 1.0 ), tint, ${TINT_MIX.toFixed(2)} ) * mix( 1.0, ${TIR_BOOST.toFixed(2)}, tir );\n` +
'gl_FragColor = vec4( mix( col + rim * 0.55, vec3( 1.0 ), clamp( glint * mix( 0.8, 1.5, tir ), 0.0, 1.0 ) ), 1.0 );\n}';

api.farside = function (opts) {
const o = opts || {};
const env = o.envMap && o.envMap.image && o.envMap.image.height ? o.envMap : null;
const defines = {};
if (env) {
const h = env.image.height;
const maxMip = Math.log2(h) - 2;
defines.ENVMAP_TYPE_CUBE_UV = '';
defines.CUBEUV_TEXEL_WIDTH = 1 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16));
defines.CUBEUV_TEXEL_HEIGHT = 1 / h;
defines.CUBEUV_MAX_MIP = maxMip + '.0';
}
const ramp = o.ramp || {};
const rc = function (k, d) { return ramp[k] && ramp[k].isColor ? ramp[k] : new T.Color(d[0], d[1], d[2]); };
const rampDeep = rc('deep', [0.031, 0.09, 0.345]), rampMid = rc('mid', [0.11, 0.29, 0.83]), rampLite = rc('lite', [0.42, 0.47, 0.62]), rampPink = rc('pink', [0.85, 0.48, 0.78]);
return new T.ShaderMaterial({ side: T.BackSide, defines: defines, uniforms: {
envMap: { value: env },
stageTex: { value: o.stageTex || null },
stageOn: { value: o.stageTex ? 1 : 0 },
winGain: { value: WIN_GAIN },
ior: { value: o.ior || 2.4 },
gain: { value: GAIN },
tint: { value: (o.tint && o.tint.isColor) ? o.tint : new T.Color(0.11, 0.29, 0.83) },
rampDeep: { value: rampDeep },
rampMid: { value: rampMid },
rampLite: { value: rampLite },
rampPink: { value: rampPink },
}, vertexShader: VS, fragmentShader: FS });
};
})();
