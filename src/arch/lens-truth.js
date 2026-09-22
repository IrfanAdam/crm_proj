/* ADAM/SHARED — src/arch/lens-truth.js · code-truth lens page [plan:2026-09-22_082844-arch-atlas.md#phase-4] */
// — Exports: renderTruth —
const INTRO = 'Extract-only refactor: each layer owns its modules behind documented contracts; geometry flows one way from src/workspace/devices.js.';
const LAYERS = [
  ['Mounts', 'index.html', 'stylesheet links + #device #os-status #os-edges #app-content only'],
  ['Shell', 'src/shell/*', 'workspace chrome, canvas viewport, launcher'],
  ['Device', 'src/device/*', 'frame + geometry, radii/bezel/squircle'],
  ['OS', 'src/os/*', 'live clock/battery status bar, notch variants, home indicator, edge materials'],
  ['Glass', 'src/glass/*', 'shell pills vs device dock/appbar; lens|slices engines'],
  ['Patterns', 'src/patterns/*', 'app screens, mount(page), no OS/device knowledge'],
  ['Logic', 'src/logic/*', 'pure state machines, zero DOM, unit-tested'],
  ['DS', 'src/components/*', 'gallery-proven single source for avatar/card/kpi/meta'],
];
const RULES = 'patterns → components/tokens only; glass → tokens + app-tab; os/device/shell never import patterns; logic never touches DOM';
const FLOWS = [['morph pipeline', 'docs/flows/morph-pipeline.mmd'], ['tab bridge', 'docs/flows/tab-bridge.mmd'], ['glass engines', 'docs/flows/glass-engines.mmd'], ['module graph', 'docs/graph.mmd']];
const NOTE = 'Platform-specific tuning (blur strength, sheen, glow) can be done per OS later via optics — geometry stays at points × scale.';
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// — Section — truth page (borderless; the canvas is the only card) —
export function renderTruth() {
  const items = LAYERS.map(([k, src, d]) => `<li><b>${esc(k)}:</b> <code>${esc(src)}</code> — ${esc(d)}</li>`).join('');
  const flows = FLOWS.map(([t, href]) => `<a href="${esc(href)}">${esc(t)}</a>`).join(' · ');
  return `<div class="atlas__page"><h3>Layered prototype — code truth</h3><p>${esc(INTRO)}</p><ul>${items}<li><b>Rules:</b> ${esc(RULES)}</li><li><b>Flows:</b> ${flows}</li></ul><p>${esc(NOTE)}</p></div>`;
}
