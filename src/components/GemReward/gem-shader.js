/* ADAM/SHARED — src/components/GemReward/gem-shader.js · analytic interior optics */
// — farside(opts): opaque BackSide ShaderMaterial (core(opts) renders the same tracer FrontSide as the VISIBLE stone,
// —   with the entry Fresnel term). The view ray bends at the entry facet it really crosses, then runs through the cut
// —   as a PLANE SET (gem-facets.js): the nearest plane with t > 0 is the next real facet, so the far side is exact
// —   geometry. Up to uBounce bounces, Schlick Fresnel + true TIR per hit, Beer–Lambert along the path with κ from the
// —   measured hue/sat, per-wavelength ior (uSpread/uTaps) so fire comes from refraction, and a key emitter (uKey). r18/m: the entry clamps to the fragment's own surface (vO) when the plane-set winner is >2.5× deeper — this cut is concave, so max-t can start the trace behind the visible facet and the path absorbs to black.
(function () {
const api = {};
window.GEM_SHADER = api;
api.dispersion = window.GEM_SHADER_BODY && window.GEM_SHADER_BODY.dispersion;
if (!window.THREE) return;
const T = window.THREE;
const OD = (window.GEM_OPTICS && window.GEM_OPTICS.of('sapphire')) || { n: { trace: 2.4 }, reflect: { crisp: 0.05, broad: 0.30, luma: 0.55, lumaB: 0.85, shK: 0.9, bounce: 3, mirror: 2.2, win: 1.8 }, absorb: { scale: 1 }, light: { exp: 1, gam: 1, amb: 0.1 } };
api.FIT = { sapphire: { e: 5.00, g: 0.74, k: 1.00 }, citrine: { e: 3.80, g: 0.74, k: 0.55 }, amethyst: { e: 2.85, g: 0.74, k: 1.10 }, redberyl: { e: 1.80, g: 0.74, k: 0.60 } }; api.AMB = 0.10;
const { VS, HEAD, BODY } = window.GEM_SHADER_EXT;
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
uK: { value: new T.Vector3(1, 1, 1) }, uM: { value: new T.Matrix4() }, uKS: { value: OD.absorb.scale }, uExp: { value: OD.light.exp }, uGam: { value: OD.light.gam }, uAmb: { value: OD.light.amb }, uSw: { value: 0.35 }, uBk: { value: 0.0 }, uRf: { value: 0 }, uFg: { value: 0 }, uFt: { value: new T.Vector3(1, 1, 1) },
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
if (O) { u.uAmb.value = O.light.amb; u.uFg.value = O.fill.gain; u.gain.value = O.reflect.mirror; u.winGain.value = O.reflect.win; u.uCr.value = O.reflect.crisp; u.uBr.value = O.reflect.broad; u.uLu.value = O.reflect.luma; u.uLuB.value = O.reflect.lumaB; u.uSh.value = O.reflect.shK; u.uBounce.value = O.reflect.bounce; u.ior.value = O.n.trace; const ft = O.fill.tint; u.uFt.value.set(ft[0], ft[1], ft[2]); }
};
})();
