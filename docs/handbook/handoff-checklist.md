# Handoff checklist — museum refactor final gates (2026-09-22)

- [x] `npm test` green (contrast + 3 logic suites + names + track, 0 wip)
- [x] `vite build` clean — main 380.61 kB (baseline 549.94), Leaflet lazy chunk
- [x] Static `dist/` serves 200 on :5199 (`/` + `/#architecture`)
- [x] Unit tests: funnel-machine, morph-timing, temporal/transient/time-scale
- [x] Flow diagrams cite `file:line` (`docs/flows/*.mmd` + Architecture panel links)
- [x] Geometry sweep: only justified hits (`single-source:` comments + HIG 134px)
- [x] Motion: transform/opacity + whitelisted clip geometry; reduced-motion gated
- [x] Leaflet lazy (`leaflet-lazy.js`); `leaflet-global.js` deleted (backup /tmp)
- [x] `map-pan.js` deleted (superseded, 0 importers, backup /tmp/map-pan.bak)
- [x] `funnel-machine.js` kept: tested pure-logic exemplar, orphan accepted
- [x] Inventory shell rows added; orphan rows resolved
- [x] Screenshots: baseline-vs-final 16.7%/15.1% (live clock/tiles/avatars),
  self-diff 2.47%, scoped probes 0.00% (Phases 5–6)
- [x] All 6 devices switch (island/hole/notch/none), 0 console errors
- [x] Budget: 102 files, none over 100 lines (`ARCHITECTURE.md` 74/150)
- [x] Graph: 44 modules, 0 cycles (`node scripts/map-graph.mjs`)
- [x] Decisions 001–005 present in `docs/decisions/`
- [x] Add-a-tab recipe dry-run: `Deals` tapped to empty placeholder, reverted
- [ ] Push: NOT done — needs explicit `y` (repo SOP §5)
