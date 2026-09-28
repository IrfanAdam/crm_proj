/* ADAM/DS — src/ds/gem-panel.js · Gem reward pattern panel — stage, floor, scheme, copy, detach */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-4] · the #gems pattern section's controls (Task 18).
// — Controls drive the live card; floor toggles GEM_BARE's shadow + caustic; detach opens a resizable window —
// Export map: [data-gem-panel] root · data-gem-surface/-photo/-floor/-scheme/-detach · title/capsule/copy inputs
(function () {
const root = document.querySelector('[data-gem-panel]');
const card = document.querySelector('[data-gemspec-card]');
if (!root || !card) return;
const stage = root.closest('[data-gem-stage]');
const pills = document.querySelector('[data-gemspec-pills]');
const panel = document.querySelector('[data-gem-detach-panel]');
const titleEl = card.querySelector('.gem-reward__title');
const capEl = card.querySelector('.gem-reward__capsule');
const copyEl = card.querySelector('.gem-reward__copy');
const floor = { on: true };
const rigs = function () { return (window.GEM3D && window.GEM3D.rigs) || []; };
const setFloors = function (v) {
rigs().forEach(function (r) {
if (!r.floors) return;
if (r.floors.shadow) r.floors.shadow.visible = v;
if (r.floors.caustic) r.floors.caustic.visible = v;
});
};
const active = function () { return pills.querySelector('.is-on') || pills.querySelector('[data-gemspec-cat]'); };
const setInput = function (s, v) { const i = root.querySelector(s); if (i) i.value = v || ''; };
const fields = [['[data-gem-title]', titleEl], ['[data-gem-capsule]', capEl], ['[data-gem-copy]', copyEl]];
fields.forEach(function (f) {
const i = root.querySelector(f[0]);
if (i) i.addEventListener('input', function () { f[1].textContent = i.value.trim(); });
});
if (pills) pills.addEventListener('click', function (e) {
const p = e.target.closest('[data-gemspec-cat]');
if (!p) return;
setInput('[data-gem-title]', p.dataset.gemspecTitle);
setInput('[data-gem-capsule]', p.dataset.gemspecCapsule);
setInput('[data-gem-copy]', p.dataset.gemspecCopy);
if (panel && !panel.hidden) sync();
});
const dStage = panel ? panel.querySelector('[data-gem-detach-stage]') : null;
const dTitle = panel ? panel.querySelector('[data-gem-detach-title]') : null;
const dCap = panel ? panel.querySelector('[data-gem-detach-capsule]') : null;
const sync = function () {
const p = active();
if (!p || !panel) return;
const cat = p.dataset.gemspecCat;
if (dTitle) dTitle.textContent = p.dataset.gemspecTitle || '';
if (dCap) dCap.textContent = p.dataset.gemspecCapsule || '';
if (!dStage) return;
const cv = dStage.querySelector('canvas');
if (cv && cv.dataset.gem === cat) return;
if (cv) cv.remove();
const nu = document.createElement('canvas');
nu.className = 'gem-reward__spline gem-detach__canvas';
nu.dataset.gem = cat;
nu.width = 640;
nu.height = 280;
nu.setAttribute('role', 'img');
nu.setAttribute('aria-label', cat + ' gem ceremony');
dStage.appendChild(nu);
};
if (panel) {
const head = panel.querySelector('[data-gem-detach-grab]');
if (head) head.addEventListener('pointerdown', function (e) {
if (e.target.closest('button')) return;
const b = panel.getBoundingClientRect();
const sx = e.clientX - b.left, sy = e.clientY - b.top;
const mv = function (ev) {
panel.style.left = Math.max(0, ev.clientX - sx) + 'px';
panel.style.top = Math.max(0, ev.clientY - sy) + 'px';
panel.style.right = 'auto';
};
const up = function () {
window.removeEventListener('pointermove', mv);
window.removeEventListener('pointerup', up);
};
window.addEventListener('pointermove', mv);
window.addEventListener('pointerup', up);
});
}
root.addEventListener('click', function (e) {
const s = e.target.closest('[data-gem-surface]');
if (s) { if (stage) stage.dataset.surface = s.dataset.gemSurface; root.querySelectorAll('[data-gem-surface]').forEach(function (b) { b.classList.toggle('is-on', b === s); }); return; }
const t = e.target.closest('[data-gem-scheme]');
if (t) { if (stage) stage.dataset.theme = t.dataset.gemScheme; root.querySelectorAll('[data-gem-scheme]').forEach(function (b) { b.classList.toggle('is-on', b === t); }); if (window.GEM3D && window.GEM3D.restage) window.GEM3D.restage(); return; }
const f = e.target.closest('[data-gem-floor]');
if (f) { floor.on = !floor.on; f.textContent = 'Floor: ' + (floor.on ? 'on' : 'off'); f.classList.toggle('is-on', floor.on); setFloors(floor.on); return; }
const p = e.target.closest('[data-gem-photo]');
if (p) { const m = ((Number(p.dataset.gemPhoto) || 0) + 1) % 3; p.dataset.gemPhoto = String(m); p.textContent = ['Demo bg: off', 'Demo bg: photo', 'Demo bg: chart'][m]; p.classList.toggle('is-on', m > 0); if (window.GEM3D) window.GEM3D.bg(m === 0 ? null : m === 1 ? '/gem-demo-bg.jpg' : '/gem-demo-chart.png'); return; }
if (e.target.closest('[data-gem-detach]')) { if (panel) { sync(); panel.hidden = false; setFloors(floor.on); } return; }
if (e.target.closest('[data-gem-detach-close]')) { if (panel) panel.hidden = true; return; }
});
const p0 = active();
if (p0) {
setInput('[data-gem-title]', p0.dataset.gemspecTitle);
setInput('[data-gem-capsule]', p0.dataset.gemspecCapsule);
setInput('[data-gem-copy]', p0.dataset.gemspecCopy);
}
setInterval(function () { if (!floor.on) setFloors(false); }, 800);
})();
