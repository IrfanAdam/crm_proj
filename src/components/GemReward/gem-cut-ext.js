/* ADAM/SHARED — src/components/GemReward/gem-cut-ext.js · 8x8 tip-height solve */
// [plan:2026-10-03_144222-gem-realism-round2.md#round-19] · moved verbatim out of gem-cut.js (line-budget split).
// Export map: GEM_CUT_EXT.solve8(A, B, C) → [8] tip heights
(function () {
const solve8 = function (A, B, C) {
const m = [];
for (let r = 0; r < 8; r++) m.push([0, 0, 0, 0, 0, 0, 0, 0, 0]);
for (let k = 0; k < 8; k++) { m[k][k] += A[k]; m[k][(k + 7) % 8] += B[k]; m[k][8] = C[k]; }
for (let col = 0; col < 8; col++) {
let piv = col;
for (let r = col + 1; r < 8; r++) if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r;
if (Math.abs(m[piv][col]) < 1e-15) throw new Error('singular tip-height system');
const row = m[col]; m[col] = m[piv]; m[piv] = row;
const pv = m[col][col];
for (let r = col + 1; r < 8; r++) { const f = m[r][col] / pv; if (f !== 0) for (let cc = col; cc <= 8; cc++) m[r][cc] -= f * m[col][cc]; }
}
const y = [0, 0, 0, 0, 0, 0, 0, 0];
for (let r = 7; r >= 0; r--) { let s = m[r][8]; for (let cc = r + 1; cc < 8; cc++) s -= m[r][cc] * y[cc]; y[r] = s / m[r][r]; }
return y;
};
window.GEM_CUT_EXT = { solve8: solve8 };
})();
