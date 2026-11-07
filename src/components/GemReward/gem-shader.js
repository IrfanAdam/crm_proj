/* ADAM/SHARED — src/components/GemReward/gem-shader.js · analytic interior optics */
// — farside(opts): opaque BackSide ShaderMaterial (core(opts) renders the same tracer FrontSide as the VISIBLE stone,
// —   with the entry Fresnel term). The view ray bends at the entry facet it really crosses, then runs through the cut
// —   as a PLANE SET (gem-facets.js): the nearest plane with t > 0 is the next real facet, so the far side is exact
// —   geometry. Up to uBounce bounces, Schlick Fresnel + true TIR per hit, Beer–Lambert along the path with κ from the
// —   measured hue/sat, per-wavelength ior (uSpread/uTaps) so fire comes from refraction, and a key emitter (uKey).
(function () {
const api = {};
window.GEM_SHADER = api;
api.dispersion = window.GEM_SHADER_BODY && window.GEM_SHADER_BODY.dispersion;
if (!window.THREE) return;
const T = window.THREE;
const OD = (window.GEM_OPTICS && window.GEM_OPTICS.of('sapphire')) || { n: { trace: 2.4 }, reflect: { crisp: 0.05, broad: 0.30, luma: 0.55, lumaB: 0.85, shK: 0.9, bounce: 3, mirror: 2.2, win: 1.8 }, absorb: { scale: 1 }, light: { exp: 1, gam: 1, amb: 0.1 } };
api.FIT = { sapphire: { e: 6.2, g: 0.74, k: 0.55 }, citrine: { e: 3.8, g: 0.74, k: 0.55 }, amethyst: { e: 5.0, g: 0.74, k: 0.62 }, redberyl: { e: 7.0, g: 0.74, k: 0.60 } }; api.AMB = 0.10;
const VS = 'varying vec3 vW;\nvarying vec3 vN;\nvarying vec3 vO;\nvoid main() {\n\tvec4 wp = modelMatrix * vec4( position, 1.0 );\n\tvW = wp.xyz;\n\tvO = position;\n\tvN = normalize( mat3( modelMatrix ) * normal );\n\tgl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n}';
const HEAD = 'uniform vec4 uPl[PLMAX];\nuniform sampler2D uPlTex;\nuniform sampler2D envMap;\nuniform sampler2D stageTex;\nuniform int uCount;\nuniform float ior, uKS, uExp, uGam, uAmb, winGain, stageOn, gain, dbg, uCr, uBr, uLu, uLuB, uSh, uBounce, uSpread, uTaps;\nuniform vec3 uK, tint;\nuniform vec4 uKey;\nuniform mat4 uM;\nuniform vec3 rampDeep, rampMid, rampLite, rampPink;\nvarying vec3 vW;\nvarying vec3 vN;\nvarying vec3 vO;\n#include <cube_uv_reflection_fragment>\n' +
'vec4 PL( int i ) {\n#ifdef PLTEX\n\treturn texture2D( uPlTex, vec2( ( float( i ) + 0.5 ) / float( PLMAX ), 0.5 ) );\n#else\n\treturn uPl[ i ];\n#endif\n}\n' +
'float lum( vec3 c ) { return dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); }\nvec3 aces( vec3 x ) { return clamp( ( x * ( 2.51 * x + 0.03 ) ) / ( x * ( 2.43 * x + 0.59 ) + 0.14 ), 0.0, 1.0 ); }\n' +
// env: crisp tap = facet image (the structure), broad tap = fill; both pulled toward their own luma so the studio's blue tent cannot repaint an amber stone.
'vec3 sh( vec3 s, float k ) { return s * k / ( k + s ); }\nvec3 keyT( vec3 d ) {\n\tvec3 e = normalize( d ), k = normalize( uKey.xyz );\n\treturn vec3( ( pow( max( dot( e, k ), 0.0 ), 90.0 ) + 0.10 * pow( max( dot( e, normalize( vec3( -k.x, 0.30 * k.y, -k.z ) ) ), 0.0 ), 5.0 ) ) * uKey.w );\n}\n' +
'vec3 envR( vec3 d, mat3 R ) {\n\tvec3 e = normalize( R * d );\n#ifdef ENVMAP_TYPE_CUBE_UV\n\tvec3 s0 = textureCubeUV( envMap, e, uCr ).rgb;\n\tvec3 s1 = textureCubeUV( envMap, e, uBr ).rgb;\n' +
'\treturn keyT( e ) + sh( mix( s0, vec3( lum( s0 ) ), uLu ), uSh ) + sh( mix( s1, vec3( lum( s1 ) ), uLuB ), uSh ) * gain;\n#else\n\treturn vec3( 0.05 ) + 0.02 * lum( e );\n#endif\n}\n';
// the spectrum is a property of the PATH, not of the exit: tr() is the whole interior trace at one index, and main
// runs it once per wavelength (R lo, G n, B hi; 5 taps adds yellow/cyan). Fresnel, TIR and Beer-Lambert are per hit.
const BODY = 'float gTot, gNb;\nvec3 gAb, gNe;\n' +
    'vec3 tr( vec3 ro, vec3 rd, float n, mat3 R ) {\n\tgTot = 0.0;\n\tgNb = 0.0;\n\tfloat tin = -1.0;\n\tint ei = 0;\n\tfor ( int i = 0; i < PLMAX; i++ ) {\n\t\tif ( i >= uCount ) break;\n\t\tvec4 P = PL( i );\n\t\tfloat s = dot( P.xyz, ro ) + P.w, den = dot( P.xyz, rd );\n\t\tif ( s > 1e-5 && den < -1e-6 ) { float t = -s / den; if ( t > tin ) { tin = t; ei = i; } }\n\t}\n' +
    '\tif ( tin < 0.0 ) {\n#ifdef CORE\n\t\tdiscard;\n#endif\n\t\treturn vec3( 0.0 ); }\n' +
    '\tvec3 ne = PL( ei ).xyz;\n\tgNe = ne;\n\tvec3 dl = refract( rd, ne, 1.0 / n );\n\tif ( dot( dl, dl ) < 1e-6 ) dl = rd;\n\tvec3 p = ro + rd * tin;\n\tvec3 acc = vec3( 0.0 ), ab = vec3( 1.0 );\n' +
    '\tfloat F0 = pow( ( n - 1.0 ) / ( n + 1.0 ), 2.0 );\n\tint skip = ei;\n\tfloat esc = 0.0;\n' +
    '\tfor ( int b = 0; b < 6; b++ ) {\n\t\tif ( float( b ) >= uBounce ) break;\n\t\tfloat t = 1e9;\n\t\tint hi = -1;\n' +
    '\t\tfor ( int i = 0; i < PLMAX; i++ ) {\n\t\t\tif ( i >= uCount || i == skip ) continue;\n\t\t\tvec4 P = PL( i );\n\t\t\tfloat den = dot( P.xyz, dl );\n\t\t\tif ( abs( den ) < 1e-6 ) continue;\n\t\t\tfloat ti = -( dot( P.xyz, p ) + P.w ) / den;\n\t\t\tif ( ti > 2e-3 && ti < t ) { t = ti; hi = i; }\n\t\t}\n' +
    '\t\tif ( hi < 0 ) break;\n\t\tp += dl * t;\n\t\tgTot += t;\n\t\tgNb += 1.0;\n\t\tab *= exp( -uK * ( t * uKS ) );\n\t\tvec3 nh = PL( hi ).xyz;\n\t\tfloat c = clamp( dot( dl, nh ), 0.0, 1.0 );\n' +
    '\t\tif ( n * n * ( 1.0 - c * c ) < 1.0 ) {\n\t\t\tfloat F = F0 + ( 1.0 - F0 ) * pow( 1.0 - c, 5.0 );\n\t\t\tacc += ( 1.0 - F ) * envR( refract( dl, -nh, n ), R ) * ab;\n\t\t\tesc = 1.0;\n\t\t\tbreak;\n\t\t}\n' +
    '\t\tdl = reflect( dl, nh );\n\t\tskip = hi;\n\t}\n' +
    '\tif ( esc < 0.5 ) acc += ab * envR( dl, R ) * 0.55;\n\tgAb = ab;\n\treturn acc;\n}\n' +
    'void main() {\n' +
    'vec3 w = normalize( vW - cameraPosition );\n' +
    // the plane set is object space, so one transform in and one out — no inverse matrix (and no ES-3 `inverse`).
    'float sc = length( uM[ 0 ].xyz );\n\tmat3 R = mat3( uM ) / sc;\n\tvec3 rel = cameraPosition - uM[ 3 ].xyz;\n' +
    '\tvec3 ro = vec3( dot( R[ 0 ], rel ), dot( R[ 1 ], rel ), dot( R[ 2 ], rel ) ) / sc;\n' +
    '\tvec3 rd = vec3( dot( R[ 0 ], w ), dot( R[ 1 ], w ), dot( R[ 2 ], w ) );\n' +
    // one path per wavelength: R at n(1-s), B at n(1+s); G last so gAb/gTot describe the base index.
    '\tvec3 acc; if ( uTaps < 2.0 ) acc = tr( ro, rd, ior, R );\n\telse {\n' +
    '\t\tvec3 c0 = tr( ro, rd, ior * ( 1.0 - uSpread ), R ), c4 = tr( ro, rd, ior * ( 1.0 + uSpread ), R ), c2 = tr( ro, rd, ior, R );\n' +
    '\t\tif ( uTaps > 4.0 ) {\n\t\t\tc0 = mix( c0, tr( ro, rd, ior * ( 1.0 - 0.45 * uSpread ), R ), 0.5 );\n\t\t\tc4 = mix( c4, tr( ro, rd, ior * ( 1.0 + 0.45 * uSpread ), R ), 0.5 );\n\t\t}\n\t\tacc = vec3( c0.r, c2.g, c4.b );\n\t}\n' +
    '\tif ( dbg > 0.5 ) { gl_FragColor = vec4( gTot / 3.0, gNb / 3.0, 1.0 - gAb.g, 1.0 ); return; }\n' +
    '\tvec3 lin = acc * uExp + uAmb * ( 1.0 - gAb ) * tint;\n#ifdef CORE\n\tfloat cf = clamp( -dot( rd, gNe ), 0.0, 1.0 );\n\tfloat Ff = pow( ( ior - 1.0 ) / ( ior + 1.0 ), 2.0 );\n\tFf = Ff + ( 1.0 - Ff ) * pow( 1.0 - cf, 5.0 );\n\tlin = Ff * envR( reflect( rd, gNe ), R ) + ( 1.0 - Ff ) * lin;\n#endif\n' +
    '\tgl_FragColor = vec4( clamp( pow( aces( lin ), vec3( 1.0 / uGam ) ), 0.0, 1.0 ), 1.0 );\n}';
api.setup = function () {   // build the plane set once from the shared cut — same 136 vertices / 268 triangles
const C = window.GEM_CUT;
if (!window.GEM_FACETS || !C || !C.gemCut) return 0; return window.GEM_FACETS.build(C.gemCut(C.CUT)).count;
};
api.farside = function (opts) {
const o = opts || {};
const env = o.envMap && o.envMap.image && o.envMap.image.height ? o.envMap : null;
const defines = o.core ? { CORE: 1 } : {}; if (env) {
const h = env.image.height, maxMip = Math.log2(h) - 2;
defines.ENVMAP_TYPE_CUBE_UV = '';
defines.CUBEUV_TEXEL_WIDTH = 1 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16));
defines.CUBEUV_TEXEL_HEIGHT = 1 / h;
defines.CUBEUV_MAX_MIP = maxMip + '.0';
}
defines.PLMAX = api.setup() || 8; const ramp = o.ramp || {};
const rc = function (k, d) { return ramp[k] && ramp[k].isColor ? ramp[k] : new T.Color(d[0], d[1], d[2]); };
const sm = new T.ShaderMaterial({ side: o.core ? T.FrontSide : T.BackSide, defines: defines, uniforms: {
envMap: { value: env }, stageTex: { value: o.stageTex || null }, stageOn: { value: o.stageTex ? 1 : 0 },
winGain: { value: OD.reflect.win }, ior: { value: o.ior || OD.n.trace }, dbg: { value: 0 }, gain: { value: OD.reflect.mirror },
tint: { value: (o.tint && o.tint.isColor) ? o.tint : new T.Color(0.11, 0.29, 0.83) },
rampDeep: { value: rc('deep', [0.031, 0.09, 0.345]) }, rampMid: { value: rc('mid', [0.11, 0.29, 0.83]) },
rampLite: { value: rc('lite', [0.42, 0.47, 0.62]) }, rampPink: { value: rc('pink', [0.85, 0.48, 0.78]) },
uPl: { value: null }, uPlTex: { value: null }, uCount: { value: defines.PLMAX },
uK: { value: new T.Vector3(1, 1, 1) }, uM: { value: new T.Matrix4() }, uKS: { value: OD.absorb.scale }, uExp: { value: OD.light.exp }, uGam: { value: OD.light.gam }, uAmb: { value: OD.light.amb },
uCr: { value: OD.reflect.crisp }, uBr: { value: OD.reflect.broad }, uLu: { value: OD.reflect.luma }, uLuB: { value: OD.reflect.lumaB }, uSh: { value: OD.reflect.shK }, uBounce: { value: OD.reflect.bounce }, uSpread: { value: OD.fire ? OD.fire.spread : 0 }, uTaps: { value: OD.fire ? OD.fire.taps : 3 },
uKey: { value: o.key || new T.Vector4(3, 5, 4, 0.55) },
}, vertexShader: VS, fragmentShader: HEAD + BODY });
sm.userData = { can: o.can };
if (window.GEM_FACETS) window.GEM_FACETS.set(sm, o.can);
api.aim(sm);
return sm;
};
api.core = function (opts) { return api.farside(Object.assign({}, opts || {}, { core: 1 })); };
// aim(mesh) is gem-scene's onBeforeRender hook: push κ, fit and every optical uniform when the category changed.
api.aim = function (mesh) {
const m = mesh && mesh.material, u = m && m.uniforms; if (!u || !u.uK) return;
u.uM.value.copy(mesh.matrixWorld);
const cat = (m.userData.can && m.userData.can.dataset.gem) || 'sapphire';
const O = window.GEM_OPTICS ? window.GEM_OPTICS.of(cat) : null;
if (O) { u.uSpread.value = O.fire.spread; u.uTaps.value = O.fire.taps; }
if (api._cat === cat) return;
api._cat = cat;
const F = O ? { e: O.light.exp, g: O.light.gam, k: O.absorb.scale } : (api.FIT[cat] || api.FIT.sapphire);
if (window.GEM_FACETS) { const k = window.GEM_FACETS.k3(cat); u.uK.value.set(k[0], k[1], k[2]); }
u.uExp.value = F.e; u.uGam.value = F.g; u.uKS.value = F.k;
if (O) { u.uAmb.value = O.light.amb; u.gain.value = O.reflect.mirror; u.winGain.value = O.reflect.win; u.uCr.value = O.reflect.crisp; u.uBr.value = O.reflect.broad; u.uLu.value = O.reflect.luma; u.uLuB.value = O.reflect.lumaB; u.uSh.value = O.reflect.shK; u.uBounce.value = O.reflect.bounce; u.ior.value = O.n.trace; }
};
})();
