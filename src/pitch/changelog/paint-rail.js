/* ADAM/DS — ds/changelog/paint-rail · rail head + sprint picks + foot (extracted from paint-detail.js, budget) */
import { hits } from '../changelog-links.js';
import { shortPhase as short, descOf, clip } from '../changelog-titles.js';
import { isDone, state } from '../changelog-parse.js';
import { isEdited, gateVerdictTag } from './panels.js';
import { esc } from './esc.js';
export function paintRail({ plan, sprints, sel, si, seq }) {
  const sprint = sprints[si], sprintDesc = (s) => descOf(s.body);
  const planNum = plan.id || seq;
  const railTitle = String(plan.title || short(sprint.head)).toUpperCase();
  const railHead = [
    `<div class="ds-rail-head">`,
    `<span class="ds-rail-num">${esc(planNum)}</span>`,
    `<span class="ds-rail-title" title="${esc(railTitle)}">${esc(railTitle)}</span>`,
    `</div>`,
  ].join('');
  return railHead + '<div class="ds-rail-scroll">' + sprints.map((s, i) => {
    const n = (s.head.match(/Phase (\d+)/) || [])[1] || String(i + 1),
      hsS = hits(plan.file, s.body, plan.sprints.indexOf(s) === 0),
      has = hsS.length ? ' · ' + hsS.length + ' commit' + (hsS.length > 1 ? 's' : '') : '',
      frac = state(s.body);
    const edited = isEdited(plan.file, s.head, s.body) ? ' · edited' : '';
    const gate = gateVerdictTag(s.head, s.body) ? ' · ' + gateVerdictTag(s.head, s.body) : '';
    const done = isDone(frac);
    return [
      `<button class="ds-pick`,
      i === sel[1] ? ' on' : '',
      done ? ' is-done' : /✗/.test(s.head) ? ' is-cancelled' : ' is-open is-pending',
      `" data-tip="`,
      esc(clip(sprintDesc(s), 100)),
      `"><span class="ds-row"><span class="ds-num">Phase `,
      String(n).padStart(2, '0'),
      `</span><b>`,
      esc(short(s.head)),
      `</b></span><small>`,
      [frac + has + edited + gate].filter(Boolean).join(' · '),
      `</small></button>`,
    ].join('');
  }).join('') + '</div>' + [
    `<div class="ds-rail-foot" data-foot>`,
    esc(plan.goal || sprintDesc(sprint)),
    `</div>`,
  ].join('');
}
