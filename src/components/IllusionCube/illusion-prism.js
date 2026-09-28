/* ADAM/SHARED — src/components/IllusionCube/illusion-prism.js · streak material */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-3}] · Task 23: mask x matcap.
// — Alpha: VECGRAD mask times the 0.32 override; geometry untouched from phase 2 —
// Export map: ILLUSION_PRISM.build(scene, tex) → mesh (uRot live, default -227)
(function () {
if (!window.THREE || !window.ILLUSION_GL) return;
const T = window.THREE;
const G = window.ILLUSION_GL;
const api = {};
// — Vertex: object pos + view normal for the matcap —
const VERT = [
'varying vec3 vObj; varying vec3 vN;',
'void main(){vObj=position;vN=normalize(normalMatrix*normal);',
'gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'].join('\n');
// — Fragment: vector mask, photo matcap sweep, override alpha —
const FRAG = [G.VECGRAD, G.MATCAP,
'uniform sampler2D uTex; uniform float uRot,uAlpha;',
'varying vec3 vObj; varying vec3 vN;',
'void main(){',
'float mask=1.0-vecgrad(vObj,vec3(143.9266,0.0,0.0),vec3(1.0,0.0,0.0),11.3091,214.4368,0.0,1.0);',
'vec3 mc=texture2D(uTex,matUV(normalize(vN).xy,uRot)).rgb;',
'gl_FragColor=vec4(mc,mask*uAlpha);',
'#include <colorspace_fragment>',
'}'].join('\n');
// — Build: exact phase-2 quad, repainted —
api.build = function (scene, tex) {
const geo = new T.PlaneGeometry(921.2535744979286, 1082.0878980260457, 8, 8);
const U = { uTex: { value: tex.photo }, uAlpha: { value: 0.32 } };
U.uRot = { value: window.ILLUSION_TEX.rad(-227) };
const mat = new T.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG,
transparent: true, depthWrite: false });
mat.toneMapped = false;
const mesh = new T.Mesh(geo, mat);
mesh.position.set(-194.01257223931134, 0.7191718729590956, -8.388145252858408);
mesh.rotation.x = -Math.PI / 2;
mesh.renderOrder = 1;
mesh.receiveShadow = true;
mesh.castShadow = false;
scene.add(mesh);
return mesh;
};
window.ILLUSION_PRISM = api;
})();
