/* ADAM/DS — ds/changelog-events · drawer/filter/timeline/hover · [plan:2026-09-12_150255-glitch-sound.md#phase-6] · exports bindChangelogEvents */
// Branch order: specific [data-*] branches BEFORE generic class branches —
// closest() matches the element itself, so order is the only thing that saves
// a view-toggle element carrying a filter class from the generic branch.
import { dueUi, onDueChange } from './changelog/due.js';
import { scrollRowIntoView, syncTlEdges } from './changelog/tl-edges.js';
import { hideTlPop } from './changelog/tl-pop.js';
import { cursorTip } from './changelog/cursor-tip.js';
export function bindChangelogEvents(root, st, helpers) {
  const { cur, doPaint } = helpers;
  const onDocClick = (e) => { if (!st.filterOpen || root.contains(e.target)) return;
    if (e.target.closest('[data-tag-dropdown],[data-filter-toggle]')) return;
    st.filterOpen = false; doPaint(root); };
  const onClick = (e) => {
    const openDd = root.querySelector('[data-tag-dropdown]:not([hidden])');
    if (openDd && !e.target.closest('[data-tag-dropdown],[data-filter-toggle]')) { openDd.hidden = true; st.filterOpen = false; const tg = root.querySelector('[data-filter-toggle]'); if (tg) tg.setAttribute('aria-expanded', 'false'); }
    if (e.target.closest('[data-day-clear]')) { st.day = ''; st.sel = [0, 0]; doPaint(root); return; }
    const dd = e.target.closest('[data-day]');
    if (dd) { st.day = st.day === dd.dataset.day ? '' : dd.dataset.day; st.sel = [0, 0]; doPaint(root); return; }
    if (e.target.closest('[data-filter-toggle]')) { st.filterOpen = !st.filterOpen; doPaint(root); return; }
    const tab = e.target.closest('[data-tab]');
    if (tab) { st.filterTab = tab.dataset.tab; doPaint(root); return; }
    const tgo = e.target.closest('[data-tag-opt]');
    if (tgo) { const t = tgo.dataset.tagOpt;
      if (t) { st.active.has(t) ? st.active.delete(t) : st.active.add(t); }
      st.sel = [0, 0]; doPaint(root); return; }
    const so2 = e.target.closest('[data-status-opt]');
    if (so2) { const t = so2.dataset.statusOpt;
      if (t) { st.status.has(t) ? st.status.delete(t) : st.status.add(t); }
      st.sel = [0, 0]; doPaint(root); return; }
    if (e.target.closest('[data-clear]')) { st.active = new Set(); st.status = new Set(); st.day = ''; st.sel = [0, 0]; doPaint(root); return; }
    if (e.target.closest('[data-timeline-chip]')) { st.timeline = !st.timeline; doPaint(root); return; }
    if (e.target.closest('[data-tl-close]')) { st.timeline = false; doPaint(root); return; }
    const tc = e.target.closest('[data-tl-collapse]');
    if (tc && st.timeline) { const host = root.querySelector('aside.ds-timeline'), body = host && host.querySelector('.ds-tl-body');
      if (host && body) { const next = body.classList.toggle('is-collapsed');
        host.dataset.collapsed = next ? '1' : ''; tc.setAttribute('aria-expanded', String(!next));
        tc.setAttribute('aria-label', (next ? 'Expand' : 'Collapse') + ' plan labels');
        tc.setAttribute('title', (next ? 'Expand' : 'Collapse') + ' plan labels');
        try { syncTlEdges(host); } catch {} }
      return; }
    const to = e.target.closest('[data-tl-open]');
    if (to) { const f = to.dataset.tlOpen; st.day = ''; hideTlPop(root);
      const c1 = cur(), idx = c1.list.findIndex((p) => p.file === f);
      st.returnTimeline = st.timeline; st.timeline = false;
      st.sel = [Math.max(idx, 0), 0]; st.open = true; st.openFile = f; st.stage = 'tasks'; doPaint(root); return; }
    const edge = e.target.closest('[data-tl-edge]');
    if (edge && st.timeline) { const row = edge.closest('[data-tl-row]');
      if (row) scrollRowIntoView(root, row, edge.dataset.tlEdge); return; }
    const lane = e.target.closest('.ds-tl-lane');
    if (lane && st.timeline) { const row = lane.closest('[data-tl-row]');
      if (row) scrollRowIntoView(root, row, 'auto'); return; }
    const tm = e.target.closest('[data-tags-more]');
    if (tm) { e.preventDefault(); e.stopPropagation();
      const row = tm.closest('.ds-pick'), tags = row && row.querySelector('.ds-tags');
      if (tags) { const full = tags.dataset.tip; if (full) tags.innerHTML = full.split(' · ').map((t) => `<span class="ds-tag">${t}</span>`).join('<span class="ds-sep"> · </span>'); }
      return; }
    const dr = e.target.closest('[data-due-retry]');
    if (dr) { const c = cur(); const inp = root.querySelector('[data-due-input]');
      if (c.plan) dueUi(root, doPaint, c.plan, c.sprints[c.si], inp && inp.value ? inp.value : ''); return; }
    if (e.target.closest('[data-close]')
      || e.target.closest('[data-scrim]')) { st.open = false; st.openFile = ''; st.stage = 'list'; st.timeline = false; if (st.returnTimeline) { st.timeline = true; st.returnTimeline = false; } doPaint(root); return; }
    if (e.target.closest('[data-back]')) { st.stage = 'list'; doPaint(root); return; }
    const step = e.target.closest('[data-step]');
    if (step && !step.disabled) { const c = cur(); st.sel = [c.pi, Math.min(Math.max(c.si + Number(step.dataset.step), 0), c.sprints.length - 1)]; st.open = true; doPaint(root); return; }
    const chip = e.target.closest('.ds-chip');
    if (chip) { const t = chip.dataset.tag;
      if (!t) { st.active = new Set(); st.day = ''; }
      else { st.active.has(t) ? st.active.delete(t) : st.active.add(t); }
      st.sel = [0, 0]; doPaint(root); return; }
    const b = e.target.closest('.ds-pick'); if (!b) return;
    const col = b.closest('[data-col]'), i = [...col.querySelectorAll('.ds-pick')].indexOf(b);
    if (col.dataset.col === 'plan') { const c0 = cur(), hit = c0.list[i];
      st.sel = [i, st.sel[1]]; st.open = true; st.openFile = hit ? hit.file : ''; st.stage = 'tasks'; } else { st.sel = [st.sel[0], i]; st.stage = 'tasks'; }
    doPaint(root);
  };
  const onKey = (e) => { if (e.key !== 'Escape') return;
    if (hideTlPop(root)) return;
    if (st.open) { st.open = false; st.openFile = ''; if (st.returnTimeline) { st.timeline = true; st.returnTimeline = false; } doPaint(root); }
    else if (st.timeline) { st.timeline = false; doPaint(root); }
    else if (st.filterOpen) { st.filterOpen = false; doPaint(root); } };
  const { move, hideTip } = cursorTip(root);
  const dueChange = onDueChange(root, doPaint, cur);
  root.addEventListener('click', onClick); document.addEventListener('keydown', onKey);
  document.addEventListener('click', onDocClick); root.addEventListener('mousemove', move);
  root.addEventListener('change', dueChange); document.addEventListener('mouseleave', hideTip);
  return () => {
    root.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey);
    document.removeEventListener('click', onDocClick); root.removeEventListener('mousemove', move);
    root.removeEventListener('change', dueChange); document.removeEventListener('mouseleave', hideTip); };
}
