/* ADAM/DS — ds/changelog/esc · attr escaper · [plan:2026-09-13_193000-refactor-manageability.md#phase-3] */
export const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
