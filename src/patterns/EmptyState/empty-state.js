// ADAM/PATTERN — src/patterns/EmptyState/empty-state.js · one empty state
// Exports: emptyStateHTML
// [plan:2026-09-22_190645-visual-language.md#phase-4]

export function emptyStateHTML(title){
  return `<div class="empty-state"><p class="empty-state__title">${title}</p><p class="empty-state__body">Nothing here yet.</p></div>`;
}
