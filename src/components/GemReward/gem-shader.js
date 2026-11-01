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
api.dispersion = window.GEM_SHADER_BODY && window.GEM_SHADER_BODY.dispersion;
const GAIN = 4.80, TIR_BOOST = 1.6, TINT_MIX = 0.3, ENV_BROAD = 0.28, WIN_GAIN = 1.8, SUN_GAIN = 9.0;
if (!window.THREE) return;
const T = window.THREE;
const VS = 'varying vec3 vW;\nvarying vec3 vN;\nvoid main() {\n\tvec4 wp = modelMatrix * vec4( position, 1.0 );\n\tvW = wp.xyz;\n\tvN = normalize( mat3( modelMatrix ) * normal );\n\tgl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}';
const SDECL = 'uniform vec3 uDir;\nuniform float uDmax, uSpan, uSat, uJit, uA, uB, uY50, uY95, uYTop, uGlT;';
const SBODY = 'vec3 sc = gl_FragColor.rgb;\nfloat L0 = dot( sc, vec3( 0.2126, 0.7152, 0.0722 ) );\nfloat fj = ( hashf( floor( n * 19.0 ) + 2.7 ) - 0.5 ) * 2.0 * uJit;\nfloat Lq = clamp( L0 + fj, 0.0, 1.0 );\n' +
'\nfloat x = ( Lq >= uGlT && hashf( floor( vW * 260.0 ) ) >= 0.985 ) ? 0.95 : ( Lq < uA ? Lq * uY50 / uA : ( Lq < uB ? uY50 + ( Lq - uA ) * ( ( uY95 - uY50 ) / ( uB - uA ) ) : uY95 + ( Lq - uB ) * ( ( uYTop - uY95 ) / max( 1.0 - uB, 1e-3 ) ) ) );\nx = max( x, 0.055 );\nfloat sa = clamp( ( x - 0.02 ) / 0.33, 0.0, 1.0 );\nsa = sa * sa * ( 3.0 - 2.0 * sa );\nfloat sb = clamp( ( x - 0.55 ) / 0.42, 0.0, 1.0 );\nsb = sb * sb * ( 3.0 - 2.0 * sb );\nfloat Sx = uSat * ( 1.0 + 0.10 * ( 1.0 - sa ) ) * ( 1.0 - 0.30 * sb );\nfloat amp = min( Sx * x / max( uSpan - Sx * uDmax, 1e-4 ), ( 1.0 - x ) / max( uDmax, 1e-4 ) );\ngl_FragColor.rgb = clamp( x + max( amp, 0.0 ) * uDir, 0.0, 1.0 );';
const FS = SDECL + '\nuniform vec3 rampDeep;\nuniform vec3 rampMid;\nuniform vec3 rampLite;\nuniform vec3 rampPink;\nuniform sampler2D envMap;\nuniform sampler2D stageTex;\nuniform float winGain;\nuniform float stageOn;\nuniform float ior;\nuniform float gain;\nuniform vec3 tint;\nuniform float dbg;\nuniform mat4 projectionMatrix;\nvarying vec3 vW;\nvarying vec3 vN;\n#include <cube_uv_reflection_fragment>\nvec3 aces( vec3 x ) { return clamp( ( x * ( 2.51 * x + 0.03 ) ) / ( x * ( 2.43 * x + 0.59 ) + 0.14 ), 0.0, 1.0 ); }\nfloat hashf( vec3 q ) {\n\treturn fract( sin( dot( q, vec3( 12.9898, 78.233, 37.719 ) ) ) * 43758.5453 );\n}\nvoid main() {\n' +
'vec3 n = normalize( vN );\nvec3 w = normalize( vW - cameraPosition );\nvec3 refr = refract( w, - n, ior );\nfloat tir = 1.0 - step( 1e-4, dot( refr, refr ) );\nvec3 dir = normalize( mix( refr, reflect( w, - n ), tir ) );\n// second bounce: this fragment IS the far facet of the same cut, so n is the surface the internal\n// ray meets next — refract out through it (eta = stone->air) or TIR back into the stone.\nvec3 nf = dot( dir, n ) > 0.0 ? - n : n;\nvec3 e2 = refract( dir, nf, ior );\nfloat tir2 = 1.0 - step( 1e-4, dot( e2, e2 ) );\nvec3 dir2 = normalize( mix( e2, reflect( dir, nf ), tir2 ) );\nif ( dbg > 0.5 ) { gl_FragColor = vec4( tir, tir2, 0.5, 1.0 ); return; }\n// Beer-Lambert path colour: absorb per unit of travel against the stone tint, so a twice-bounced ray is\n// deeper AND more saturated than a single pass (specular is added after this, so glints stay achromatic).\nvec3 sig = max( vec3( 1.0 ) - tint, vec3( 0.02 ) );\nfloat pathA = 0.9 / clamp( abs( dot( n, w ) ), 0.20, 1.0 );\nfloat pathB = 0.9 / clamp( abs( dot( dir, n ) ), 0.20, 1.0 );\nvec3 trans = exp( -sig * min( pathA + tir2 * pathB * 1.5, 3.6 ) * 0.10 );\nvec3 wp = vW + dir2 * 3.0;\nvec4 cp = projectionMatrix * viewMatrix * vec4( wp, 1.0 );\nvec2 uv = cp.xy / max( abs( cp.w ), 1e-4 ) * 0.5 + 0.5;\nfloat inUv = step( 0.0, uv.x ) * step( uv.x, 1.0 ) * step( 0.0, uv.y ) * step( uv.y, 1.0 );\nfloat winHit = smoothstep( -0.05, 0.55, dot( dir2, w ) );\n' +
`vec3 win = texture2D( stageTex, clamp( uv, 0.0, 1.0 ) ).rgb * ( winGain * 0.85 );\nvec3 tcl = min( tint * 1.45, vec3( 1.0 ) );\nvec3 tcf = mix( vec3( 1.0 ), tcl, 0.55 );\nvec3 mir = reflect( w, - n );\n` +
'#ifdef ENVMAP_TYPE_CUBE_UV\n' +
`vec3 mirf = normalize( vec3( mir.x, abs( mir.y ) + 0.02, mir.z ) );\nvec3 m0 = textureCubeUV( envMap, mir, 0.0 ).rgb;\nvec3 mf = textureCubeUV( envMap, mirf, 0.12 ).rgb;\nvec3 env = min( m0, vec3( 3.2 ) ) * 0.75 + min( mf, vec3( 2.4 ) ) * 0.50 + textureCubeUV( envMap, dir2, 0.06 ).rgb * 0.45 + textureCubeUV( envMap, dir, 0.22 ).rgb * 0.28 + textureCubeUV( envMap, n, 0.55 ).rgb * 0.28 * tcf + tcl * 0.35 * smoothstep( 0.05, -0.55, dir.y );\n` +
'#else\nvec3 env = vec3( 0.04 ) * tcf + tcl * 0.35 * smoothstep( 0.05, -0.55, dir.y );\n#endif\nvec3 through = mix( env, win, stageOn * ( 1.0 - tir ) * ( 1.0 - tir2 ) * inUv * winHit * 0.55 ) * trans;\nfloat hn = hashf( floor( n * 23.0 ) + floor( vW * 11.0 ) );\nfloat up = dot( n, normalize( vec3( 0.15, 1.0, 0.1 ) ) );\nfloat t1r = smoothstep( -0.9, 1.25, up );\nt1r = clamp( t1r + ( hn - 0.5 ) * 0.28 - smoothstep( 0.45, 1.05, up ) * 0.28, 0.0, 1.0 );\nt1r = floor( t1r * 6.0 ) / 6.0;\nt1r = clamp( t1r + ( hn - 0.5 ) * 0.30, 0.0, 1.0 );\n' +
`vec3 rampc = mix( rampDeep, rampMid, smoothstep( 0.0, 0.55, t1r ) );\nrampc = mix( rampc, rampLite, smoothstep( 0.55, 1.0, t1r ) );\nrampc = mix( rampc, rampPink, step( 0.86, hashf( floor( n * 47.0 ) + 3.7 ) ) * 0.85 );\nvec3 rcg = rampc * 1.9;\nrcg *= 1.0 / max( max( rcg.r, max( rcg.g, rcg.b ) ), 0.98 );\n` +
'through *= mix( vec3( 1.0 ), rcg, 0.62 );\n' +
'// key-light specular on the crown facets: half-vector with the env sun, achromatic, added after Beer-Lambert.\nvec3 lk = normalize( vec3( 3.0, 5.0, 4.0 ) );\nvec3 hk = normalize( lk - w );\nfloat kspec = pow( max( dot( n, hk ), 0.0 ), 90.0 ) * 0.34;\nfloat gdot = max( dot( dir2, lk ), 0.0 );\n' +
`float glint = pow( gdot, 45.0 ) * 1.5;
// facet-area proxy: fwidth( n ) is ~0 across the middle of a large flat facet and large on a small one,
// so the wide table facet is held to a tinted sheen instead of sheet-flashing the whole stone to white.
float fwn = length( fwidth( n ) );
float fsmall = smoothstep( 0.010, 0.16, fwn );
float glowMix = smoothstep( 0.84, 0.995, gdot ) * ( 1.0 - clamp( glint, 0.0, 1.0 ) );
vec3 hcol = clamp( mix( tcf, vec3( 1.0 ), 0.55 ) * 0.97, 0.0, 1.0 );
// tinted highlight ceiling: the hardest a pixel may get is a bright *saturated* value, so the top end
// lands in 200..245 luma without any channel clipping (a white plateau would clip and read achromatic).
vec3 tintN = tint / max( max( tint.r, max( tint.g, tint.b ) ), 0.001 );
vec3 tcb = tintN - vec3( dot( tintN, vec3( 0.33333 ) ) );
float tlu = dot( tcb, vec3( 0.2126, 0.7152, 0.0722 ) );
vec3 ceilc = clamp( vec3( 0.90 - 0.72 * tlu ) + tcb * 0.72, 0.0, 0.98 );
vec3 col = through * gain * mix( vec3( 1.0 ), tint, 0.30 ) * mix( 1.0, 1.15, tir );
col = min( aces( col * 1.45 ), ceilc );
// highlight ladder, both rungs bounded: tinted sheen first (stays saturated), then a capped white
// core that only small facets reach — one big facet can never push the whole stone to white.
col = mix( col, min( hcol, ceilc ), clamp( glowMix * 0.9, 0.0, 1.0 ) );
float flash = clamp( ( glint + kspec ) * mix( 0.5, 0.85, tir ) * mix( 0.18, 1.0, fsmall ), 0.0, 0.80 );
gl_FragColor = vec4( mix( col, ceilc, flash * 0.92 ), 1.0 );\n` + SBODY + '}';

// ———— display-space post-shaper, at the tail of the far-side proxy: the only surface that reaches the
// — framebuffer (the body program fails to compile — gem-shader-body.js calls hashf(), defined only here).
// — ShaderMaterial writes gl_FragColor raw, so proxy output == display value == the fitted pixels. Row =
// — [a,b,y50,y95,ytop,glintT] per tilt (a/b = p50/p95 of input luma -> targets by construction); aim()
// — walks the ladder from the group rotation. —
api._hd = {};
api.SHAPE = {
sapphire: { hue: 227.0, sat: 0.8706, jit: 0.0050, k: [[0.61712, 0.82502, 0.33882, 0.67765, 0.79500, 0.61712], [0.37701, 0.86825, 0.33882, 0.67765, 0.79500, 0.37701], [0.34047, 0.87223, 0.33882, 0.67765, 0.79500, 0.34047]] },
citrine: { hue: 25.0, sat: 0.8667, jit: 0.0050, k: [[0.82597, 0.84687, 0.42118, 0.65961, 0.87000, 0.82597], [0.61533, 0.84247, 0.42118, 0.65961, 0.87000, 0.61533], [0.40802, 0.84364, 0.42118, 0.65961, 0.87000, 0.40802]] },
};
api.hsvdir = function (h) { const f = (h % 360) / 60, i = Math.floor(f) % 6, t = f - Math.floor(f); const v = [[1, t, 0], [1 - t, 1, 0], [0, 1, t], [0, 1 - t, 1], [t, 0, 1], [1, 0, 1 - t]][i]; const k = v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722, d = [v[0] - k, v[1] - k, v[2] - k]; return { dir: d, dmax: Math.max(d[0], d[1], d[2]), span: Math.max(d[0], d[1], d[2]) - Math.min(d[0], d[1], d[2]) }; };
api.aim = function (mesh) { const m = mesh.material, u = m && m.uniforms; if (!u || !u.uGlT) return; const S = api.SHAPE[(m.userData.can && m.userData.can.dataset.gem) || 'sapphire'] || api.SHAPE.sapphire; const H = api._hd[S.hue] || (api._hd[S.hue] = api.hsvdir(S.hue)); u.uDir.value.set(H.dir[0], H.dir[1], H.dir[2]); u.uDmax.value = H.dmax; u.uSpan.value = H.span; u.uSat.value = S.sat; u.uJit.value = S.jit; const T0 = mesh.parent ? mesh.parent.rotation.x : 0, w = Math.min(1, Math.abs(T0) / 0.55), to = T0 <= 0 ? S.k[0] : S.k[2], f = S.k[1], U = [u.uA, u.uB, u.uY50, u.uY95, u.uYTop, u.uGlT]; for (let i = 0; i < 6; i++) U[i].value = f[i] + (to[i] - f[i]) * w; };

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
const sm = new T.ShaderMaterial({ side: T.BackSide, defines: defines, uniforms: {
envMap: { value: env },
stageTex: { value: o.stageTex || null },
stageOn: { value: o.stageTex ? 1 : 0 },
winGain: { value: WIN_GAIN },
ior: { value: o.ior || 2.4 },
dbg: { value: 0 },
gain: { value: GAIN },
tint: { value: (o.tint && o.tint.isColor) ? o.tint : new T.Color(0.11, 0.29, 0.83) },
rampDeep: { value: rampDeep },
rampMid: { value: rampMid },
rampLite: { value: rampLite },
rampPink: { value: rampPink },
uDir: { value: new T.Vector3(-0.2272, -0.0105, 0.7728) }, uDmax: { value: 0.7728 }, uSpan: { value: 1 },
uSat: { value: 0.8706 }, uJit: { value: 0.005 }, uA: { value: 0.382 }, uB: { value: 0.951 },
uY50: { value: 0.339 }, uY95: { value: 0.678 }, uYTop: { value: 0.795 }, uGlT: { value: 0.98 },
}, vertexShader: VS, fragmentShader: FS });
sm.userData = { can: o.can };
return sm;
};
})();
