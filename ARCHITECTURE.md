# ARCHITECTURE — ALPHA CRM layered prototype

Extract-only refactor: each layer owns its modules behind documented contracts.
Geometry flows one way from `src/workspace/devices.js`. No rewrites, no behavior
change per phase — see `.hermes/plans/2026-09-22_122850-museum-refactor.md`.

## Layer map

| Layer | Owns | Never imports |
| --- | --- | --- |
| mounts (`index.html`) | stylesheet links + `#device #os-status #os-edges #app-content` | styling, logic |
| `src/shell/` | workspace chrome, canvas viewport, launcher, slow-mo UI | patterns |
| `src/device/` | frame + geometry (`frameVars`, `buildFrame`), radii/bezel/squircle | patterns |
| `src/os/` | live clock/battery status bar, notch variants, home indicator, edges | patterns |
| `src/glass/` | shell pills vs device dock/appbar; lens\|slices engines | patterns |
| `src/patterns/` | app screens, `mount(page)`, vanilla, no OS/device knowledge | os/device/shell |
| `src/logic/` | pure state machines, zero DOM, unit-tested | DOM, always |
| `src/components/` | DS single source (avatar/card/kpi/meta), gallery-proven | prototype |
| `src/arch/` | atlas essence manifest + lenses (decisions/schema/logic), canvas orchestrator (`atlas.js` → mechanics engine) | device/os/glass |
| `src/js/mechanics/` | scheme-level canvas engine (canvas 2D, `route/highway+corridor`, `render` kind dots, `text p=0.38`, lenses `decisions|schema|logic`) | device/os/glass/patterns |

Rules: patterns → components/tokens only; glass → tokens + `app-tab` events;
logic never touches DOM. Module graph: `docs/graph.mmd` (`node scripts/map-graph.mjs`).

## Contracts

- Mounts: shell renders `#device`; `buildFrame` fills OS mount points; glass and
  patterns mount into the ids after. One owner per DOM node.
- Events: dock `BottomDock.jsx` dispatches `app-tab {detail: page}`; patterns
  `mount(page)`; both glass engines rebuild on the same event.
- Tokens: every color/size via `var(--token)`; no raw hex outside `tokens.css`.
- Geometry: `frameVars(d)` is the only computer — `canvas.js:applyDevice` applies.
- Motion: transform/opacity only, except whitelisted clip geometry (see Phase 8);
  every entry honors `prefers-reduced-motion`. Leaflet loads on first map mount.
- Flows: `docs/flows/morph-pipeline.mmd`, `tab-bridge.mmd`, `glass-engines.mmd`.
- Atlas/Mechanics: `scripts/generate-arch-atlas.mjs` → `src/arch/atlas.json` (one model, three lens views);
  `scripts/generate-mechanics-graph.js` → `src/js/mechanics/graphData.{decisions,schema,logic}.js`
  (`GROUP_BY_FILE` + per-lens `CORE`, highway routing `lane=max(G.y+h)+22+(idx%4)*14`,
  corridor guards, `p=0.38` gentle text scaling, `verify:mechanics --check` fails on staleness);
  `src/js/mechanics/graph.js` is the mode store (`decisions|schema|logic`, `localStorage mechanics:mode`,
  `CustomEvent('mechanics:mode')`); `src/arch/atlas.js` orchestrates lens nav → `engine.setMode()`,
  canvas owns pan/zoom/drag (`scale .18–3.8`, DPR cap 2) — `atlas-viewport/layout/render` retired.
  Edge kinds: `call/stone contains`, `data/violet governs`, `signal/amber dashed diamond`, `both` heads,
  kind dots `3.8/scale`.

## Add a device (1 line)

1. Append one record to `DEVICES` in `src/workspace/devices.js`
   (`{id, cat, label, w, h, r, bezel, notch, …}`).
2. The switcher rebuilds itself (`buildSelect`); `applyDevice` + `frameVars`
   derive every var — no other file changes.
3. Verify: switch devices on `:5174`; meta line + notch variant correct.

## Add a tab (dry-run proven 2026-09-22)

1. Append `{ id, icon, a11y }` to `ITEMS` in `src/glass/BottomDock.jsx`
   (Phosphor icon name; tabs read state via `aria-label`).
2. Add the content branch in `mount(page)` (`src/patterns/OppsHome/opps-home.js`).
   Engine rebuild + capsule math follow automatically via `app-tab`.
3. Verify: tap the tab on `:5174` fullscreen (CDP `Input.dispatchMouseEvent`);
   dry-run placeholder `Deals` rendered `Deals is empty for now.` with zero errors.

## Ports

- `:5173` — the user's own server. Never kill it, never bind it.
- `:5174` — agent verification (dev server this repo serves).
- `5199+` — static `dist/` checks and headless smoke. Dev HMR masks state bugs,
  so judge interactive behavior only after a fresh reload.

## Slow motion

`src/workspace/slowmo.js` drives `src/logic/time-scale.js` (`setScale` clamps to
`0.05–1`; every WAAPI animation re-syncs, `scaled(ms)` stretches timers).
Node tests stub DOM globals before importing it — see `tests/temporal.test.mjs`.

## Headless verify

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --disable-gpu --remote-debugging-port=9337 --user-data-dir=/tmp/px about:blank &
# CDP: Emulation.setDeviceMetricsOverride + Page.navigate + Runtime.evaluate asserts
# Stash-A/B pixel probe (git stash -u → probe → pop → probe → PIL diff) proves 0% drift.
```

Decisions live in `docs/decisions/`; inventory in `docs/module-inventory.md`.
