/* ADAM/SHARED — src/components/IllusionCube/illusion-lights.js · decoded light rig + gooey bleed */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-7}] · [plan:2026-09-29_135509-illusion-cube-surface-revision.md#{#phase-3}] · ambient + key + pools + bleed (Task C).
// — Key: 1024 shadow over a 3811-unit footprint; radius set though honoured only under PCF —
// — Pools: three point lights at decoded starts; toState jumps the moved hero pose —
// — Bleed: three small colored points at the inners' spread homes (blob hues); —
// —   rig.lights.bleed is owned here only — lightsStep poses .points, never .bleed —
// Export map: ILLUSION_LIGHTS.build(scene) → { ambient, key, points, bleed } · .toState(lights)
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
const SC = window.ILLUSION_SCENE;
const tint = function (n, fb) { return new T.Color(SC ? SC.tok(n, fb) : fb); };
// — Build —
api.build = function (scene) {
const ambient = new T.AmbientLight(0xd3d3d3, 0.75);
const key = new T.DirectionalLight(0xffffff, 0.8);
key.position.set(966.4148249280238, 529.2659896330395, 254.882440683175);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.radius = 0.81;
key.shadow.camera.left = -1905.566;
key.shadow.camera.right = 1905.566;
key.shadow.camera.top = 1905.566;
key.shadow.camera.bottom = -1905.566;
key.shadow.camera.near = 500;
key.shadow.camera.far = 2500;
const spots = [
[57.049979656199255, 12.199857180006802, 112.45136454567444, 4564, 10],
[-113.54237269267794, 16.528549605580338, -39.705123501394496, 801, 7],
[-121.50410125112523, 11.353790460176242, 68.47555138330435, 990, 10]
];
const points = spots.map(function (s) {
const p = new T.PointLight(0xffffff, 0, s[3], s[4]);
p.position.set(s[0], s[1], s[2]);
p.castShadow = true;
p.shadow.mapSize.set(1024, 1024);
p.shadow.radius = 1;
scene.add(p);
return p;
});
scene.add(ambient, key);
// — Bleed: gooey inners leak light; parked at the TL.CUBES spread homes and —
// —   hue-matched 1:1 to the blob that lives there (light i = HUES[i]: sapphire, —
// —   citrine, amethyst) so the leaked tint agrees with the goo — short range + —
// —   decay 2 keeps the pool local; no shadows, never stepped —
const homes = [[-7.9, 73.5, 15.2], [54, 150.7, 9.8], [-53.4, 40.9, -69.1]];
const hues = [['--primitive-sapphire-400', 0x218aea],
['--primitive-citrine-400', 0xffb01e], ['--primitive-amethyst-400', 0xa54cff]];
const bleed = hues.map(function (h, i) {
const b = new T.PointLight(tint(h[0], h[1]), 8000, 550, 2);
b.position.set(homes[i][0], homes[i][1], homes[i][2]);
scene.add(b);
return b;
});
return { ambient: ambient, key: key, points: points, bleed: bleed };
};
// — Moved state: the t~14 s hero pose Phase 4 will tween toward —
// —   owns .points only; .bleed holds still so the goo keeps glowing —
api.toState = function (lights) {
const moved = [
[32.77265692860964, 8.405533059820298, 109.84670048246309, 0.8],
[-126.12543356866746, 16.528549605580338, -72.06981022075522, 1.0],
[-88.6826038462716, 24.006305882438028, 27.694865485336862, 1.705]
];
for (let i = 0; i < lights.points.length; i++) {
lights.points[i].position.set(moved[i][0], moved[i][1], moved[i][2]);
lights.points[i].intensity = moved[i][3];
}
};
window.ILLUSION_LIGHTS = api;
})();
