/* ADAM/SHARED — src/components/IllusionCube/illusion-inner.js · gooey amorphous inners */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-7}] · frosted-gooey redesign.
// — Blobs: vertex-noise-displaced organic forms; 4 crystal hues; lit-from-within emissive —
// Export map: ILLUSION_INNER.material() → ShaderMaterial · .materialFor(i) per-cube hue
(function () {
if (!window.THREE || !window.ILLUSION_GL) return;
const T = window.THREE;
const G = window.ILLUSION_GL;
// — Hues: sapphire / citrine / amethyst / rose crystal families (token + fallback) —
const HUES = [
['--primitive-sapphire-400', 0x218aea, '--primitive-sapphire-200', 0xc1e0fd],
['--primitive-citrine-400', 0xffb01e, '--primitive-citrine-200', 0xffe0a3],
['--primitive-amethyst-400', 0xa54cff, '--primitive-amethyst-200', 0xdebeff],
['--primitive-red-beryl-400', 0xea005e, '--primitive-red-beryl-200', 0xffaac5]];
// — PER-FRAME: caller sets mat.uniforms.uTime.value = t each frame (mutate the —
// —   scalar in place; never reassign uniform objects — zero per-frame allocation). —
// —   uSeed / uAmp / uColA / uColB / uGlow are static per cube; only uTime animates. —
// — Vertex: trig-noise goo displacement along the normal (rounded organic wobble) —
const VERT = [
'uniform float uTime; uniform float uSeed; uniform float uAmp;',
'varying vec3 vN; varying float vWob;',
'void main(){',
'float w=sin(position.x*1.7+uTime*1.3+uSeed)*sin(position.y*2.3-uTime*1.1+uSeed*1.7);',
'w*=sin(position.z*1.9+uTime*0.9+uSeed*2.3);',
'float w2=sin(position.y*3.1+uTime*1.7+uSeed*3.1)*0.5+sin(position.x*2.2-uTime*1.3+uSeed)*0.5;',
'vec3 p=position+normal*(w*uAmp+w2*uAmp*0.35);',
'vWob=w*0.5+0.5; vN=normalize(normalMatrix*normal);',
'gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}'].join('\n');
// — Fragment: hue gradient by wobble, emissive core, spec lift, hue fresnel rim —
const FRAG = [G.FRESNEL,
'uniform vec3 uColA,uColB,uGlow;',
'uniform float uTime;',
'varying vec3 vN; varying float vWob;',
'void main(){',
'vec3 N=normalize(vN); vec3 V=vec3(0.0,0.0,1.0);',
'vec3 col=mix(uColA,uColB,vWob);',
'col+=uGlow*(0.35+0.25*vWob);',
'vec3 L=normalize(vec3(0.83,0.46,0.22)); vec3 H=normalize(L+V);',
'col+=vec3(1.0)*pow(max(dot(N,H),0.0),10.0)*0.5;',
'col+=uColB*fres(N,V,0.1,1.0,1.0)*0.45;',
'gl_FragColor=vec4(col,1.0);',
'#include <colorspace_fragment>',
'}'].join('\n');
// — Material: fresh uniforms per cube so phase 4 tweens each blob alone —
const api = {};
api.materialFor = function (i) {
const k = ((i || 0) % 4 + 4) % 4;
const h = HUES[k];
const S = window.ILLUSION_SCENE;
const U = { uTime: { value: 0 } };
U.uSeed = { value: 0.3 + k * 1.7 };
U.uAmp = { value: 1.6 };
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
window.ILLUSION_INNER = api;
})();
