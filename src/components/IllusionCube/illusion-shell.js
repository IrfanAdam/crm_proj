/* ADAM/SHARED — src/components/IllusionCube/illusion-shell.js · thick frosted shell */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-7}] · Task B: frosted-gooey.
// — Thick frosted glass: noise-perturbed normals + fresnel milky rim + uOpacity 0.85 —
// — Mesh gradient: DS token ramp drifting on uTime*uDrift across the frost surface —
// Export map: ILLUSION_SHELL.material(tex) → ShaderMaterial (uTime…uMilky live)
(function () {
if (!window.THREE || !window.ILLUSION_GL) return;
const T = window.THREE;
const G = window.ILLUSION_GL;
const PAL = [['--primitive-illusion-brand-blue', 0x1666af], ['--primitive-illusion-crimson', 0xc21645]];
PAL.push(['--primitive-illusion-amber', 0xc69e14], ['--primitive-illusion-magenta', 0xc11d88]);
PAL.push(['--primitive-illusion-rim-blue', 0x0051e3], ['--primitive-illusion-glass-lo', 0x003bff]);
PAL.push(['--primitive-illusion-glass-mid', 0x00edff], ['--primitive-illusion-glass-hi', 0xb500ff]);
PAL.push(['--primitive-illusion-sheen-gray', 0x48484d]);
// — Vertex: object pos + view normal —
const VERT = [
'varying vec3 vObj; varying vec3 vN;',
'void main(){vObj=position;vN=normalize(normalMatrix*normal);',
'gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'].join('\n');
// — Fragment: frost-perturbed normals, drifting mesh gradient, milky fresnel rim —
// — Driven uniforms (mainStep): uTime uScaleA uMoveA uAlphaA uScaleB uMoveB uAlphaB —
// — New uniforms (parent may drive; else defaults hold): uFrost frost strength —
// —   uDrift mesh-gradient hue-drift speed, uMilky milk wash + rim strength —
const FRAG = [G.NOISE, G.WARP, G.RAMP4, G.BLEND, G.FRESNEL, G.MATCAP,
'uniform float uTime,uMoveA,uMoveB,uScaleA,uScaleB,uAlphaA,uAlphaB,uMatRot,uOpacity;',
'uniform float uFrost,uDrift,uMilky;',
'uniform vec3 uPal[9]; uniform sampler2D uPhoto,uM4,uM5,uRefl;',
'varying vec3 vObj; varying vec3 vN;',
'void main(){',
'vec3 V=vec3(0.0,0.0,1.0);',
'vec3 N=normalize(vN);',
'vec3 fp=warpPos(vObj*uScaleB*2.0,uTime*uMoveB*2.0);',
'float f1=fbm(fp);',
'float f2=fbm(fp+13.1);',
'N=normalize(N+vec3(f1-0.5,f2-0.5,(f1-f2)*0.5)*uFrost);',
'vec3 dp=warpPos(vObj*uScaleA*0.45+vec3(0.0,uTime*uDrift,0.0),uTime*0.05);',
'float d1=fbm(dp);',
'vec3 dq=warpPos(vObj*uScaleB*0.4+vec3(uTime*uDrift*0.7,3.7,0.0),-uTime*0.04);',
'float d2=fbm(dq);',
'vec3 rA=ramp4(d1,uPal[0],uPal[1],uPal[2],uPal[3]);',
'vec3 rB=ramp4(d2,uPal[5],uPal[6],uPal[7],uPal[3]);',
'vec3 col=blendm(rB,rA,uAlphaA,2.0);',
'vec2 muv=matUV(N.xy,uMatRot);',
'muv+=(vec2(f1,f2)-0.5)*uFrost*0.6;',
'col+=texture2D(uPhoto,muv).rgb*0.10+texture2D(uM4,muv).rgb*0.18;',
'col+=texture2D(uM5,muv).rgb*uPal[8]*0.10;',
'float fr=fres(N,V,0.1,1.0,2.0);',
'col+=texture2D(uRefl,muv).rgb*0.06*fr;',
'vec3 milk=blendm(uPal[8],vec3(1.0),0.85,2.0);',
'col=mix(col,milk,clamp(uMilky*(0.22+0.78*fr),0.0,1.0));',
'vec3 L=normalize(vec3(0.83,0.46,0.22));',
'vec3 H=normalize(L+V);',
'col+=milk*pow(max(dot(N,H),0.0),24.0)*0.35;',
'float alpha=clamp(uOpacity+fr*uMilky*0.4,0.0,1.0);',
'gl_FragColor=vec4(col,alpha);',
'#include <colorspace_fragment>',
'}'].join('\n');
// — Material: one fresh ShaderMaterial, animation handles live —
const api = {};
api.material = function (tex) {
const U = { uTime: { value: 0 }, uMoveA: { value: 4.1 }, uMoveB: { value: -0.04 } };
U.uScaleA = { value: 1.37 };
U.uScaleB = { value: 1.78 };
U.uAlphaA = { value: 0.32 };
U.uAlphaB = { value: 0.32 };
U.uMatRot = { value: window.ILLUSION_TEX.rad(39) };
U.uOpacity = { value: 0.7 };
U.uFrost = { value: 1.4 };
U.uDrift = { value: 0.05 };
U.uMilky = { value: 0.5 };
U.uPal = { value: PAL.map(function (e) { return new T.Color(ILLUSION_SCENE.tok(e[0], e[1])); }) };
U.uPhoto = { value: tex.photo };
U.uM4 = { value: tex.matcap4 };
U.uM5 = { value: tex.matcap5 };
U.uRefl = { value: tex.reflection };
const m = new T.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG,
transparent: true, depthWrite: false, side: T.FrontSide });
m.toneMapped = false;
return m;
};
window.ILLUSION_SHELL = api;
})();
