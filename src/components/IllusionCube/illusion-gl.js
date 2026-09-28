/* ADAM/SHARED — src/components/IllusionCube/illusion-gl.js · shared GLSL chunks */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-3}] · Task 18: one chunk set.
// — Noise: hash/noise/fbm verbatim from IntelCube cube-core.js (family parity) —
// — Blend modes 0 normal / 1 multiply / 2 screen / 3 overlay are INFERRED —
// Export map: ILLUSION_GL.NOISE · .WARP · .RAMP4 · .BLEND · .FRESNEL · .MATCAP · .VECGRAD
(function () {
const api = {};
// — Value noise trio, verbatim —
api.NOISE = [
'float hash(vec3 p){p=fract(p*0.3183099+vec3(0.71,0.113,0.419));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
'float noise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);',
'return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),',
'mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}',
'float fbm(vec3 p){return noise(p)*0.6+noise(p*2.17)*0.29+noise(p*4.9)*0.11;}'
].join('\n');
// — Domain warp: Spline distortion [3.97,-2.1] reads as liquid, not cloudy —
api.WARP = 'vec3 warpPos(vec3 p,float t){return p+vec3(sin(p.y*1.7+t*0.31)*3.97,sin(p.z*1.3-t*0.23)*-2.1,sin(p.x*1.1+t*0.17)*1.4);}';
// — Four-stop ramp, smoothness 0.3 as the smoothstep half-width —
api.RAMP4 = 'vec3 ramp4(float t,vec3 a,vec3 b,vec3 c,vec3 d){vec3 col=mix(a,b,smoothstep(0.033,0.633,t));col=mix(col,c,smoothstep(0.367,0.967,t));return mix(col,d,smoothstep(0.367,1.0,t));}';
// — Blend by Spline integer mode —
api.BLEND = [
'vec3 blendm(vec3 b,vec3 l,float a,float m){',
'vec3 n=mix(b,l,a);',
'if(m<0.5)return n;',
'if(m<1.5)return mix(b,b*l,a);',
'if(m<2.5)return mix(b,vec3(1.0)-(vec3(1.0)-b)*(vec3(1.0)-l),a);',
'vec3 o=mix(2.0*b*l,vec3(1.0)-2.0*(vec3(1.0)-b)*(vec3(1.0)-l),step(vec3(0.5),b));',
'return mix(b,o,a);}'].join('\n');
// — Fresnel sized for bias 0.1, scale 1, intensity 2 —
api.FRESNEL = 'float fres(vec3 n,vec3 v,float b,float s,float i){return pow(clamp(1.0-dot(n,v)+b,0.0,1.0),s)*i;}';
// — Matcap sample: rotate view-space xy by radians, then 0.5/0.5 —
api.MATCAP = 'vec2 matUV(vec2 v,float r){float c=cos(r);float s=sin(r);return mat2(c,-s,s,c)*v*0.5+0.5;}';
// — Object-space two-stop vector gradient (cube bands and prism mask) —
api.VECGRAD = 'float vecgrad(vec3 p,vec3 o,vec3 d,float n,float f,float s0,float s1){float x=clamp((dot(p-o,normalize(d))-n)/(f-n),0.0,1.0);return smoothstep(s0,s1,x);}';
window.ILLUSION_GL = api;
})();
