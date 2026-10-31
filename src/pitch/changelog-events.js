/* ADAM/DS — ds/changelog-events · drawer + filter interactions ·
   [plan:2026-09-12_150255-glitch-sound.md#phase-6] */
// Exports: bindChangelogEvents — click/key/hover wiring over shared state st
// Branch order: specific [data-*] branches BEFORE generic class branches —
// closest() matches the element itself, so order is the only thing that saves
// a view-toggle element carrying a filter class from the generic branch.
export function bindChangelogEvents(root, st, helpers) {
  const { cur, doPaint } = helpers;
  const onClick = (e) => {
    if (e.target.closest('[data-day-clear]')) { st.day = ''; st.sel = [0, 0]; doPaint(root); return; }
    const dd = e.target.closest('[data-day]');
    if (dd) { st.day = st.day === dd.dataset.day ? '' : dd.dataset.day;
      st.sel = [0, 0]; doPaint(root); return; }
    if (e.target.closest('[data-filter-trigger]')) { st.filterOpen = !st.filterOpen; doPaint(root); return; }
    const tab = e.target.closest('[data-tab]');
    if (tab) { st.filterTab = tab.dataset.tab; doPaint(root); return; }
    const so = e.target.closest('[data-status]');
    if (so) { const t = so.dataset.status;
      st.status.has(t) ? st.status.delete(t) : st.status.add(t);
      st.sel = [0, 0]; doPaint(root); return; }
    if (e.target.closest('[data-clear]')) { st.active = new Set(); st.status = new Set();
      st.day = ''; st.sel = [0, 0]; doPaint(root); return; }
    if (e.target.closest('[data-timeline-chip]')) { st.timeline = !st.timeline; doPaint(root); return; }
    if (e.target.closest('[data-tl-close]')) { st.timeline = false; doPaint(root); return; }
    const to = e.target.closest('[data-tl-open]');
    if (to) { const f = to.dataset.tlOpen; st.day = '';
      const c1 = cur(), idx = c1.list.findIndex((p) => p.file === f);
      st.sel = [Math.max(idx, 0), 0]; st.open = true; st.openFile = f; st.stage = 'tasks'; doPaint(root); return; }
    const tm = e.target.closest('[data-tags-more]');
    if (tm) { e.preventDefault(); e.stopPropagation();
      const row = tm.closest('.ds-pick'), tags = row && row.querySelector('.ds-tags');
      if (tags) { const full = tags.dataset.tip; if (full) tags.innerHTML = full.split(' · ').map((t) => `<span class="ds-tag">${t}</span>`).join('<span class="ds-sep"> · </span>'); }
      return; }
    if (e.target.closest('[data-close]')
      || e.target.closest('[data-scrim]')) { st.open = false; st.openFile = ''; st.stage = 'list'; doPaint(root); return; }
    if (e.target.closest('[data-back]')) { st.stage = 'list'; doPaint(root); return; }
    const step = e.target.closest('[data-step]');
    if (step && !step.disabled) { const c = cur(); st.sel = [c.pi,
        Math.min(Math.max(c.si + Number(step.dataset.step), 0),
          c.sprints.length - 1)]; st.open = true; doPaint(root); return; }
    const chip = e
      .target
      .closest('.ds-chip');
    if (chip) { const t = chip.dataset.tag;
      if (!t) { st.active = new Set();
        st.day = '';
      } else { st.active.has(t) ? st.active.delete(t) : st.active.add(t);
      } st.sel = [0,
        0]; doPaint(root); return; }
    const b = e.target.closest('.ds-pick'); if (!b) return;
    const col = b.closest('[data-col]'), i = [...col.querySelectorAll('.ds-pick')].indexOf(b);
    if (col.dataset.col === 'plan') { const c0 = cur(), hit = c0.list[i];
      st.sel = [i, st.sel[1]]; st.open = true; st.openFile = hit ? hit.file : ''; st.stage = 'tasks'; } else { st.sel = [st.sel[0],
        i]; st.stage = 'tasks'; }
    doPaint(root);
  };
  const onKey = (e) => { if (e.key === 'Escape' && st.open) { st.open = false; st.openFile = ''; doPaint(root); } else if (e.key === 'Escape' && st.timeline) { st.timeline = false; doPaint(root); } };
  const move = (e) => {
    const el = e.target.closest('[data-tip]'), tip = root.querySelector('.ds-cursor-tip');
    if (!tip) return;
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.dataset.tip; tip.hidden = false;
    const pad = 14; let x = e.clientX + pad, y = e.clientY + pad;
    const r = tip.getBoundingClientRect();
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - pad;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  };
  const hideTip = () => { const t = root.querySelector('.ds-cursor-tip'); if (t) t.hidden = true; };
  root.addEventListener('click', onClick); document.addEventListener('keydown', onKey);
  root.addEventListener('mousemove', move);
  document.addEventListener('mouseleave', hideTip);
  return () => {
    root.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey);
    root.removeEventListener('mousemove', move);
    document.removeEventListener('mouseleave', hideTip); };
}
