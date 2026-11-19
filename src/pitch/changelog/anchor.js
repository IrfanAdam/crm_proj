/* ADAM/DS — ds/changelog/anchor · plan anchors, case-insensitive + word-bounded.
   A `task-N` trailer links to structure only — `{#task-N}`, a `Task N` heading, or
   norm()'s `- [ ] **N …` bullet — so a passing mention ("L50 moved to Task 53")
   cannot light the commit up in a second phase. task-5 never hits Task 53/530;
   phase-1 never hits phase-10. Phase/round stay ref-shaped (`{#phase-N}` plus the
   Round N heading) because this repo's machine anchors are offset from its human
   phase numbers — matching the words "Phase 9" would double-display. Extracted
   from changelog-links.js (budget): hits()/unlinked() share one rule. */
const NUM = /^(phase|task|round)[\s_-]*0*(\d+)$/;
const EDGE = '(?![0-9])';
export const anchorHit = (body, anchor) => {
  const text = String(body);
  const m = String(anchor).trim().toLowerCase().match(NUM);
  if (m) {
    const n = m[2];
    const ref = new RegExp(`#${m[1]}[-_]0*${n}${EDGE}`, 'i');
    if (m[1] !== 'task') return ref.test(text) || (m[1] === 'round' && new RegExp(`(^|\\s)round[\\s_-]*0*${n}${EDGE}`, 'i').test(text));
    return ref.test(text)
      || new RegExp(`^#{1,6}\\s*task\\s+0*${n}${EDGE}`, 'im').test(text)
      || new RegExp(`^- \\[[ xX]\\] \\*\\*0*${n}[ \\t]`, 'm').test(text);
  }
  const a = String(anchor).trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (!a) return false;
  const b = text.toLowerCase();
  return (b.split('\n')[0] || '').includes(a) || b.includes('#' + a);
};
