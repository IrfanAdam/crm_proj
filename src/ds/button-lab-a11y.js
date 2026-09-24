/* ADAM/DS — src/ds/button-lab-a11y.js · live contrast readout */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-4] · measures the rendered pair.
// — Section —
function blabLum(src) {
  const nums = src.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lin = nums.map((x) => {
    x /= 255;
    if (x <= 0.03928) return x / 12.92;
    return Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function blabPairRatio(fg, bg) {
  const hi = Math.max(blabLum(fg), blabLum(bg));
  const lo = Math.min(blabLum(fg), blabLum(bg));
  return (hi + 0.05) / (lo + 0.05);
}
function blabA11yUpdate(root) {
  const btn = root.querySelector('[data-blab-preview] .btn');
  const out = root.querySelector('[data-blab-ratio]');
  if (!btn || !out) return;
  const cs = getComputedStyle(btn);
  const r = blabPairRatio(cs.color, cs.backgroundColor);
  let verdict = 'Fail';
  let cls = 'mx-bad';
  if (r >= 7) { verdict = 'AAA'; cls = 'mx-ok'; }
  else if (r >= 4.5) { verdict = 'AA'; cls = 'mx-ok'; }
  else if (r >= 3) { verdict = 'AA-large'; cls = 'mx-mid'; }
  out.textContent = 'Aa ' + r.toFixed(2) + ' · ' + verdict;
  out.className = 'blab__ratio ' + cls;
}
function blabA11yBoot() {
  document.querySelectorAll('[data-blab]').forEach(blabA11yUpdate);
}
document.addEventListener('ds:doc', blabA11yBoot);
document.addEventListener('click', (e) => {
  const lab = e.target.closest ? e.target.closest('[data-blab]') : null;
  if (lab) blabA11yUpdate(lab);
});
document.addEventListener('change', (e) => {
  const lab = e.target.closest ? e.target.closest('[data-blab]') : null;
  if (lab) blabA11yUpdate(lab);
});
document.addEventListener('input', (e) => {
  const lab = e.target.closest ? e.target.closest('[data-blab]') : null;
  if (lab) blabA11yUpdate(lab);
});
