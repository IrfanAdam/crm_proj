/* ADAM/SHARED — src/components/IllusionCube/illusion-frost.js · half-res backdrop blur */
// [plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-4}] · Task 11: the frost render step.
// — update(rig): hide shell + overlay, scene → rtA, blur H rtA→rtB, blur V rtB→rtA, then write —
// —   the shell's uBackdrop/uScr; targets re-made on drawing-buffer change; zero alloc per frame —
// Export map: ILLUSION_FROST.update(rig) · .attach(rig) · .rt (blurred target, for probes)
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
const HALF = 0.5, RAD = 2.0;
// — Blur: 9-tap separable gaussian (weights sum 1) + uDir picks the axis, in uv —
const BVERT = 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
const BFRAG = [
'uniform sampler2D uTex; uniform vec2 uDir; varying vec2 vUv;',
'void main(){',
'vec3 s=texture2D(uTex,vUv).rgb*0.227027;',
's+=(texture2D(uTex,vUv+uDir).rgb+texture2D(uTex,vUv-uDir).rgb)*0.1945946;',
's+=(texture2D(uTex,vUv+uDir*2.0).rgb+texture2D(uTex,vUv-uDir*2.0).rgb)*0.1216216;',
's+=(texture2D(uTex,vUv+uDir*3.0).rgb+texture2D(uTex,vUv-uDir*3.0).rgb)*0.0540541;',
's+=(texture2D(uTex,vUv+uDir*4.0).rgb+texture2D(uTex,vUv-uDir*4.0).rgb)*0.0162162;',
'gl_FragColor=vec4(s,1.0);}'].join('\n');
// — State: one quad pass, two targets at half the drawing buffer —
let quadScene = null, quadCam = null, quadMat = null, rtA = null, rtB = null;
const size = new T.Vector2(), cur = new T.Vector2(-1, -1);
function build() {
quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
quadMat = new T.ShaderMaterial({ depthTest: false, depthWrite: false, vertexShader: BVERT, fragmentShader: BFRAG,
uniforms: { uTex: { value: null }, uDir: { value: new T.Vector2(0, 0) } } });
quadScene = new T.Scene();
quadScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), quadMat));
}
function targets(w, h) {
if (rtA) { rtA.dispose(); rtB.dispose(); }
const o = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: true };
rtA = new T.WebGLRenderTarget(w, h, o);
rtB = new T.WebGLRenderTarget(w, h, o);
api.rt = rtA;
cur.set(w, h);
}
function ensure(rig) {
const r = rig && rig.renderer;
if (!r || !r.getDrawingBufferSize || !r.setRenderTarget) return false;
if (!quadScene) build();
r.getDrawingBufferSize(size);
const w = Math.max(2, Math.round(size.x * HALF)), h = Math.max(2, Math.round(size.y * HALF));
if (!rtA || cur.x !== w || cur.y !== h) targets(w, h);
return true;
}
function blur(r, from, to, dx, dy) {
quadMat.uniforms.uTex.value = from.texture;
quadMat.uniforms.uDir.value.set(dx * RAD / from.width, dy * RAD / from.height);
r.setRenderTarget(to);
r.render(quadScene, quadCam);
}
api.attach = function (rig) { return ensure(rig); };
// — Update: runs every frame before the main render, allocations frozen after the first —
api.update = function (rig) {
if (!rig || !rig.scene || !rig.camera || !rig.bodies || !rig.bodies.main) return;
if (!ensure(rig)) return;
const r = rig.renderer, shell = rig.bodies.main;
const visMain = shell.visible, visOver = rig.overlay ? rig.overlay.visible : null;
shell.visible = false;
if (rig.overlay) rig.overlay.visible = false;
r.setRenderTarget(rtA);
r.render(rig.scene, rig.camera);
blur(r, rtA, rtB, 1, 0);
blur(r, rtB, rtA, 0, 1);
shell.visible = visMain;
if (rig.overlay) rig.overlay.visible = visOver;
r.setRenderTarget(null);
const u = shell.material && shell.material.uniforms;
if (!u || !u.uBackdrop) return;
u.uBackdrop.value = rtA.texture;
if (u.uScr) u.uScr.value.set(size.x, size.y);
};
window.ILLUSION_FROST = api;
})();
