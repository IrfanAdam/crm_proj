/* ADAM/SHARED — src/components/GemReward/gem-textures-ext.js · contact shadow map */
// [plan:2026-10-03_144222-gem-realism-round2.md#round-19] · moved verbatim out of gem-textures.js (line-budget split).
// Export map: GEM_TEXTURES_EXT.shadow() → CanvasTexture
(function () {
if (!window.THREE) return;
const T = window.THREE;
const shadow = function () {
const cv = document.createElement('canvas');
cv.width = 128;
cv.height = 128;
const c = cv.getContext('2d');
// Task 5: warm→cool penumbra — umbra is warm dark (occluded warm key), penumbra falls cool
// as sky/ambient takes over (blue-ish). Softened vs previous 0→0.55 hard edge: spread
// stops to 0.68/0.85 so penumbra reads wider than caustic ring (rubric #7).
const g = c.createRadialGradient(64, 64, 0, 64, 64, 62);
g.addColorStop(0, 'rgba(58,38,22,0.50)');g.addColorStop(0.22, 'rgba(62,44,28,0.28)');
g.addColorStop(0.42, 'rgba(66,50,32,0.16)');g.addColorStop(0.62, 'rgba(78,86,108,0.10)');
g.addColorStop(0.80, 'rgba(92,108,132,0.07)');g.addColorStop(1, 'rgba(110,130,155,0)');
c.fillStyle = g;
c.fillRect(0, 0, 128, 128);
const t = new T.CanvasTexture(cv);
t.colorSpace = T.SRGBColorSpace;
return t;
};
window.GEM_TEXTURES_EXT = { shadow: shadow };
})();
