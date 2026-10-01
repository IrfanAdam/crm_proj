/* ADAM/DS — changelog link layer: manifest → phase badges + unlinked list.
   Continuation 20260909_145218_9888b1 — all future plans branch from here. */
import manifest from '../../design-system/changelog-manifest.json';
const GH = 'https://github.com/IrfanAdam/crm_proj/commit/';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
export const commits = manifest.commits || [];
export const wip = manifest.wip || [];
export const continuation = manifest.continuation || '20260909_145218_9888b1';
const badge = (c) =>
  `<a href="${GH}${c.full}">${c.sha}</a> ${esc(c.subject)} <small>${c.date}${c.time ? ' ' + esc(c.time) : ''}</small>`;
const badgeItem = (c) => `<div class="ds-timeline-item"><a href="${GH}${c.full}">${c.sha}</a> <span>${esc(c.subject)}</span><small>${c.date}${c.time ? ' ' + esc(c.time) : ''}</small></div>`;
// anchor-less commits attach to their plan's first phase; anchored ones to the first phase whose text contains the
// anchor.
export const hits = (file, text, first) => commits
  .filter((c) => c.plan === file && (c.anchor ? text.includes(c.anchor) : first));
export const badges = (list) => {
  if (!list.length) return '';
  let html = '<div class="ds-timeline">';
  let last = null;
  for (const c of list) {
    if (c.date !== last) { html += `<div class="ds-timeline-date">${esc(c.date)}</div>`; last = c.date; }
    html += badgeItem(c);
  }
  return html + '</div>';
};
export const unlinked = (texts) => {
  const xs = commits.filter((c) => !c.plan || !texts[c.plan] || (c.anchor && !texts[c.plan].includes(c.anchor)));
  if (!xs.length) return '<h2>Unlinked DS changes</h2><p>All tracked — every DS commit cites its plan.</p>';
  return ['<h2>Unlinked DS changes</h2><p>These cite no plan — link next time via ',
    '<code>[plan:&lt;file&gt;#&lt;anchor&gt;]</code>.</p>'].join('')
    + (xs.length ? ((()=>{ let h='<div class="ds-timeline">'; let l=null; for(const c of xs){ if(c.date!==l){ h+=`<div class="ds-timeline-date">${esc(c.date)}</div>`; l=c.date; } h+=badgeItem(c); } return h+'</div>'; })()) : '')
    + (wip.length ? `<p>Uncommitted:</p><ul>${wip.map((w) => `<li><code>${esc(w)}</code></li>`).join('')}</ul>` : '');
};
