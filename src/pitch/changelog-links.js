/* ADAM/DS — changelog link layer: manifest → phase badges + unlinked list.
   Continuation 20260909_145218_9888b1 — all future plans branch from here. */
import manifest from '../../design-system/changelog-manifest.json';
import { fmtDate, fmtTime } from './changelog-format.js';
import { esc as escAll } from './changelog/esc.js';
const fmtTimelineDate = (iso) => { if(!iso) return ''; const d=fmtDate(iso); return d ? d.replace(' ', ' ').replace(/^([0-9]{2}) ([A-Za-z]{3}) ([0-9]{4})$/, (_,dd,mmm,yyyy)=> `${Number(dd)} ${mmm}, ${yyyy}`) : iso; };
const GH = 'https://github.com/IrfanAdam/crm_proj/commit/';
const esc = escAll;
export const commits = manifest.commits || [];
export const wip = manifest.wip || [];
export const continuation = manifest.continuation || '20260909_145218_9888b1';
const badgeItem = (c) => `<div class="ds-timeline-item"><a href="${GH}${c.full}">${c.sha}</a> <span>${esc(c.subject)}</span>${c.time ? `<small>${esc(fmtTime(c.time))}</small>` : ''}</div>`;
// anchor-less commits attach to their plan's first phase; anchored ones to the first phase whose text contains the
// anchor. Anchor normalized via .replace to bare phase-N; exact match ensures phase-1 doesn't hit phase-10.
export const hits = (file, text, first) => commits
  .filter((c) => {
    if (c.plan !== file) return false;
    if (!c.anchor) return first;
    const a = String(c.anchor).replace(/^.*?(phase-\d+).*$/i, '$1');
    const escA = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escA + '(?!\d)').test(text);
  });
export const badges = (list) => {
  if (!list.length) return '';
  let html = '<div class="ds-timeline">';
  let last = null;
  for (const c of list) {
    if (c.date !== last) { html += `<div class="ds-timeline-date">${esc(fmtTimelineDate(c.date))}</div>`; last = c.date; }
    html += badgeItem(c);
  }
  return html + '</div>';
};
export const unlinked = (texts) => {
  const xs = commits.filter((c) => {
    if (!c.plan || !texts[c.plan]) return true;
    if (!c.anchor) return false;
    const a = String(c.anchor).replace(/^.*?(phase-\d+).*$/i, '$1');
    const escA = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(escA + '(?!\d)').test(texts[c.plan]);
  });
  if (!xs.length) return '<div class="ds-callout ds-callout--success"><h2>Unlinked DS changes <span class="ds-count-badge ds-count-badge--ok">0</span></h2><p>All tracked \u2014 every DS commit cites its plan.</p></div>';
  return ['<div class="ds-callout ds-callout--warn"><h2>Unlinked DS changes <span class="ds-count-badge">', String(xs.length), '</span></h2><p>These cite no plan \u2014 link next time via ',
    '<code>[plan:&lt;file&gt;#&lt;anchor&gt;]</code>.</p>'].join('')
    + (xs.length ? ((()=>{ let h='<div class="ds-timeline">'; let l=null; for(const c of xs){ if(c.date!==l){ h+=`<div class="ds-timeline-date">${esc(fmtTimelineDate(c.date))}</div>`; l=c.date; } h+=badgeItem(c); } return h+'</div>'; })()) : '')
    + (wip.length ? `<p>Uncommitted:</p><ul>${wip.map((w) => `<li><code>${esc(w)}</code></li>`).join('')}</ul>` : '')
    + '</div>';
};
