/* ADAM/SHARED — src/components/GlassDeck/deck-bloom.js · depth-gated bloom for deck rigs */
// [plan:2026-10-05_000000-lump-sum-builds.md#phase-1] · self-contained; wraps rig.renderer.render only.
// — Pipeline: scene → A (full, sRGB, MSAA + depth) · threshold luma + 9-tap gaussian at half res → B · A + B*intensity → canvas
// — Highlight-only: bloom samples are gated to geometry (depth < far), so the white void never glows —
// — only the plates' own flash islands and rim sparks do. Toggle [data-deck-bloom] pill (default on).
// — The composite re-encodes via <colorspace_fragment> — dropping it dims the whole frame one encode —
// Export map: window.DECK_BLOOM { intensity, spread, threshold, on() } · polls DECK3D.rigs every 400ms · wraps once.
(function () {
const T = window.THREE;
if (!T || !T.WebGLRenderTarget || !T.ShaderMaterial) return;
const POLL = 400, MSAA = 4;
let on = true;
const api = { intensity: 0.48, spread: 5, threshold: 0.68, on: function () { return on; } };
const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const geo = new T.PlaneGeometry(2, 2);
const mkScene = function (m) {
const q = new T.Mesh(geo, m); q.frustumCulled = false;
const s = new T.Scene(); s.add(q); return s;
};
const VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const BLOOM = [
'uniform sampler2D tDiffuse;uniform sampler2D tDepth;uniform vec2 texel;uniform float thresh;varying vec2 vUv;',
'void main(){vec3 s=vec3(0.);float w=0.;',
'for(int i=-1;i<=1;i++){for(int j=-1;j<=1;j++){float g=exp(-float(i*i+j*j)*0.6);vec2 o=vec2(float(i),float(j))*texel;',
'float m=1.0-smoothstep(0.9990,0.9999,texture2D(tDepth,vUv+o).x);',
'vec3 c=texture2D(tDiffuse,vUv+o).rgb;float l=dot(c,vec3(0.2126,0.7152,0.0722));',
's+=c*smoothstep(thresh,thresh+0.05,l)*g*m;w+=g;}}',
'gl_FragColor=vec4(s/w,1.);}'].join('\n');
const COMP = [
'uniform sampler2D tScene;uniform sampler2D tBloom;uniform float intensity;varying vec2 vUv;',
'void main(){vec4 s=texture2D(tScene,vUv);vec3 b=texture2D(tBloom,vUv).rgb;',
'gl_FragColor=vec4(clamp(s.rgb+b*intensity,0.,1.),s.a);',
'#include <colorspace_fragment>',
'}'].join('\n');
const KEYS = ['tDiffuse', 'tDepth', 'tScene', 'tBloom', 'texel', 'thresh', 'intensity'];
const mk = function (fs) {
const u = {};
KEYS.forEach(function (n) { u[n] = { value: null }; });
return new T.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
};
const bloomMat = mk(BLOOM), compMat = mk(COMP);
const bloomScene = mkScene(bloomMat), compScene = mkScene(compMat);
const texel = new T.Vector2(1, 1);
const half = function (n) { return Math.max(1, Math.floor(n / 2)); };
const targets = function (rig, w, h) {
const st = rig.__bloom || (rig.__bloom = {});
if (st.a && st.w === w && st.h === h) return st;
if (st.a) { st.a.dispose(); st.b.dispose(); }
st.a = new T.WebGLRenderTarget(w, h, { stencilBuffer: false, type: T.HalfFloatType, samples: MSAA });
st.a.depthTexture = new T.DepthTexture(w, h);
st.a.isXRRenderTarget = true;
st.a.texture.colorSpace = T.SRGBColorSpace;
st.b = new T.WebGLRenderTarget(half(w), half(h), { depthBuffer: false, stencilBuffer: false });
st.w = w, st.h = h;
return st;
};
const pass = function (r, s, t) { r.setRenderTarget(t); r.__deckOrig.call(r, s, cam); };
const draw = function (r, rig, scene, camera) {
const w = rig.canvas ? rig.canvas.width : 0, h = rig.canvas ? rig.canvas.height : 0;
if (!on || !scene || !camera || w < 8 || h < 8) { r.__deckOrig.call(r, scene, camera); return; }
const st = targets(rig, w, h);
r.setRenderTarget(st.a);
r.__deckOrig.call(r, scene, camera);
bloomMat.uniforms.tDiffuse.value = st.a.texture;
texel.set(api.spread / w, api.spread / h);
bloomMat.uniforms.tDepth.value = st.a.depthTexture;
bloomMat.uniforms.texel.value = texel;
bloomMat.uniforms.thresh.value = api.threshold;
pass(r, bloomScene, st.b);
compMat.uniforms.tScene.value = st.a.texture;
compMat.uniforms.tBloom.value = st.b.texture;
compMat.uniforms.intensity.value = api.intensity;
pass(r, compScene, null);
};
const wrap = function (rig) {
const r = rig.renderer;
if (!r || r.__deckBloom) return;
r.__deckBloom = true;
r.__deckOrig = r.render;
r.render = function (scene, camera) { draw(r, rig, scene, camera); };
};
const poll = function () { ((window.DECK3D && window.DECK3D.rigs) || []).forEach(wrap); };
const sync = function () {
const p = document.querySelector('[data-deck-bloom]');
if (!p) return;
p.classList.toggle('is-on', on);
p.textContent = 'Bloom: ' + (on ? 'on' : 'off');
};
document.addEventListener('click', function (e) {
const p = e.target.closest && e.target.closest('[data-deck-bloom]');
if (!p) return;
on = !on;
sync();
});
window.DECK_BLOOM = api;
sync();
poll();
setInterval(poll, POLL);
})();
