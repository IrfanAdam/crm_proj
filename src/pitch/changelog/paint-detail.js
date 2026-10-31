/* ADAM/DS — ds/changelog/paint-detail · orchestrator (slimmed, budget) · [plan:2026-09-13_193000-refactor-manageability.md#phase-3] */
import { unlinked } from '../changelog-links.js';
import { paintRail } from './paint-rail.js';
import { paintDrawer } from './paint-drawer.js';
export function paintDetail(root, ctx){
  const { list, pi, plan, sprints, si, sel, open, texts } = ctx;
  const scrim = root.querySelector('[data-scrim]'), drawer = root.querySelector('[data-drawer]');
  const sprint = sprints[si];
  const seq = String(list.length - pi).padStart(2, '0');
  root.querySelector('[data-col="sprint"]').innerHTML = paintRail({ plan, sprints, sel, si, seq });
  root.querySelector('[data-col="tasks"]').innerHTML = paintDrawer({ plan, sprint });
  const u = unlinked(texts);
  const tri = root.querySelector('[data-col="triage"]');
  const isAllTracked = /All tracked/.test(u);
  tri.innerHTML = isAllTracked ? '' : `<hr class="ds-hr">${u}`;
  tri.hidden = isAllTracked;
  if (open) { drawer.hidden = false; scrim.hidden = false; } else { drawer.hidden = true; scrim.hidden = !ctx.timeline; }
}
