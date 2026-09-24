/* ADAM/DS — src/ds/button-lab-tune.js · concentric pad/radius tune bar */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-1] · live nest gap + corner tune.
// — Section —
function blabTuneVals(root) {
  const q = (s) => root.querySelector(s);
  const padMin = parseInt(q('[data-blab-pad-min]').value, 10);
  const padMax = parseInt(q('[data-blab-pad-max]').value, 10);
  const rMin = parseInt(q('[data-blab-radius-min]').value, 10);
  const rMax = parseInt(q('[data-blab-radius-max]').value, 10);
  return { padMin: padMin, padMax: padMax, rMin: rMin, rMax: rMax };
}
function blabTuneApply(root) {
  const tune = root.querySelector('[data-blab-tune]');
  const capsule = root.querySelector('[data-blab-capsule]').checked;
  tune.hidden = !capsule;
  if (!capsule) return;
  const v = blabTuneVals(root);
  const q = (s) => root.querySelector(s);
  q('[data-blab-pad-min-val]').textContent = v.padMin + 'px';
  q('[data-blab-pad-max-val]').textContent = v.padMax + 'px';
  q('[data-blab-radius-min-val]').textContent = v.rMin + 'px';
  q('[data-blab-radius-max-val]').textContent = v.rMax + 'px';
  const padTrack = q('[data-blab-pad-track]');
  const rTrack = q('[data-blab-radius-track]');
  const padLeft = (Math.min(v.padMin, v.padMax) / 24) * 100;
  const padW = (Math.abs(v.padMax - v.padMin) / 24) * 100 || 8;
  padTrack.style.left = padLeft + '%';
  padTrack.style.width = padW + '%';
  const rLeft = ((Math.min(v.rMin, v.rMax) - 4) / 28) * 100;
  const rW = (Math.abs(v.rMax - v.rMin) / 28) * 100 || 8;
  rTrack.style.left = rLeft + '%';
  rTrack.style.width = rW + '%';
  const box = root.querySelector('[data-blab-preview] .blab-box');
  const btn = root.querySelector('[data-blab-preview] .btn');
  if (box) {
    const lo = Math.min(v.padMin, v.padMax);
    const hi = Math.max(v.padMin, v.padMax);
    box.style.padding = lo + 'px ' + hi + 'px';
    box.style.borderRadius = Math.max(v.rMin, v.rMax) + 'px';
  }
  if (btn && capsule) {
    btn.style.borderRadius = Math.min(v.rMin, v.rMax) + 'px';
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
