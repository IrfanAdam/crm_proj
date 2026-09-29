/* ADAM/SHARED — src/components/IllusionCube/illusion-shell.js · frosted shell (frost pass) */
// [plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-4}] · Task 12: grain down, frost in, metal on.
// — Smooth frosted glass: one large soft normal-wave field + the half-res blurred backdrop —
// —   (uBackdrop/uScr/uRefr/uBackdropMix) + wide/tight cool metal lobes on the rim —
// — Dropped: the ramp4 mesh-gradient drift — the body's colour is the goo's glow through the frost —
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
// — Vertex: object pos + view normal + screen uv for the frost sample —
const VERT = [
'varying vec3 vObj; varying vec3 vN; varying vec2 vScr;',
'void main(){vObj=position;vN=normalize(normalMatrix*normal);',
'vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);',
'vScr=p.xy/p.w*0.5+0.5;',
'gl_Position=p;}'].join('\n');
// — Fragment: calm frosted glass, blurred-backdrop transmission, subtle cool metal —
// — Driven uniforms (mainStep): uTime uScaleA uMoveA uAlphaA uScaleB uMoveB uAlphaB —
// —   they now only carry the surface's slow micro-shimmer —
// — Frost uniforms: uBackdrop blurred backdrop, uScr drawing-buffer px, uRefr refraction px —
// —   uBackdropMix the frost on/off handle; uFrost normal waves, uMilky milk wash + rim —
const FRAG = [G.NOISE, G.WARP, G.BLEND, G.FRESNEL, G.MATCAP,
'uniform float uTime,uMoveA,uMoveB,uScaleA,uScaleB,uAlphaA,uAlphaB,uMatRot,uOpacity;',
'uniform float uFrost,uMilky,uRefr,uBackdropMix;',
'uniform vec3 uPal[9]; uniform sampler2D uPhoto,uM4,uM5,uRefl,uBackdrop; uniform vec2 uScr;',
'varying vec3 vObj; varying vec3 vN; varying vec2 vScr;',
'void main(){',
'vec3 V=vec3(0.0,0.0,1.0);',
'vec3 s1=warpPos(vObj*0.03,uTime*uMoveB*1.6);',
'float f1=noise(s1*uScaleB*0.3);',
'float f2=noise(s1.zxy*uScaleA*0.32+vec3(9.1,4.3,2.7));',
'vec3 N=normalize(normalize(vN)+vec3(f1-0.5,f2-0.5,(f1-f2)*0.5)*uFrost);',
'float fr=fres(N,V,0.1,1.0,2.0);',
'float sh=0.45+0.55*clamp(fr,0.0,1.0);',
'vec3 milk=blendm(uPal[8],vec3(1.0),0.85,2.0);',
'vec2 muv=matUV(N.xy,uMatRot);',
'vec3 col=texture2D(uPhoto,muv).rgb*0.10+texture2D(uM4,muv).rgb*0.18;',
'col+=texture2D(uM5,muv).rgb*uPal[8]*0.10;',
'col+=texture2D(uRefl,muv).rgb*0.06*clamp(fr,0.0,1.5);',
'vec2 sc=max(uScr,vec2(1.0));',
'vec2 ruv=clamp(vScr+N.xy*(uRefr/sc),0.0,1.0);',
'vec3 back=texture2D(uBackdrop,ruv).rgb;',
'float bw=uBackdropMix*step(0.5,uScr.x)*(0.62+0.38*(1.0-clamp(fr,0.0,1.0)));',
'col=mix(col,back*0.90+milk*0.10,clamp(bw,0.0,1.0));',
'col=mix(col,milk,clamp(uMilky*(0.26+0.74*fr),0.0,1.0));',
'float fl=0.5+0.5*sin(uTime*uMoveA*0.31+(f1-0.5)*2.0);',
'float fg=0.5+0.5*cos((f2-0.5)*3.0-uTime*(0.2-uMoveB));',
'col+=mix(uPal[1],uPal[7],f2)*fl*uAlphaA*0.36*sh;',
'col+=uPal[6]*fg*uAlphaB*0.22*sh;',
'vec3 L1=normalize(vec3(0.83,0.46,0.22));',
'vec3 H1=normalize(L1+V);',
'vec3 cool=mix(uPal[6],uPal[4],0.55);',
'float mt=0.30+0.70*clamp(fr,0.0,1.0);',
'col+=milk*pow(max(dot(N,H1),0.0),24.0)*0.42*mt;',
'col+=cool*pow(max(dot(N,normalize(vec3(-0.42,0.72,0.55)+V)),0.0),8.0)*0.20*mt;',
'col+=cool*pow(max(dot(N,H1),0.0),60.0)*0.26;',
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
U.uOpacity = { value: 0.94 };
U.uFrost = { value: 0.25 };
U.uMilky = { value: 0.34 };
U.uRefr = { value: 3.0 };
U.uBackdropMix = { value: 1.0 };
U.uScr = { value: new T.Vector2(0, 0) };
U.uBackdrop = { value: null };
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
