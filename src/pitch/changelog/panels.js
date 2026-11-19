/* ADAM/DS — ds/changelog/panels · commits panel, gate verdict, edit detection.
   One eval surface only: the phase Evals panel (task-panels.js). Gate/REF
   lines stay in their task fold as prose; the verdict rides the status line. */
import { parseGates } from './gates.js';
import { hash } from '../changelog-parse.js';
import { triCaret } from './caret.js';
import history from '../../../design-system/plan-history.json';
export function isEdited(planFile, head, body){
  const hist = history[planFile] || [];
  if(!hist.length) return false;
  const liveHash = hash(body);
  const hashes = new Set();
  let everFound = false;
  for(const e of hist){
    const sec = e.sections.find(x=>x.head===head);
    if(sec){ hashes.add(sec.hash); everFound=true; }
  }
  if(!everFound) return true;
  const earliestHas = hist[0].sections.some(x=>x.head===head);
  if(!earliestHas) return true;
  if(hashes.size>1) return true;
  if(!hashes.has(liveHash)) return true;
  return false;
}
export const renderCommitsPanel = (hs, badgesHtml) => {
  if (!hs.length) return '';
  return `<details class="ds-panel" open><summary class="ds-panel-title">${triCaret}Commits · <span class="ds-panel-num">${hs.length}</span></summary>${badgesHtml}</details>`;
};
export const gateVerdictTag = (head, body) => {
  const g = parseGates(head, body);
  if (!g) return '';
  return g.verdict === 'passed' ? 'GATE PASSED' : g.verdict === 'failed' ? 'GATE FAILED' : 'GATE OPEN';
};
