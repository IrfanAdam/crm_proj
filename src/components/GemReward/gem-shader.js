/* ADAM/SHARED — src/components/GemReward/gem-shader.js · analytic interior optics */
// [plan:2026-11-01_000000-gem-analytic-facets.md#interior] · Round6/analytic: real far facets, no RT, no ramp.
// — dispersion(src, spread): unchanged 3-IOR tap swap for the BODY material (load-bearing, see gem-shader-body).
// — farside(opts): opaque BackSide ShaderMaterial. The view ray bends at the entry facet it really crosses, then
// —   runs through the cut as a PLANE SET (gem-facets.js): inside the solid the nearest plane with t > 0 is the
// —   next real facet, so the far side is exact geometry, not a projected proxy. Up to 3 bounces, each with
// —   Schlick Fresnel on that facet's outward normal and true TIR (sin²θt = ior²(1−cos²θi) ≥ 1); path length
// —   accumulates Beer–Lambert exp(−κL) with κ from the stone's measured hue/sat (gem-facets.k3), and the first
// —   non-TIR hit refracts out and samples the studio env in that exit direction. Colour is path length and exit
// —   direction only — hue is path-invariant, saturation rises with path; no ramp, no per-facet hash, no gain
// —   ladder. ramp*/stageTex/winGain stay declared because gem-tint.js and gem-rig.js write them.
(function () {
const api = {};
window.GEM_SHADER = api;
api.dispersion = window.GEM_SHADER_BODY && window.GEM_SHADER_BODY.dispersion;
if (!window.THREE) return;
const T = window.THREE;
// display fit per stone: e = exposure, g = gamma, k = absorption path scale (1 = one stone radius).
api.FIT = { sapphire: { e: 6.2, g: 0.74, k: 0.55 }, citrine: { e: 3.8, g: 0.74, k: 0.55 }, amethyst: { e: 5.0, g: 0.74, k: 0.62 }, redberyl: { e: 7.0, g: 0.74, k: 0.60 } };
api.AMB = 0.10;
const VS = 'varying vec3 vW;\nvarying vec3 vN;\nvarying vec3 vO;\nvoid main() {\n\tvec4 wp = modelMatrix * vec4( position, 1.0 );\n\tvW = wp.xyz;\n\tvO = position;\n\tvN = normalize( mat3( modelMatrix ) * normal );\n\tgl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}';
const HEAD = 'uniform vec4 uPl[PLMAX];\nuniform sampler2D uPlTex;\nuniform sampler2D envMap;\nuniform sampler2D stageTex;\nuniform int uCount;\nuniform float ior, uKS, uExp, uGam, uAmb, winGain, stageOn, gain, dbg;\nuniform vec3 uK, tint;\nuniform mat4 uM;\nuniform vec3 rampDeep, rampMid, rampLite, rampPink;\nvarying vec3 vW;\nvarying vec3 vN;\nvarying vec3 vO;\n#include <cube_uv_reflection_fragment>\n' +
'vec4 PL( int i ) {\n#ifdef PLTEX\n\treturn texture2D( uPlTex, vec2( ( float( i ) + 0.5 ) / float( PLMAX ), 0.5 ) );\n#else\n\treturn uPl[ i ];\n#endif\n}\n' +
'float lum( vec3 c ) { return dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); }\nvec3 aces( vec3 x ) { return clamp( ( x * ( 2.51 * x + 0.03 ) ) / ( x * ( 2.43 * x + 0.59 ) + 0.14 ), 0.0, 1.0 ); }\n' +
// env: crisp tap = facet image (the structure), broad tap = fill; both pulled toward their own luma so the studio's blue tent cannot repaint an amber stone.
'vec3 sh( vec3 s, float k ) { return s * k / ( k + s ); }\n' +
'vec3 envR( vec3 d, mat3 R ) {\n\tvec3 e = normalize( R * d );\n#ifdef ENVMAP_TYPE_CUBE_UV\n\tvec3 s0 = textureCubeUV( envMap, e, 0.05 ).rgb;\n\tvec3 s1 = textureCubeUV( envMap, e, 0.30 ).rgb;\n' +
'\treturn sh( mix( s0, vec3( lum( s0 ) ), 0.55 ), 0.9 ) + sh( mix( s1, vec3( lum( s1 ) ), 0.85 ), 0.9 ) * gain;\n#else\n\treturn vec3( 0.05 ) + 0.02 * lum( e );\n#endif\n}\n';
const BODY = 'void main() {\n' +
    'vec3 w = normalize( vW - cameraPosition );\n' +
    // the plane set is object space, so one transform in and one out — no inverse matrix (and no ES-3 `inverse`).
    'float sc = length( uM[ 0 ].xyz );\n\tmat3 R = mat3( uM ) / sc;\n\tvec3 rel = cameraPosition - uM[ 3 ].xyz;\n' +
    '\tvec3 ro = vec3( dot( R[ 0 ], rel ), dot( R[ 1 ], rel ), dot( R[ 2 ], rel ) ) / sc;\n' +
    '\tvec3 rd = vec3( dot( R[ 0 ], w ), dot( R[ 1 ], w ), dot( R[ 2 ], w ) );\n' +
    // entry = the last plane the ray is still outside of; that crossing is the real way into the solid.
    'float tin = -1.0;\n\tint ei = 0;\n\tfor ( int i = 0; i < PLMAX; i++ ) {\n\t\tif ( i >= uCount ) break;\n\t\tvec4 P = PL( i );\n\t\tfloat s = dot( P.xyz, ro ) + P.w, den = dot( P.xyz, rd );\n\t\tif ( s > 1e-5 && den < -1e-6 ) { float t = -s / den; if ( t > tin ) { tin = t; ei = i; } }\n\t}\n' +
    '\tif ( tin < 0.0 ) { gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 ); return; }\n' +
    '\tvec3 ne = PL( ei ).xyz;\n\tvec3 dl = refract( rd, ne, 1.0 / ior );\n\tif ( dot( dl, dl ) < 1e-6 ) dl = rd;\n\tvec3 p = ro + rd * tin;\n\tvec3 acc = vec3( 0.0 ), ab = vec3( 1.0 );\n' +
    '\tfloat F0 = pow( ( ior - 1.0 ) / ( ior + 1.0 ), 2.0 );\n\tint skip = ei;\n\tfloat esc = 0.0, tot = 0.0, nb = 0.0;\n' +
    '\tfor ( int b = 0; b < 3; b++ ) {\n\t\tfloat t = 1e9;\n\t\tint hi = -1;\n' +
    '\t\tfor ( int i = 0; i < PLMAX; i++ ) {\n\t\t\tif ( i >= uCount || i == skip ) continue;\n\t\t\tvec4 P = PL( i );\n\t\t\tfloat den = dot( P.xyz, dl );\n\t\t\tif ( abs( den ) < 1e-6 ) continue;\n\t\t\tfloat ti = -( dot( P.xyz, p ) + P.w ) / den;\n\t\t\tif ( ti > 2e-3 && ti < t ) { t = ti; hi = i; }\n\t\t}\n' +
    '\t\tif ( hi < 0 ) break;\n\t\tp += dl * t;\n\t\ttot += t;\n\t\tnb += 1.0;\n\t\tab *= exp( -uK * ( t * uKS ) );\n\t\tvec3 nh = PL( hi ).xyz;\n\t\tfloat c = clamp( dot( dl, nh ), 0.0, 1.0 );\n' +
    '\t\tif ( ior * ior * ( 1.0 - c * c ) < 1.0 ) {\n\t\t\tfloat F = F0 + ( 1.0 - F0 ) * pow( 1.0 - c, 5.0 );\n\t\t\tacc += ( 1.0 - F ) * envR( refract( dl, -nh, ior ), R ) * ab;\n\t\t\tesc = 1.0;\n\t\t\tbreak;\n\t\t}\n' +
    '\t\tdl = reflect( dl, nh );\n\t\tskip = hi;\n\t}\n' +
    // 3 TIRs exhausted: the ray is still inside, so take the heading it holds — the last image it can carry.
    '\tif ( esc < 0.5 ) acc += ab * envR( dl, R ) * 0.55;\n' +
    '\tif ( dbg > 0.5 ) { gl_FragColor = vec4( tot / 3.0, nb / 3.0, 1.0 - ab.g, 1.0 ); return; }\n' +
    '\tvec3 lin = acc * uExp + uAmb * ( 1.0 - ab ) * tint;\n' +
    '\tgl_FragColor = vec4( clamp( pow( aces( lin ), vec3( 1.0 / uGam ) ), 0.0, 1.0 ), 1.0 );\n}';
const FS = HEAD + BODY;
api.setup = function () {   // build the plane set once from the shared cut — same 136 vertices / 268 triangles

const C = window.GEM_CUT;
if (!window.GEM_FACETS || !C || !C.gemCut) return 0;
return window.GEM_FACETS.build(C.gemCut(C.CUT)).count;
};
api.farside = function (opts) {
const o = opts || {};
const env = o.envMap && o.envMap.image && o.envMap.image.height ? o.envMap : null;
const defines = {};
if (env) {
const h = env.image.height, maxMip = Math.log2(h) - 2;
defines.ENVMAP_TYPE_CUBE_UV = '';
defines.CUBEUV_TEXEL_WIDTH = 1 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16));
defines.CUBEUV_TEXEL_HEIGHT = 1 / h;
defines.CUBEUV_MAX_MIP = maxMip + '.0';
}
defines.PLMAX = api.setup() || 8;
const ramp = o.ramp || {};
const rc = function (k, d) { return ramp[k] && ramp[k].isColor ? ramp[k] : new T.Color(d[0], d[1], d[2]); };
const sm = new T.ShaderMaterial({ side: T.BackSide, defines: defines, uniforms: {
envMap: { value: env }, stageTex: { value: o.stageTex || null }, stageOn: { value: o.stageTex ? 1 : 0 },
winGain: { value: 1.8 }, ior: { value: o.ior || 2.4 }, dbg: { value: 0 }, gain: { value: 2.2 },
tint: { value: (o.tint && o.tint.isColor) ? o.tint : new T.Color(0.11, 0.29, 0.83) },
rampDeep: { value: rc('deep', [0.031, 0.09, 0.345]) }, rampMid: { value: rc('mid', [0.11, 0.29, 0.83]) },
rampLite: { value: rc('lite', [0.42, 0.47, 0.62]) }, rampPink: { value: rc('pink', [0.85, 0.48, 0.78]) },
uPl: { value: null }, uPlTex: { value: null }, uCount: { value: defines.PLMAX },
uK: { value: new T.Vector3(1, 1, 1) }, uM: { value: new T.Matrix4() }, uKS: { value: 1 }, uExp: { value: 1 }, uGam: { value: 1 }, uAmb: { value: api.AMB },
}, vertexShader: VS, fragmentShader: FS });
sm.userData = { can: o.can };
if (window.GEM_FACETS) window.GEM_FACETS.set(sm, o.can);
api.aim(sm);
return sm;
};
// aim(mesh) is gem-scene's onBeforeRender hook: push the stone's real κ and its display fit whenever the
// category changed (gem-tint.js swaps dataset.gem in place, so this is the only per-frame hook the proxy owns).
api.aim = function (mesh) {
const m = mesh && mesh.material, u = m && m.uniforms;
if (!u || !u.uK) return;
u.uM.value.copy(mesh.matrixWorld);
const cat = (m.userData.can && m.userData.can.dataset.gem) || 'sapphire';
if (api._cat === cat) return;
api._cat = cat;
const F = api.FIT[cat] || api.FIT.sapphire;
if (window.GEM_FACETS) { const k = window.GEM_FACETS.k3(cat); u.uK.value.set(k[0], k[1], k[2]); }
u.uExp.value = F.e; u.uGam.value = F.g; u.uKS.value = F.k;
};
})();
