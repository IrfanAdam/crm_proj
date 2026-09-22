# 003 — index.html budget: device mounts-only, shell aside stays static

- Context: Phase 3 Task 2 targeted `index.html` ≤70 lines; device collapse + dead-option removal reached 75. All remaining lines are shell aside + arch panel.
- Options: (a) JS-render the shell aside to hit 70 — rejected: static shell HTML is correct (it's presenter content, not prototype; JS-rendering adds failure modes for zero layering benefit); (b) amend the target — chosen.
- Decision: the budget applies to the device region (mounts-only: `#device` is 1 line, zero inline `.device__*` prototype markup), not the shell aside. `index.html` carries no prototype styling, logic, or device markup — that is the achieved invariant.
- Why: line budget exists to force separation, and separation is complete; further cuts would compress rather than extract.
- Consequences: Phase 3 verify reads "device block ≤3 lines, zero inline prototype markup". No shell-HTML generation without a new decision.
