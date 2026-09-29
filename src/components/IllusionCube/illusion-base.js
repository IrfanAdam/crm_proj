/* ADAM/SHARED — src/components/IllusionCube/illusion-base.js · plinth sheen stack */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-3}] · Task 21: matte slab.
// — Stack: fresnel-black overlay, sheen matcap on uSheenRot, matcaps, base gray —
// —   181 to 87 degrees in one uniform; phase 4 tweens it once, solid body —
// Export map: ILLUSION_BASE.material(tex) → ShaderMaterial (uSheenRot live)
(function () {
if (!window.THREE || !window.ILLUSION_GL) return;
const T = window.THREE;
const G = window.ILLUSION_GL;
// — Vertex: object pos + view normal —
const VERT = [
'varying vec3 vObj; varying vec3 vN;',
'void main(){vObj=position;vN=normalize(normalMatrix*normal);',
'gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'].join('\n');
// — Fragment: black fresnel, sheen sweep, matcap stack, gray body, glass rim —
const FRAG = [G.FRESNEL, G.MATCAP, G.BLEND,
'uniform sampler2D uSheen,uM0,uM5; uniform vec3 uTint,uGray; uniform float uSheenRot,uAlpha;',
'varying vec3 vObj; varying vec3 vN;',
'void main(){',
'vec3 V=vec3(0.0,0.0,1.0); vec3 N=normalize(vN);',
'vec3 col=vec3(0.78,0.81,0.85);',
'col=blendm(col,vec3(0.0),fres(N,V,0.1,1.0,2.0),3.0);',
'vec2 suv=matUV(N.xy,uSheenRot);',
'col=blendm(col,texture2D(uSheen,suv).rgb,0.6,3.0);',
'vec2 muv=matUV(N.xy,0.0);',
'col=blendm(col,texture2D(uM0,muv).rgb,1.0,2.0);',
'col=blendm(col,texture2D(uM5,muv).rgb*uTint,0.5,2.0);',
'col=mix(col,uGray,0.32);',
'gl_FragColor=vec4(col,uAlpha);',
'#include <colorspace_fragment>',
'}'].join('\n');
// — Material: single sheen uniform carries the idle animation —
const api = {};
api.material = function (tex) {
const U = { uSheenRot: { value: window.ILLUSION_TEX.rad(181) }, uAlpha: { value: 1 } };
U.uSheen = { value: tex.sheen };
U.uM0 = { value: tex.matcap0 };
U.uM5 = { value: tex.matcap5 };
U.uTint = { value: new T.Color(ILLUSION_SCENE.tok('--primitive-illusion-sheen-gray', 0x48484d)) };
U.uGray = { value: new T.Color(ILLUSION_SCENE.tok('--primitive-illusion-base-gray', 0xc7d1c1)) };
const m = new T.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG,
transparent: true, depthWrite: true });
m.toneMapped = false;
return m;
};
window.ILLUSION_BASE = api;
})();
