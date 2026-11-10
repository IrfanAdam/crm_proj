/* ADAM/DS — ds/changelog/caret · collapse glyphs for the drawer.
   tri = triangle ▸ for tasks / descriptions / panels.
   dual = day rows in evals + commits only. */
export const triCaret = `<span class="ds-caret" aria-hidden="true"><svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M3.6 2.2 8.4 6l-4.8 3.8Z"/></svg></span>`;
const ICON = 'viewBox="0 0 12 12" aria-hidden="true" focusable="false"';
const MORE = `<svg class="ds-caret-more" ${ICON}><path d="M2.5 4.6 6 1.4l3.5 3.2"/><path d="M2.5 7.4 6 10.6l3.5-3.2"/></svg>`;
const LESS = `<svg class="ds-caret-less" ${ICON}><path d="M2.5 1.4 6 4.6 9.5 1.4"/><path d="M2.5 10.6 6 7.4l3.5 3.2"/></svg>`;
export const dualCaret = (mod='') => `<span class="ds-caret--dual${mod ? ' ' + mod : ''}" aria-hidden="true">${MORE}${LESS}</span>`;
export const dayCaret = dualCaret('ds-caret--day');
