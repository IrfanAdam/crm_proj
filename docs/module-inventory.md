# Module inventory — baseline for the museum refactor

Every file under `src/` appears exactly once, with its target layer from the plan (§ target layer map), line count (`wc -l`), and top-level imports. Shell entries (`index.html`, `app.css`) included because they currently hold embedded layers.

## Shell — workspace chrome (`src/shell/` target)

| File | Lines | Imports | Notes |
| --- | --- | --- | --- |
| `src/workspace/canvas.js` | 92 | `devices.js` | Owns zoom + `applyDevice` var computation (duplicates frame geometry — Phase 3) |
| `src/workspace/slowmo.js` | 46 | `logic/time-scale.js` | Speed control, clean |
| `src/workspace/mobile-fullscreen.js` | 61 | — | `?app=fullscreen` view, clean |
| `src/workspace/workspace.css` | 45 | — | Workspace chrome styles |
| `src/workspace/mobile-fullscreen.css` | 38 | — | Fullscreen styles |
| `src/shell/top-pills.jsx` | 45 | glass optics (moved) | Prototype/Architecture pills, shell scope (Phase 4) |
| `src/shell/shell.css` | 6 | — | `.ws-tabs/.pill-tab` + dead `.float-tabs/.stage` removed (Phase 4) |
| `index.html` | 99 | 5 script/link tags | AT BUDGET CEILING — mixes shell + device markup + OS status bar (Phase 2/3 target) |
| `app.html` | 10 | — | Redirect shim to `/`, keep |
| `app.css` | 97 | — | TANGLE: shell tabs + stage + device frame + OS chrome + edge materials + arch panel + DS duplicates (`.avatar` l.58, `.kpi` l.68–72, `.card` l.73, `.meta` l.74) |
| `gallery.html` | 88 | — | DS gallery entry, keep |
| `preview.html` | 71 | — | Preview entry, keep |

## Device — frame + geometry (`src/device/` target)

| File | Lines | Imports | Notes |
| --- | --- | --- | --- |
| `src/workspace/devices.js` | 9 | — | EXEMPLARY single source: id/size/notch/radii. Geometry flows one way from here |

## OS — system chrome (`src/os/` target, does not exist yet)

| Embedded today | Lines | Notes |
| --- | --- | --- |
| `.status*` in `app.css:42–53` + `index.html:77` | ~12 | Hardcodes `9:41`, fixed island, static battery (Phase 2) |
| `.home-indicator*` in `app.css:77–78` | ~4 | Beside dock rules it must coordinate with (Phase 2) |
| `.device__edge*` in `app.css` | ~6 | Edge materials belong to OS (Phase 2) |

## Glass — refraction islands (`src/glass/`)

| File | Lines | Imports | Notes |
| --- | --- | --- | --- |
| `src/glass/DockSlices.jsx` | 95 | `slices-spec.js`, `slice-bands.jsx`, `rect-zoom.js` | Engine only: mount/place/rebuild + listeners (Phase 5) |
| `src/glass/DockLens.jsx` | 89 | `lens-map.js`, `lens-filter.jsx`, `lens-copy.jsx`, `optics.js`, `rect-zoom.js` | Material orchestration: measure/map/gen/remount (Phase 5) |
| `src/glass/BottomDock.jsx` | 37 | `DockLens`, `DockSlices`, `dock-track.jsx`, `engine.js`, `Icon` | Tab state + engine switch + gem (Phase 5) |
| `src/glass/dock-track.jsx` | 98 | `rect-zoom.js`, `Icon` | Track input: capsule width/drag/stretch/snap (Phase 5) |
| `src/glass/lens-copy.jsx` | 31 | `rect-zoom.js` | `buildCopy` + `placeCopy` for the lens engine (Phase 5) |
| `src/glass/slice-bands.jsx` | 33 | `slices-spec.js` | `buildCopies`: base + masked band clones (Phase 5) |
| `src/glass/optics.js` | 48 | — | `OPTICS` + `TOP_OPTICS` + `PULL`, pure (Phase 5) |
| `src/glass/rect-zoom.js` | 22 | — | `getZoom` + `toLayout`, pure (Phase 5) |
| `src/glass/dock-lens.css` | 95 | — | Lens styles |
| `src/glass/lens-filter.jsx` | 55 | `optics.js` | SVG filter chain, reads shared `OPTICS` (Phase 5) |
| `src/glass/slices-spec.js` | 57 | `optics.js` | `SLICES` + profile/offset/transform/mask helpers (Phase 5) |
| `src/glass/lens-map.js` | 48 | — | Grid probe map, pure |
| `src/glass/engine.js` | 18 | — | `ENGINE` flag `lens`/`slices`, pure |
| `src/glass/main.jsx` | 9 | `top-pills.jsx`, `BottomDock.jsx` | Island roots, clean |

## Patterns — app screens (`src/patterns/`)

| File | Lines | Imports | Notes |
| --- | --- | --- | --- |
| `src/patterns/OppsHome/nearby-sheet.js` | 98 | `live-map`, `sheet-morph`, `map-flights`, `nearby-map` | Largest pattern orchestrator — at ceiling, watch |
| `src/patterns/OppsHome/pill-expand.js` | 94 | `nearby-map`, `morph-timing`, `face-handoff`, `logic/time-scale` | Clean fan-in on morph-timing |
| `src/patterns/OppsHome/live-map.js` | 94 | `leaflet`, `leaflet-rotate`, `logic/time-scale` | Eager Leaflet import (Phase 8 lazy-load) |
| `src/patterns/OppsHome/face-handoff.js` | 86 | `nearby-map`, `morph-timing` | Clean |
| `src/patterns/OppsHome/sheet-morph.js` | 80 | `morph-timing`, `logic/time-scale` | Layout-box writes are intentional — whitelist in Phase 8 |
| `src/patterns/OppsHome/opps-home.css` | 80 | — | Pattern-scoped, clean |
| `src/patterns/OppsHome/opps-home.js` | 77 | `nearby-map`, `nearby-sheet` | `mount(page)` contract, clean |
| `src/patterns/OppsHome/map-pan.js` | 62 | — | DELETED Phase 9: superseded by Leaflet, 0 importers |
| `src/patterns/OppsHome/nearby-map.js` | 51 | `live-map` | Exports `PINS`, `PROSPECTS`, `relRect` — shared data hub |
| `src/patterns/OppsHome/morph-timing.js` | 42 | — | Pure walk/clamp — logic-candidate, unit-test in Phase 7 |
| `src/patterns/OppsHome/nearby-sheet.css` | 32 | — | Clean |
| `src/patterns/OppsHome/map-flights.js` | 13 | `sheet-morph`, `pill-expand` | Reverse dependency (flights → expand) — verify no cycle in graph phase |
| `src/patterns/OppsHome/leaflet-global.js` | — | `leaflet` | Global shim for rotate plugin |
| `src/patterns/MonitorScreen/monitor-screen.js` + `.css` | — | — | No imports — static screen |
| `src/patterns/OperateScreen/operate-screen.js` + `.css` | — | — | No imports — static screen |
| `src/patterns/ReportsMatrix/reports-matrix.js` + `.css` | — | — | No imports — static screen |

## Logic — pure state (`src/logic/`, zero DOM)

| File | Lines | Imports | Notes |
| --- | --- | --- | --- |
| `src/logic/time-scale.js` | 56 | — | `getScale`/`setScale` — imported by slowmo, sheet-morph, pill-expand, live-map |
| `src/logic/funnel-machine.js` | 19 | — | KEPT Phase 9: tested pure-logic exemplar (see tests/funnel-machine.test.mjs); importer-free by design, graph orphan accepted |
| `src/logic/temporal.js` | — | — | No importers found — decide in graph phase |
| `src/logic/transient.js` | — | — | No importers found — decide in graph phase |

## Motion — cross-cutting (`src/motion/`)

| File | Lines | Imports | Notes |
| --- | --- | --- | --- |
| `src/motion/elastic-scroll.js` + `.css` | 13+ | — | Clean |
| `src/motion/tilt-card.js` + `.css` | — | — | Clean |

## Components — DS (`src/components/`, gallery-proven)

34 files (Avatar, Button, Chip, FunnelCard, GoalBar, Icon + sprite, KpiStat, ListRow, OpportunityCard, Overlay, StatusPill, TabBar, Table, Tabs, Timeline, Toolbar, inputs, …). All CSS-scoped except `Icon.jsx` (78 lines, Phosphor wrapper). `overlay.js` (24) + `button.js`, `gem-reward.js` are behavior twins of CSS files — keep paired.

## Appendix — baselines

- Bundle (pre-refactor): `dist/assets/app-*.js` 549.94 kB / gzip 165.39 kB; gallery 1.55 kB. Recorded 2026-09-22.
- Visual baselines: `/tmp/museum-baseline/` — `workspace-1240.png` (1240×1200, 258KB) + `fullscreen-390.png` (390×844, 100KB), shot 2026-09-22 from :5174. Byte-weight confirms rendered content (blank would be <20KB); pixel-diffing starts Phase 2.
- Budget flags: 3 files over 99 lines (all glass dock); `index.html` at 99; `nearby-sheet.js` at 98.
