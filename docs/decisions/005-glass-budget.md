# 005 — Glass budget split points (Phase 5)

- Context: `DockSlices` (131), `DockLens` (116), `BottomDock` (107) exceeded the 100-line rule; `OPTICS`/`TOP_OPTICS`/`PULL` and three identical `getZoom` copies were scattered across engines.
- Options: (a) one shared `glass-utils` module — rejected: optics constants and rect math change for different reasons and are imported by different layers (shell reads optics, never rect math); (b) split by concern — chosen.
- Decision: `optics.js` (constants, incl. shell's `TOP_OPTICS`) + `rect-zoom.js` (`getZoom`/`toLayout`) as pure shared sources; `slice-bands.jsx` constructs only (callers clear the lens); `lens-copy.jsx` owns build+place; `dock-track.jsx` owns all pointer input while `BottomDock` keeps tab state + the `app-tab` bridge.
- Why: state stays with the component that re-renders (track/dock), DOM-imperative geometry stays in construct/place helpers, constants stay importable without React.
- Consequences: shell → glass import edge (`top-pills` reads `TOP_OPTICS`) is intentional and recorded here; any future optics retune happens in exactly one file.
