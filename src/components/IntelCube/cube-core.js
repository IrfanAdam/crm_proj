/* ADAM/SHARED — src/components/IntelCube/cube-core.js · amorphous core shader */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-5] · fbm glow material (Task 20).
// — Blob: value-noise fbm displaces along the sphere direction (normals stay analytic) · the —
// —       colour is a three-stop token ramp keyed by noise and height — warm settles low, cool —
// —       shows in the thin spots · alpha feathers at the rim so the edge reads as smoke —
// — Motes: drifting glow points that wrap inside the block · sprite() feeds the halo billboards —
// Export map: CUBE_CORE.blob(stops, opts) · motes(color) · sprite() → CanvasTexture glow
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
const NOISE = [
'float hash(vec3 p){p=fract(p*0.3183099+vec3(0.71,0.113,0.419));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
'float noise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}',
'float fbm(vec3 p){return noise(p)*0.6+noise(p*2.17)*0.29+noise(p*4.9)*0.11;}',
].join('\n');
const VERT = NOISE + `
uniform float uTime; uniform float uAmp; uniform float uFreq; uniform float uSeed;
varying float vN; varying float vY; varying vec3 vP; varying vec3 vNv; varying vec3 vVv;
void main() {
vec3 p = normalize(position);
float n = fbm(p * uFreq + vec3(uSeed, uSeed * 1.7, uSeed * 0.6) + uTime * 0.45);
float n2 = fbm(p * uFreq * 0.5 - uTime * 0.26 + uSeed * 0.7);
vN = n; vP = p; vY = p.y;
vec3 q = position + p * (uAmp * (n * 0.7 + n2 * 0.55) - uAmp * 0.32);
vec4 mv = modelViewMatrix * vec4(q, 1.0);
vNv = normalize(normalMatrix * p);
vVv = -mv.xyz;
gl_Position = projectionMatrix * mv;
}`;
const FRAG = NOISE + `
uniform vec3 uCool; uniform vec3 uCore; uniform vec3 uWarm; uniform float uAlpha; uniform float uTime;
varying float vN; varying float vY; varying vec3 vP; varying vec3 vNv; varying vec3 vVv;
void main() {
float fres = clamp(dot(normalize(vNv), normalize(vVv)), 0.0, 1.0);
float warm = 1.0 - smoothstep(-0.3, 0.55, vY + (vN - 0.5) * 0.7);
vec3 col = mix(uCore, uWarm, warm);
col = mix(col, uCool, 1.0 - smoothstep(0.26, 0.56, vN));
float gauze = fbm(vP * 3.4 + uTime * 0.2);
col *= (0.82 + 0.45 * fres) * (0.88 + 0.24 * gauze) * 1.06;
float a = smoothstep(0.05, 0.26, fres) * uAlpha * (0.85 + 0.3 * gauze);
gl_FragColor = vec4(col, a);
#include <colorspace_fragment>
}`;
api.blob = function (stops, o) {
const m = new T.ShaderMaterial({
uniforms: { uTime: { value: 0 }, uAmp: { value: o.amp }, uFreq: { value: o.freq }, uSeed: { value: o.seed }, uAlpha: { value: o.alpha }, uCool: { value: new T.Color(stops[0]) }, uCore: { value: new T.Color(stops[1]) }, uWarm: { value: new T.Color(stops[2]) } },
vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
});
m.toneMapped = false;
return m;
};
const MV = `
attribute float aSize; attribute float aSeed; attribute float aSpeed;
uniform float uTime; uniform float uProj; uniform float uWrap;
varying float vA;
void main() {
vec3 p = position;
p.y = mod(p.y + uWrap * 0.5 + uTime * aSpeed + aSeed * 0.013, uWrap) - uWrap * 0.5;
p.x += sin(uTime * 0.4 + aSeed) * 0.014;
p.z += cos(uTime * 0.33 + aSeed * 1.3) * 0.014;
vec4 mv = modelViewMatrix * vec4(p, 1.0);
gl_PointSize = aSize * uProj / max(-mv.z, 0.25);
gl_Position = projectionMatrix * mv;
vA = (0.5 + 0.5 * sin(uTime * 0.7 + aSeed * 2.1)) * (1.0 - smoothstep(0.34, 0.45, abs(p.y)));
}`;
const MF = `
uniform vec3 uColor; uniform float uOpacity;
varying float vA;
void main() {
float d = length(gl_PointCoord - 0.5);
float a = smoothstep(0.5, 0.08, d) * vA * uOpacity;
if (a < 0.012) discard;
gl_FragColor = vec4(uColor, a);
#include <colorspace_fragment>
}`;
api.motes = function (color) {
const m = new T.ShaderMaterial({
uniforms: { uTime: { value: 0 }, uProj: { value: 900 }, uWrap: { value: 0.9 }, uColor: { value: new T.Color(color) }, uOpacity: { value: 0.85 } },
vertexShader: MV, fragmentShader: MF, transparent: true, depthWrite: false,
});
m.toneMapped = false;
return m;
};
api.sprite = function () {
const cv = document.createElement('canvas');
cv.width = 128; cv.height = 128;
const c = cv.getContext('2d');
const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
g.addColorStop(0, 'rgba(255,255,255,0.92)');
g.addColorStop(0.42, 'rgba(255,255,255,0.36)');
g.addColorStop(1, 'rgba(255,255,255,0)');
c.fillStyle = g;
c.fillRect(0, 0, 128, 128);
const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace;
return t;
};
window.CUBE_CORE = api;
})();
