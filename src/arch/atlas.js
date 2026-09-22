/* ADAM/SHARED — src/arch/atlas.js · atlas composer [plan:2026-09-22_082844-arch-atlas.md#phase-2] */
// — Exports: initAtlas (auto-mounts on #atlas-nav) —
import data from './atlas.json';
import { layoutLens, lensGraph } from './atlas-layout.js';
import { renderAtlas, renderDetail } from './atlas-render.js';
import { createAtlasState } from './atlas-state.js';
import { detailLogic } from './lens-logic.js';
import { detailComponents } from './lens-components.js';
import { detailIA } from './lens-ia.js';
import { renderTruth } from './lens-truth.js';
function detailFor(lens, node, atlas) {
  if (lens === 'logic') return detailLogic(node, atlas);
  if (lens === 'components') return detailComponents(node, atlas);
  if (lens === 'ia') return detailIA(node, atlas);
  return renderDetail(node);
}
import { attachViewport } from './atlas-viewport.js';
// — Section — selection paint (inline block in the one container) —
function paintSelection(canvas, graph, selected, lens) {
  canvas.querySelector('.atlas__sel')?.remove();
  if (lens === 'truth') return;
  const node = graph.nodes.find((n) => n.id === selected) || null;
  if (!node) return;
  canvas.querySelectorAll('.atlas-node').forEach((r) => r.setAttribute('data-selected', String(r.dataset.id === selected)));
  const sel = document.createElement('div');
  sel.className = 'atlas__sel';
  sel.setAttribute('aria-live', 'polite');
  sel.innerHTML = detailFor(lens, node, data);
  canvas.appendChild(sel);
}
// — Section — full lens paint (one container swaps content) —
function paintLens(nav, canvas, view, state, graph) {
  nav.querySelectorAll('[data-lens]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.lens === state.lens)));
  if (state.lens === 'truth') {
    canvas.innerHTML = renderTruth();
    view.reset();
    canvas.setAttribute('aria-label', 'truth lens — code truth');
    return;
  }
  canvas.innerHTML = renderAtlas(graph.nodes, layoutLens(graph.nodes), graph.edges);
  view.reset();
  paintSelection(canvas, graph, state.selected, state.lens);
  canvas.setAttribute('aria-label', `${state.lens} lens — ${graph.nodes.length} nodes`);
}
// — Section — mount + wiring —
export function initAtlas() {
  const nav = document.getElementById('atlas-nav');
  const canvas = document.getElementById('atlas-canvas');
  if (!nav || !canvas) return null;
  const state = createAtlasState();
  let graph = lensGraph(data, state.lens);
  let lastLens = state.lens;
  const view = attachViewport(canvas, {
    getIds: () => graph.nodes.map((n) => n.id),
    getSelected: () => state.selected,
    onTap: (id) => state.select(id),
    onEmpty: () => state.clear(),
    onEscape: () => state.clear(),
  });
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lens]');
    if (btn) state.setLens(btn.dataset.lens);
  });
  state.subscribe(() => {
    if (state.lens !== lastLens) {
      lastLens = state.lens;
      graph = lensGraph(data, state.lens);
      paintLens(nav, canvas, view, state, graph);
    } else paintSelection(canvas, graph, state.selected, state.lens);
  });
  paintLens(nav, canvas, view, state, graph);
  return state;
}
if (typeof document !== 'undefined' && document.getElementById('atlas-nav')) initAtlas();
