/* ADAM/DS — ds/changelog-paint · paint composer · [plan:2026-09-13_193000-refactor-manageability.md#phase-3] */
import { paintChips } from './changelog/paint-chips.js';
import { paintPlan } from './changelog/paint-plan.js';
import { paintDetail } from './changelog/paint-detail.js';
export function paint(root, ctx){
  paintChips(root, ctx);
  if (paintPlan(root, ctx)) paintDetail(root, ctx);
}
