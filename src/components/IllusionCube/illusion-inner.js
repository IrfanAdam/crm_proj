/* ADAM/SHARED — src/components/IllusionCube/illusion-inner.js · morphing goo blobs */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-7}] · [plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-3}] · goo morph + glow.
// — Morph: fbm domain-warp lobes that form and dissolve (NOT a vibration) + fine ripple —
// —   displacement rides the blob's analytic radial normal, so the goo cannot facet —
// — Glow: emissive core + hue fresnel rim, in-shader pulse 0.85+0.15·sin(t·0.6+seed·3) —
// — Halo: additive radial sprite per blob hue, built here, attached as a mesh child —
// Export map: ILLUSION_INNER.material() · .materialFor(i) · .touch(mats,t) · .haloFor(i)
(function () {
if (!window.THREE || !window.ILLUSION_GL) return;
const T = window.THREE;
const G = window.ILLUSION_GL;
// — Hues: sapphire / citrine / amethyst / rose crystal families (token + fallback) —
const HUES = [
['--primitive-sapphire-400', 0x218aea, '--primitive-sapphire-200', 0xc1e0fd], ['--primitive-citrine-400', 0xffb01e, '--primitive-citrine-200', 0xffe0a3],
['--primitive-amethyst-400', 0xa54cff, '--primitive-amethyst-200', 0xdebeff], ['--primitive-red-beryl-400', 0xea005e, '--primitive-red-beryl-200', 0xffaac5]];
// — PER-FRAME: caller sets mat.uniforms.uTime.value = t each frame (mutate the —
// —   scalar in place; never reassign uniform objects — zero per-frame allocation). —
// —   uSeed 0.3+1.7k · uAmp = MORPH SCALE (1.0 = spec amps: 0.22·r lobe, 0.05·r ripple) —
// — Vertex: warp the local position, read two fbm fields off it, displace radially —
const VERT = [G.NOISE, G.WARP,
'uniform float uTime; uniform float uSeed; uniform float uAmp;',
'varying vec3 vN; varying float vM; void main(){',
'vec3 n=normalize(position); float rn=length(position);',
'vec3 q=warpPos(position*0.024+vec3(0.0,uTime*0.06,0.0),uTime*1.1+uSeed*2.0);',
'float lo=fbm(q+vec3(uTime*0.30,uSeed,-uTime*0.22));',
'float ri=fbm(q*3.4-vec3(0.0,uTime*0.55,uTime*0.40));',
'float m=smoothstep(0.32,0.68,lo);',
'float d=(m-0.5)*0.44+(ri-0.5)*0.10;',
'vec3 p=position+n*(d*rn*uAmp);',
'vM=m; vN=normalize(normalMatrix*n);',
'gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}'].join('\n');
// — Fragment: hue ramp by morph value, emissive core, in-shader pulse, spec + fresnel rim —
const FRAG = [G.FRESNEL,
'uniform vec3 uColA,uColB,uGlow; uniform float uTime,uSeed;',
'varying vec3 vN; varying float vM; void main(){',
'vec3 N=normalize(vN); vec3 V=vec3(0.0,0.0,1.0); float mv=clamp(vM,0.0,1.0);',
'float pulse=0.85+0.15*sin(uTime*0.6+uSeed*3.0);',
'float fr=fres(N,V,0.1,1.0,1.0);',
'vec3 col=mix(uColA,uColB,mv);',
'col+=uGlow*pulse*(0.55+0.45*(1.0-mv)+0.75*fr);',
'vec3 L=normalize(vec3(0.83,0.46,0.22)); vec3 H=normalize(L+V);',
'col+=vec3(1.0)*pow(max(dot(N,H),0.0),10.0)*0.5;',
'col+=uColB*pulse*fr*0.45;',
'gl_FragColor=vec4(col,1.0);',
"#include <colorspace_fragment>",
'}'].join('\n');
// — Material: fresh uniforms per cube so phase 4 tweens each blob alone —
const api = {};
api.materialFor = function (i) {
const k = ((i || 0) % 4 + 4) % 4;
const h = HUES[k];
const S = window.ILLUSION_SCENE;
const U = { uTime: { value: 0 } };
U.uSeed = { value: 0.3 + k * 1.7 };
U.uAmp = { value: 1.0 };
U.uColA = { value: new T.Color(S.tok(h[0], h[1])) };
U.uColB = { value: new T.Color(S.tok(h[2], h[3])) };
U.uGlow = { value: new T.Color(S.tok(h[0], h[1])) };
const m = new T.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG });
m.toneMapped = false;
return m;
};
api.material = function () { return api.materialFor(0); };
// — Touch: zero-alloc per-frame driver — parent calls touch(cubeMats, t) in step —
api.touch = function (mats, t) {
for (let k = 0; k < mats.length; k++) { mats[k].uniforms.uTime.value = t; }
};
// — Halo: soft radial of the blob's own hue, 128² canvas, drawn token-only (no —
// —   colour literals) as stacked arcs; cached per hue, built once at assembly —
const HALS = 4;
const halo = [];
const haloTex = function (k) {
if (halo[k]) return halo[k];
const c = document.createElement('canvas');
c.width = 128; c.height = 128;
const x = c.getContext('2d');
x.fillStyle = window.ILLUSION_SCENE.tok(HUES[k][0], HUES[k][1]);
for (let j = 1; j <= 20; j++) {
const t = j / 20;
x.globalAlpha = t * t * 0.11;
x.beginPath(); x.arc(64, 64, 64 * t, 0, Math.PI * 2); x.fill();
}
const tex = new T.CanvasTexture(c);
tex.colorSpace = T.SRGBColorSpace;
halo[k] = tex;
return tex;
};
// — haloFor(i) → Sprite child of blob i: additive, no depth write, soft 4·r spread —
api.haloFor = function (i) {
const k = ((i || 0) % 4 + 4) % 4;
const mat = new T.SpriteMaterial({ map: haloTex(k), transparent: true, depthWrite: false });
mat.blending = T.AdditiveBlending; mat.opacity = 0.32; mat.toneMapped = false;
const sp = new T.Sprite(mat);
sp.scale.set(HALS * 60.0428, HALS * 60.0428, 1);
sp.renderOrder = 1;
return sp;
};
window.ILLUSION_INNER = api;
})();
