/* ADAM/DS — ds/changelog/filter-menu · anchored filter dropdown (safepipe parity).
   Icon-only funnel toggle FIRST in the chips row; active-filter state rides the
   pill `.on` class + aria-label, no text or caret in the button. The menu anchors
   under it via .ds-chips{position:relative}. Both tabs are multi-select
   checkboxes sharing planStatus() with the cards. */
const ICON = '<svg class="ds-chip-filter__icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h12L9.5 8.2V12l-3 1.5V8.2L2 3z"/></svg>';
export function filterMenu({ counts, statusCounts, active, status, filterTab, filterOpen }) {
  const n = active.size + status.size;
  const tab = filterTab === 'status' ? 'status' : 'tags';
  const tags = counts.map(([t, c]) => [
    `<label class="ds-tag-option" data-tag-opt="`,
    t,
    `"><input type="checkbox"`,
    active.has(t) ? ' checked' : '',
    `>`,
    t,
    ` (`,
    c,
    `)</label>`,
  ].join('')).join('');
  const stOpts = statusCounts.map(([t, c]) => [
    `<label class="ds-tag-option" data-status-opt="`,
    t,
    `"><input type="checkbox"`,
    status.has(t) ? ' checked' : '',
    `>`,
    t,
    ` (`,
    c,
    `)</label>`,
  ].join('')).join('');
  return [
    `<button class="ds-chip ds-chip-filter${n ? ' on' : ''}" data-filter-toggle aria-haspopup="dialog" aria-expanded="`,
    filterOpen,
    `" aria-label="Filters`,
    n ? `, ${n} active` : '',
    `">${ICON}</button>`,
    `<div class="ds-tag-dropdown" data-tag-dropdown${filterOpen ? '' : ' hidden'} role="dialog" aria-label="Filters">`,
    `<div class="ds-filter-tabs" role="tablist"><button role="tab" aria-selected="${tab === 'tags'}" data-tab="tags" class="ds-chip${tab === 'tags' ? ' on' : ''}">Tags${active.size ? ` · ${active.size}` : ''}</button>`,
    `<button role="tab" aria-selected="${tab === 'status'}" data-tab="status" class="ds-chip${tab === 'status' ? ' on' : ''}">Status${status.size ? ` · ${status.size}` : ''}</button></div>`,
    `<div class="ds-filter-opts">`,
    tab === 'tags' ? tags : stOpts,
    `</div></div>`,
  ].join('');
}
