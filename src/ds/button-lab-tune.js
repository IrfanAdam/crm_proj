/* ADAM/DS — src/ds/button-lab-tune.js · concentric pad/radius tune */
/* Exports: blabTuneVals, blabTuneApply, blabTuneBind */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-1] · two sliders 8→48 pad, 8→48 radius.
// — Section —
function blabTuneVals(root) {
  const q = (s) => root.querySelector(s);
  const pad = parseInt(q('[data-blab-pad]').value, 10);
  const rad = parseInt(q('[data-blab-radius]').value, 10);
  return { pad, rad };
}
function blabTuneApply(root) {
  const tune = root.querySelector('[data-blab-tune]');
  const capsule = root.querySelector('[data-blab-capsule]').checked;
  tune.hidden = !capsule;
  if (!capsule) return;
  const v = blabTuneVals(root);
  const q = (s) => root.querySelector(s);
  q('[data-blab-pad-val]').textContent = v.pad + 'px';
  q('[data-blab-radius-val]').textContent = v.rad + 'px';
  const box = root.querySelector('[data-blab-preview] .blab-box');
  const btn = root.querySelector('[data-blab-preview] .btn');
  if (box) {
    box.style.padding = v.pad + 'px';
    box.style.borderRadius = v.rad + 'px';
  }
  if (btn) {
    const outer = v.rad;
    const inset = v.pad;
    let inner = outer - inset;
    inner = Math.round(inner / 4) * 4;
    if (inner < 8) inner = 8;
    btn.style.borderRadius = inner + 'px';
  }
}
function blabTuneBind(root) {
  const tune = root.querySelector('[data-blab-tune]');
  if (!tune || tune.dataset.done) return;
  tune.dataset.done = '1';
  tune.querySelectorAll('input[type="range"]').forEach((inp) => {
    inp.addEventListener('input', () => blabTuneApply(root));
  });
}
