/* ADAM/SHARED — src/components/IllusionCube/illusion-floor.js · one grounded floor + absorbed wash */
// [plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-2}] · Task 4: single mesh at y 0.
// — Grid: decoded 200-unit cells — the hero floor is FLAT (no pools, no shadow — pixels),
// —   so this is an unlit Basic surface: canvas mint + lines + fog only, byte-true —
// — Surface: opaque hero-sampled mint rgb(198,238,255); grid = decoded 200-u cells, so —
// —   the plane reads as the one the cube sits on (no pane, no sky-through trick) —
// — Wash: the prism streak folds into this material (onBeforeCompile additive) — floor —
// —   local lx = world x, ly = -world z (plane rotated -90° about X); windowed so it can —
// Export map: ILLUSION_FLOOR.build(scene) → { plane, wash(w) } · .band(camera, w, h) → [yStart, yFull]
(function () {
if (!window.THREE) return;
const T = window.THREE;
const SC = window.ILLUSION_SCENE;
const api = {};
const tok = function (n, fb) { return new T.Color(SC ? SC.tok(n, fb) : fb); };
// — Grid texture: blue hairlines on transparent, one cell per 200 units —
const gridTex = function () {
const c = document.createElement('canvas');
c.width = 512;
c.height = 512;
const g = c.getContext('2d');
g.fillStyle = 'rgb(198,238,255)';
g.fillRect(0, 0, 512, 512);
g.fillStyle = 'rgba(0,62,255,0.16)';
g.fillRect(0, 0, 5, 512);
g.fillRect(0, 0, 512, 5);
const t = new T.CanvasTexture(c);
t.colorSpace = T.SRGBColorSpace;
t.wrapS = T.RepeatWrapping;
t.wrapT = T.RepeatWrapping;
t.repeat.set(50, 50);
return t;
};
// — Wash GLSL: prism mask (origin 143.9266 + near 11.3091 → 155.2357, 203.1277 ramp) —
// —   recentred on the floor centre (-194.01257, -8.38815) → p.x+38.77687, p.y-8.388145 —
// —   windowed to |dz| 514 of 541 and x -600 so it dies inside the mesh (no pane edge) —
// —   plus the hero-measured warm contact pool at the plinth base (+6R +3G, r 420) —
const DECL = ['uniform float uWash; uniform vec3 uWashCol; varying vec2 vFloor;',
'float wmask(vec2 p){',
'float mx=1.0-smoothstep(0.0,1.0,clamp((p.x+38.77687)/203.1277,0.0,1.0));',
'float my=1.0-smoothstep(0.55,0.95,abs(p.y-8.388145)/541.044);',
'return mx*my*smoothstep(-600.0,-540.0,p.x);}'].join('\n');
const BODY = ['gl_FragColor.rgb+=uWashCol*uWash*wmask(vFloor)*0.4;',
'float pool=1.0-smoothstep(0.0,420.0,distance(vFloor,vec2(0.57,-1.0)));',
'gl_FragColor.rgb+=vec3(0.038,0.019,0.0)*pool;'].join('\n');
// — Build: one mesh, flat at y 0 — the plinth (Base y 0→45) stands on it —
api.build = function (scene) {
const U = { uWash: { value: 0.3 } };
U.uWashCol = { value: tok('--primitive-illusion-glass-mid', 0x00edff).lerp(tok('--primitive-illusion-glass-lo', 0x003bff), 0.35) };
const mat = new T.MeshBasicMaterial({ map: gridTex() });
mat.onBeforeCompile = function (sh) {
sh.uniforms.uWash = U.uWash;
sh.uniforms.uWashCol = U.uWashCol;
sh.vertexShader = 'varying vec2 vFloor;\n' + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n\tvFloor = position.xy;");
sh.fragmentShader = DECL + '\n' + sh.fragmentShader.replace("#include <colorspace_fragment>", BODY + "\n#include <colorspace_fragment>");
};
mat.userData.uWash = U.uWash;
const plane = new T.Mesh(new T.PlaneGeometry(10000, 10000), mat);
plane.rotation.x = -Math.PI / 2;
plane.position.y = 0;
plane.receiveShadow = false;
scene.add(plane);
// — Wash: motion drives 0..1 per frame; 0.26..0.34 keeps the decoded ambient level —
const wash = function (w) { const v = w > 0 ? (w < 1 ? w : 1) : 0; U.uWash.value = 0.26 + 0.08 * v; };
return { plane: plane, wash: wash };
};
// — Band: 1600x1200 rows where the fog (1423.758 / 1987.781) meets the y-0 floor —
// —   was [761, 538] against the retired y -199.453741 plane: the same two distances —
// —   project 199 u higher now, so the grounded band is [552, 328] —
api.band = function (camera, cssW, cssH) {
const s = cssH / 1200;
return [Math.round(552 * s), Math.round(328 * s)];
};
window.ILLUSION_FLOOR = api;
})();
