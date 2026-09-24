/* ADAM/SHARED — src/components/GemReward/gem-reward.js · GemReward markup helper */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · canvas ceremony markup (Task 21).
// — Color: no hue-rotate — the canvas carries the category token hue (gem-cut.js) —
// Export map: renderGemReward(category) → markup; canvas[data-gem] mounts via gem3d.js.
const COPY = { sapphire: { title: 'Rock Solid Goals', capsule: '+Rs 4lakh · Beyond Target', note: 'data in here don’t lie' }, citrine: { title: 'Golden Streak', capsule: '+Rs 2.5lakh · Top Closer', note: 'keep the tempo' }, amethyst: { title: 'Focus Master', capsule: '+Rs 3lakh · Deep Work', note: 'quiet wins' }, 'red-beryl': { title: 'Momentum', capsule: '+Rs 1.8lakh · Sprint Closed', note: 'next one matters' } };
export function renderGemReward(category = 'sapphire') {
  const c = COPY[category] || COPY.sapphire;
  const gem = category === 'red-beryl' ? 'redberyl' : category;
  return `<div class="gem-reward gem-reward--${category}"><canvas class="gem-reward__spline" data-gem="${gem}" width="640" height="280" aria-label="${c.title} gem"></canvas><div class="gem-reward__title">${c.title}</div><div class="gem-reward__capsule">${c.capsule}</div><div class="gem-reward__copy">${c.note} · mood quarantined — never inside Operate/Monitor</div></div>`;
}
