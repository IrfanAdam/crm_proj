/* ADAM/DS — ds/changelog/paint-plan · build cards · [plan:2026-09-13_193000-refactor-manageability.md#phase-3] */
import { fmtDate, fmtTime, buildState, isDone } from '../changelog-parse.js';
import { hits, commits, unlinked } from '../changelog-links.js';
import { clip } from '../changelog-titles.js';
import { esc } from './esc.js';
export function paintPlan(root, ctx){
  const { list, pi, plan, sprints, si, active, day, sel, open, counts, plans, texts } = ctx;
  const scrim = root.querySelector('[data-scrim]'), drawer = root.querySelector('[data-drawer]');
  if (!plan) {
    const nf = [
      active.size ? 'these tags' : '',
      day ? fmtDate(day) : '',
    ].filter(Boolean).join(' \u00b7 ');
    root.querySelector('[data-col="plan"]').innerHTML = [
      `<p class="ds-note">Nothing matches `,
      nf || 'the changelog',
      ` yet.</p>`,
    ].join('');
    root
      .querySelector('[data-col="sprint"]')
      .innerHTML = '';
    root
      .querySelector('[data-col="triage"]')
      .innerHTML = unlinked(texts);
    drawer.hidden = true; scrim.hidden = true; return false;
  }
  const sprint = sprints[si];
  root.querySelector('[data-col="plan"]').innerHTML = list.map((p, i) => {
    const seq = String(list.length - i).padStart(2, '0'), num = p.id || seq, frac = buildState(p.sprints);
    const hcs = p.sprints.flatMap((s) => hits(p.file, s.body, p.sprints.indexOf(s) === 0));
    const valid = hcs.concat(commits.filter((c) => c.plan === p.file && !hcs.includes(c)));
    const tagged = valid.filter((c) => c.date === p.date || (c.time && c.date >= p.date));
    const last = tagged.length ? tagged.reduce((a,
        b) => (b.date + (b.time || '') > a.date + (a.time || '') ? b : a)) : null;
    const sd = fmtDate(p.date),
      st = fmtTime(p.id),
      endDate = last ? last.date : '',
      endTime = last && last.time ? fmtTime(last.time) : '';
    let endTxt = '';
    if (endDate && endDate !== p.date) {
      endTxt = ' \u2013 ' + fmtDate(endDate);
      if (endTime) endTxt += ' ' + endTime;
    } else if (endTime && endTime !== st) {
      endTxt = ' \u2013 ' + endTime;
    }
    const stBit = st ? ' ' + st : '';
    const endBit = endTxt ? ' ' + endTxt.trim() : '';
    const line1 = [sd + stBit + endBit, [
      p.sprints.length,
      ` phases`,
    ].join(''), frac].filter(Boolean).join(' \u00b7 ');
    return [
      `<button class="ds-pick`,
      i === sel[0] ? ' on' : '',
      isDone(frac) ? '' : ' is-open',
      `" data-tip="`,
      esc(clip(p.goal, 100) || p.purpose || p.title),
      `"><span class="ds-row"><span class="ds-num">`,
      num,
      `</span><b>`,
      esc(p.title),
      `</b><span class="ds-tags">`,
      p.tags.join(' \u00b7 '),
      `</span></span><small>`,
      line1,
      `</small></button>`,
    ].join('');
  }).join('');
  return true;
}
