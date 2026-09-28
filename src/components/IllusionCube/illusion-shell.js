/* ADAM/SHARED — src/components/IllusionCube/illusion-shell.js · Main alpha glass */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-3}] · Task 19: 9-layer stack.
// — Alpha glass, never transmission: r160's transmission pass drops transparent interiors —
// —   renderOrder 4 (mesh), after the inner cubes at 2; handles stay live for phase 4 —
// Export map: ILLUSION_SHELL.material(tex) → ShaderMaterial (uTime…uOpacity live)
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
// — Fragment: noise ramp x2, rim, matcaps, band, sheen, glass wash —
const FRAG = [G.NOISE, G.WARP, G.RAMP4, G.BLEND, G.FRESNEL, G.MATCAP,
'uniform float uTime,uMoveA,uMoveB,uScaleA,uScaleB,uAlphaA,uAlphaB,uMatRot,uOpacity;',
'uniform vec3 uPal[9]; uniform sampler2D uPhoto,uM4,uM5,uRefl;',
'varying vec3 vObj; varying vec3 vN;',
'void main(){',
'vec3 V=vec3(0.0,0.0,1.0); vec3 N=normalize(vN);',
'float nA=fbm(warpPos(vObj*uScaleA,uTime*uMoveA));',
'float nB=fbm(warpPos(vObj*uScaleB+7.3,uTime*uMoveB));',
'vec3 rA=ramp4(nA,uPal[0],uPal[1],uPal[2],uPal[3]);',
'vec3 rB=ramp4(nB,uPal[0],uPal[1],uPal[2],uPal[3]);',
'vec3 col=blendm(rB,rA,uAlphaA,2.0);',
'float fr=fres(N,V,0.1,1.0,2.0);',
'col+=uPal[4]*fr;',
'vec2 muv=matUV(N.xy,uMatRot);',
'col+=texture2D(uPhoto,muv).rgb*0.24+texture2D(uM4,muv).rgb*0.54;',
'col+=texture2D(uM5,muv).rgb*uPal[8]*0.24;',
'float band=smoothstep(-70.0,-30.0,vObj.y)*(1.0-smoothstep(30.0,70.0,vObj.y));',
'col+=texture2D(uRefl,muv).rgb*band;',
'vec3 L=normalize(vec3(0.83,0.46,0.22)); vec3 H=normalize(L+V);',
'col+=vec3(1.0)*pow(max(dot(N,H),0.0),40.0)*0.6;',
'vec3 glass=mix(uPal[5],mix(uPal[6],uPal[7],nB),clamp(fr,0.0,1.0));',
'col=mix(col,glass,clamp(fr*uOpacity,0.0,1.0));',
'gl_FragColor=vec4(col,uOpacity);',
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
U.uOpacity = { value: 0.55 };
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
