# 004 — Dead DeviceAppBar + the dual-clock lesson

- Context: Phase 4 Task 1 exposed two things: `DeviceAppBar` (GlassBars.jsx) has zero importers — never mounted (`main.jsx` only mounts TopPills + BottomDock); and `main.jsx` carried a second clock writer fighting `status-bar.js` for `.status__time`.
- Options: (a) wire DeviceAppBar into `#glass-appbar` now — rejected: in-device app bar is a pattern concern (OppsHome owns its header); mounting dead chrome changes visuals; (b) delete in Phase 5 — chosen.
- Decision: `DeviceAppBar` is deleted in Phase 5 (glass budget phase owns GlassBars.jsx); if a future pattern needs an in-device bar, it builds its own from DS tokens. The `main.jsx` clock was deleted immediately (one owner per DOM node — the layer rule already says this).
- Why: footprint rule — dead exports are not "for later", they are drift. The clock bug is the proof: two owners, one node, silent fight.
- Consequences: graph orphan watch now guards this — any module with 0 edges gets a wire-or-delete verdict within one phase, never carried twice.
