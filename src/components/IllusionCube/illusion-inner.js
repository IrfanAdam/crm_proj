/* ADAM/SHARED — src/components/IllusionCube/illusion-inner.js · cube depth gradients */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-3}] · Task 20: payload bands.
// — Bands: three object-space vector gradients; leading-stop alpha 0 fades each in —
// —   fresh uniforms per cube (shared uuid, cloned per instance — phase 4 tweens them) —
// Export map: ILLUSION_INNER.material(tex) → ShaderMaterial (opaque, order set on mesh)
(function () {
if (!window.THREE || !window.ILLUSION_GL) return;
const T = window.THREE;
const G = window.ILLUSION_GL;
const COLS = [['--primitive-amethyst-400', 0xa54cff], ['--primitive-illusion-plum', 0xa50b7e]];
COLS.push(['--primitive-citrine-400', 0xffb01e], ['--primitive-red-beryl-400', 0xea005e]);
COLS.push(['--primitive-red-beryl-500', 0xbd004b], ['--primitive-illusion-brand-blue', 0x1666af]);
// — Vertex: object pos + view normal —
const VERT = [
'varying vec3 vObj; varying vec3 vN;',
'void main(){vObj=position;vN=normalize(normalMatrix*normal);',
'gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'].join('\n');
// — Fragment: three vector bands, phong lift, fresnel white wash —
const FRAG = [G.VECGRAD, G.BLEND, G.FRESNEL,
'uniform vec3 uO1,uO2,uO3,uC1a,uC1b,uC2a,uC2b,uC3a,uC3b;',
'uniform float uN1,uF1,uN2,uF2,uN3,uF3;',
'uniform vec2 uS1,uS2,uS3;',
'varying vec3 vObj; varying vec3 vN;',
'void main(){',
'vec3 X=vec3(1.0,0.0,0.0);',
'float g1=vecgrad(vObj,uO1,X,uN1,uF1,uS1.x,uS1.y);',
'float g2=vecgrad(vObj,uO2,X,uN2,uF2,uS2.x,uS2.y);',
'float g3=vecgrad(vObj,uO3,X,uN3,uF3,uS3.x,uS3.y);',
'vec3 col=mix(uC1a,uC1b,g1);',
'col=mix(col,mix(uC2a,uC2b,g2),g2);',
'col=blendm(col,mix(uC3a,uC3b,g3),g3,1.0);',
'vec3 N=normalize(vN); vec3 V=vec3(0.0,0.0,1.0);',
'vec3 L=normalize(vec3(0.83,0.46,0.22)); vec3 H=normalize(L+V);',
'col+=vec3(1.0)*pow(max(dot(N,H),0.0),10.0)*0.5;',
'col+=vec3(1.0)*fres(N,V,0.1,1.0,1.0)*0.35;',
'gl_FragColor=vec4(col,1.0);',
'#include <colorspace_fragment>',
'}'].join('\n');
// — Material: fresh block per cube so phase 4 owns each band —
const api = {};
api.material = function () {
const C = function (i) { return new T.Color(ILLUSION_SCENE.tok(COLS[i][0], COLS[i][1])); };
const U = { uO1: { value: new T.Vector3(-2, -15, 10) }, uN1: { value: 61.15 } };
U.uF1 = { value: 200 };
U.uS1 = { value: new T.Vector2(0.1038, 0.2546) };
U.uC1a = { value: C(0) };
U.uC1b = { value: C(1) };
U.uO2 = { value: new T.Vector3(14, 17, -2) };
U.uN2 = { value: 45.15 };
U.uF2 = { value: 200 };
U.uS2 = { value: new T.Vector2(0.1038, 0.3462) };
U.uC2a = { value: new T.Color(1, 1, 1) };
U.uC2b = { value: C(2) };
U.uO3 = { value: new T.Vector3(9, -14, -67) };
U.uN3 = { value: 94.15 };
U.uF3 = { value: 199 };
U.uS3 = { value: new T.Vector2(0.2615, 0.373) };
U.uC3a = { value: C(3) };
U.uC3b = { value: C(4) };
const m = new T.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG });
m.toneMapped = false;
return m;
};
window.ILLUSION_INNER = api;
})();
