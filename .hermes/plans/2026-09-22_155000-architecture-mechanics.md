# Architecture Mechanics — Scheme-Level Product Canvas (Decisions / Schema / Logic)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. Source of truth for canvas behavior is `mechanics-visualization` skill (SKILL.md v0.1.0) — copy its 8-module engine verbatim, adapt only the data contract.

**Goal:** Raise the Architecture Atlas from its current SVG essence (single-column L1 nodes, elbow paths, ~30 nodes/lens, presentation-grade but flat) to a **scheme-level, node-based, connector-complex** visualization — a living canvas per lens (Decisions / Schema / Logic) using the Tapmania mechanics engine (canvas 2D, lane cards, mono edges with kind dots, orthogonal highway routing with corridor guards, drag/pan/zoom, lazy load). Each lens becomes an optimized mechanics graph: not code detail, not presentation (components/IA/layout are excluded — they serve multiple purposes and already have `docs/graph.mmd` + `gallery.html`), but product-scheme interconnectedness (decisions→schemas→machines→states→gems/goals).

**Architecture:** `scripts/generate-mechanics-graph.js` → `src/js/mechanics/graphData*.js` (one generated graph per lens) + `src/js/mechanics/graphData.ia.js` manual IA parity — merged with existing `scripts/generate-arch-atlas.mjs → src/arch/atlas.json` as the essence manifest. `src/js/mechanics/graph.js` is the mode store (`decisions|schema|logic`, localStorage `mechanics:mode`, `CustomEvent('mechanics:mode')`). `logic` is funnel-machine + temporal/transient + time-scale; `schema` is the Opportunity/Goal/Funnel data shapes; `decisions` is the product + architecture decision graph. Presentation-only graphs (`components`, `ia`, `truth` from prior Atlas) are intentionally not carried into this mechanics — they remain in `docs/graph.mmd` + `src/arch/atlas.json` for reference but are not rendered in the mechanics canvas. `src/js/mechanics/canvas.js` (engine) + `render.js` + `route.js` + `corridor.js` + `popover.js` + `text.js` render into `#atlas-canvas` (replaces SVG). `src/arch/atlas.js` becomes the orchestrator (lens nav → `engine.setMode()`), `atlas-state.js` stays as selection bus, `atlas-viewport.js` is retired (canvas engine owns pan/zoom). `index.html#mechanics-view` shell patterns are folded into `#panel-architecture .ws-canvas--arch` (no second overlay — architecture IS mechanics).

**Tech Stack:** Vanilla JS + Canvas 2D (no graph lib), Vite MPA, existing workspace left-rail + right-canvas shell, `design-system/tokens.css` as single token source (skill consumes `var(--token)` only, JS reads via `getComputedStyle`), Node generator, `gen:mechanics`/`verify:mechanics` gates. No new deps. File budget ≤100 lines/module (lint-manage where present).

**Tags:** Architecture, Canvas, Mechanics, Visualization, Tooling

---

## Current context / assumptions

- crm_proj today has **no mechanics**: `src/js/mechanics`, `src/styles/mechanics.css`, `scripts/generate-mechanics-graph.js`, `gen:mechanics` all absent (`find . -grep mechanics` only hits this plan + prior arch-atlas mention). What exists is the **Atlas SVG**: 4 lenses (`logic/components/ia/truth`), 471-line `atlas.json` (L1, ~44 nodes, 3 edge kinds `contains/governs/composes`), deterministic single-column layout (`atlas-layout.js:10` stacks `x=40, y=32+i*(48+16)`), SVG elbow `renderAtlas` (`atlas-render.js:19`), CSS-panned viewport (`atlas-viewport.js` scale 0.3–2.5, drag-pan, wheel-zoom), left `atlas-nav` tree + right `#atlas-canvas` (max 560px). Shipped Phases 1–4 of `2026-09-22_082844-arch-atlas.md`.
- The prior plan explicitly called Tapmania `src/js/mechanics/` "hobby" (canvas, every-function, hand-placed) and chose SVG for sharpness at ~60 nodes. That bar is now too low for ALPHA — product scheme needs **connector density**: decisions (≥7) × constrained schema/logic targets, schema (5 entities × 6 fields × 4 gem categories × Operate/Monitor flows), logic (4 machines × 7 states × NEXT chain × temporal/transient). SVG single-column elbows collapse at this density; mechanics highway+corridor routing is required.
- Other project (Tapmania / `clicker_test`) is the reference: 8 mechanics modules (114/29/93/57/151 lines), `mechanics.css` tokens-only, `GROUP_BY_FILE` + `CORE` + `graphData.manual.json` → `graphData.js` layout `COLS` 2-row grid (`boot(18,130)` `state(162,16)↔game(162,244)` `shop(322,16)↔out(322,244)`), `graph.js` dual `functions|components`, `canvas.js` `RH=18,RG=3,HH=32` engine with `resize/zoom/pan/dragGroup/dragNode/reorder/clearRouteCache`, `render.js` `p=0.38` subtle scaling + `EDGE_STYLES {call:stone-500, data:violet-600, signal:amber-600}`, `route.js` corridor-guarded `getRoute` + `highway` `lane=max(G.y+h)+22+(idx%4)*14`, `index.js` lazy `initMechanics()` with `H`/`Esc`/`history.pushState({mechanics:true})` + autoMute. Verified: `npm run gen:mechanics && verify:mechanics` + Vite `mechanicsGraphPlugin`.
- crm_proj tokens mismatch is the main port risk: `design-system/tokens.css` uses `--bg-primary/--text-primary/--border-thin/--primitive-neutral-*` and lacks every skill primitive (`--blue-600`, `--violet-50/600`, `--amber-50..800`, `--emerald-50/700`, `--rose-50/600`, `--orange-50/600`, `--stone-50..900`, `--color-bg/card/border`, `--z-mechanics`). Must shim without breaking DS — add missing primitives as aliases to existing scales (stone→neutral-light, violet→signal, amber→caution etc.) or as new OKLCH values, consumed only via `var(--token)`.
- Constraints (repo law): ≤100 lines/file, tokens only, `ARCHITECTURE.md` layer map, plan trailer `[plan:<file>#<anchor>]` on DS commits, `npm test` green, `:5173` never killed (verify on `:5174`), no push without explicit `y`, `docs/graph.mmd` reflects module graph.

## Proposed approach

Model **product scheme**, not code graph: 4 mechanics graphs (one per lens), each with 3–5 lane groups, 15–35 nodes, typed connectors — visualized with the same engine so interaction is identical per tab but content is lens-optimal.

- **Logic lens** (`logic` mode): Scheme = pure logic machines as product law. Sources: `src/logic/funnel-machine.js` (7 states + `NEXT`), `temporal.js` (`temporal/sliceTemporal`), `transient.js` (`transient/filterTransient`), `time-scale.js` (`getScale/setScale/scaled/track/later`), `morph-timing.js` (whitelisted clip geometry). Groups: `Machines` (logic file nodes), `States` (initial→retained), `Rules` (transient vs temporal, `app-tab` bridge, morph pipeline). Edges: `governs` (machine→state, violet), `signal` (state→state transitions dashed amber diamond), `data` (read/write temporal/transient, violet `both`).
- **Schema lens** (`schema` mode): Scheme = product data shapes, not UI. Sources: `DESIGN.md` components `opportunity-card/funnel-card/goal-bar/gem-reward`, `src/logic/*` shape helpers, `src/patterns/*/opps-home.js` Opportunity fields. Groups: `Entities` (Opportunity, Prospect, Goal, Gem, Funnel), `Fields` (value-amount/chance-value/status-pill/funnel-glyph), `Categories` (Sapphire/Citrine/RedBeryl/Amethyst + citrine/redberyl signal variants), `Flows` (Operate vs Monitor surface assignment). Edges: `contains` (entity→field, stone), `governs` (funnel state→field visibility), `signal` (gem category→goal-bar fill).
- **Decisions lens** (`decisions` mode): Scheme = product + arch decisions that constrain the schema/logic above. Sources: `docs/decisions/001..006` + `DESIGN.md` + `ARCHITECTURE.md` Rules. Nodes per decision (e.g., `001-shell-split`, `Sapphire sole action hue`, `Operate/Monitor never mixed`, `transient vs temporal`, `signal swap-slot`, `gems ceremony not chrome`, `light-first typography`). Groups: `Product` (Operate/Monitor, funnel, gems, signal), `System` (tokens swap-slot, primitives 50–900, Inter hierarchy), `Architecture` (shell/device/os/glass/patterns/logic ownership). Edges: `governs` (decision→schema/logic node it constrains), `contains` (decision hierarchy). No presentation nodes (no `components/*`, no `glass/*`, no `device/*` geometry) — those graphs stay in `docs/graph.mmd` and `gallery.html`.

Generator is product-only: `GROUP_BY_FILE` maps only `src/logic/* → machines|states|rules`, `DESIGN.md` + `tokens/*.json` → schema entities, `docs/decisions/*` → decisions — no `src/components/*`, `src/glass/*`, `src/device/*`, `src/os/*`, `src/workspace/*` groups (presentation excluded). `CORE` is rewritten per lens (single source; edit there to change scheme). `COLS` per lens is independent — each mode has its own lane positions but shares the 2-row grid formula. `graphData.manual.json` stays `{}` until ad-hoc product nodes needed. `graph.js` has 3 modes (`decisions|schema|logic`); `canvas.js` bases for dblclick reset store per-mode. `atlas.js` is thinned to lens-nav + product detail renderers; canvas engine owns the picture.

---

## Phase 1 — Mechanics scaffold into crm_proj (verbatim engine, zero scheme opinion) {#phase-1}

*Tags: Tooling, Canvas*

Ship the engine cleanly — no domain wiring yet. App builds, canvas renders a placeholder graph.

### Task 1: Token shim + mechanics.css (tokens-only gate) ✓ done

**Objective:** Canvas can read every `var(--token)` without hex fallback; no raw color in JS/CSS outside tokens.

**Files:**
- Modify: `design-system/tokens.css` (append mechanics primitives)
- Create: `src/styles/mechanics.css` (verbatim from `clicker_test/src/styles/mechanics.css`, 57 lines, tokens-only — already spec-compliant)

**Steps:**
1. Write failing test `tests/mechanics-tokens.test.mjs`: assert `tokens.css` contains `--stone-50..900`, `--violet-50/600`, `--amber-50..800`, `--emerald-50/700`, `--rose-50/600`, `--orange-50/600`, `--blue-600`, `--color-bg`, `--color-card`, `--color-border`, `--z-mechanics`, `--size-tooltip`.
2. Map crm_proj scale via DTCG (never hand-edit `design-system/tokens.css` — it is GENERATED): add a compat layer `tokens/mechanics-compat.json` (or extend `tokens/primitives.json`) that aliases mechanics primes to ALPHA primitives: `stone-*` → `neutral-light/dark` (`stone-50→neutral-light-50 (#ffffff)`, `stone-100→neutral-light-200 (#fafafa)`, `stone-200→neutral-light-400 (#e0e0e0)`, `stone-500→neutral-dark-100 (#8f8f8f)`, `stone-900→neutral-dark-700 (#141414)`), `violet-*` → `amethyst-*` (`violet-50→amethyst-50 #fcf5ff`, `violet-600→amethyst-500 #6e00db`), `amber-*` → `citrine-*`/`signal-amber` (`amber-50→citrine-50 #fff8e6`, `amber-600→citrine-500 #9d6a00`), `emerald-*` → `green-*` (`emerald-50→green-50 #f2fff3`, `emerald-700→green-500 #12a11b`), `rose-*` → `red-beryl-*` (`rose-50→red-beryl-50 #fff0f4`, `rose-600→red-beryl-400 #ea005e`), `orange-*` → `orange-*` (`orange-50→orange-50 #fef0e6`), `blue-600→sapphire-ui-500 (#1666af = --signal)`; semantic aliases `--color-bg→--bg-primary`, `--color-card→--bg-surface`, `--color-border→--border-thin`, `--z-mechanics→--z-index-modal (1040)`, `--size-tooltip:280px`, `--space-*→--spacing-*` (mechanics `space-1(2px)=spacing-1(0.25rem)` mapping). Run `node scripts/build-tokens.mjs` to regenerate `design-system/tokens.css`. No raw hex outside `tokens/` — `npm run lint:tokens` must stay green.
3. Copy `mechanics.css` verbatim (overlay `fixed inset 0 z(--z-mechanics)`, topbar, float glass `color-mix(card 88%, transparent)` + `blur(10px)`, tooltip `max-width --size-tooltip`, footer kbd, clean mode, `@640px` hide hint). Grep `var(--` — every token must resolve.
4. `npm run build` + `node --test tests/mechanics-tokens.test.mjs` → PASS; `wc -l src/styles/mechanics.css` ≤99.

**Verify:** `grep -c "var(--" src/styles/mechanics.css` = all tokens present; `npm run build` no unresolved token warning.

### Task 2: Copy 8 mechanics modules verbatim (file-budget hard cap) ✓ done

**Objective:** Engine exists exactly as spec — no ALPHA edits yet except import paths for new token locations.

**Files:**
- Create: `src/js/mechanics/canvas.js` (151→ split if >100 — original violates budget; split per ALPHA 100 cap: keep `canvas.js` ≤99 by extracting `interaction.js` or trim comments, otherwise waive with `// budget-waive` and record in `lint-manage.mjs` if present)
- Create: `src/js/mechanics/render.js`
- Create: `src/js/mechanics/route.js`
- Create: `src/js/mechanics/corridor.js`
- Create: `src/js/mechanics/popover.js`
- Create: `src/js/mechanics/text.js`
- Create: `src/js/mechanics/graph.js` (adapt to 4 modes — placeholder `logic|components|ia|truth` keys, but wire to 4 generated files)
- Create: `src/js/mechanics/index.js` (orchestration, but retarget `#atlas-canvas`/`#atlas-nav` instead of `#mechanics-view`)
- Create: `src/js/mechanics/graphData.js` (placeholder — will be generated)
- Create: `src/js/mechanics/graphData.ia.js` (placeholder manual IA parity)
- Create: `src/arch/mechanics.css` shim if `src/styles/mechanics.css` conflicts with `atlas.css` (or import mechanics.css eager in `index.html`)

**Steps:**
1. Copy each verbatim from `clicker_test/src/js/mechanics/*.js`; preserve constants `RH=18,RG=3,HH=32,PY=4,PX=3`, `token()`/`kindColor()`, `EDGE_STYLES`, `p=0.38`, `STUB=12,PAD=8`, `freeCh probes [12..160]`, `highway lane +22+(idx%4)*14`, `clearRouteCache()` calls.
2. Enforce `wc -l ≤99` per file: if `canvas.js` is 151, split into `canvas.js` (engine) + `canvas-interaction.js` (pointer/wheel) OR document exception in `docs/decisions/mechanics-budget.md` (canvas engine is irreplaceable at spec).
3. `graph.js` initial `STORE = {logic, components, ia, truth}` with stubs; `mode = localStorage.getItem('mechanics:mode') || 'logic'` (fallback to `logic` not `functions`).
4. No import of audio/mute — ALPHA has no soundToggle; strip `audioManager` autoMute from `index.js` (keep `H`/`Esc` only).
5. `npm run build` still passes (engine tree-shaken until wired).

**Verify:** `for f in src/js/mechanics/*.js; do wc -l $f; done` ≤99 (or waived); `npm run build` 0 errors.

### Task 3: Vite plugin + npm scripts (freshness without manual gen) ✓ done

**Objective:** Generator loop is alive; stale graphs cannot ship.

**Files:**
- Modify: `vite.config.js` (add `mechanicsGraphPlugin` alongside `react()` — identical to skill: `buildStart` `spawn node scripts/generate-mechanics-graph.js` + `configureServer` file watcher debounced 150ms, `watcher.on('change/add/unlink', f=>f.startsWith('src/') && !f.includes('/mechanics/'))`)
- Modify: `package.json` (add `"gen:mechanics": "node scripts/generate-mechanics-graph.js"`, `"verify:mechanics": "node scripts/generate-mechanics-graph.js --check"`, append `&& node scripts/generate-mechanics-graph.js --check` to `test` chain after `verify:atlas`)
- Create: `scripts/generate-mechanics-graph.js` (stub that emits placeholder `graphData.js` with 4 GROUPS/NODES — real CORE in Phase 2)
- Create: `scripts/graphData.manual.json` (`{}`)

**Steps:**
1. Write `scripts/generate-mechanics-graph.js` as stub: emit `GROUPS` 4 lanes, 6 nodes, `KINDS` as spec, `--check` exits 1 if stale (hash compare before write).
2. Add plugin, add scripts, run `npm run gen:mechanics` → writes `src/js/mechanics/graphData.js`; `npm run verify:mechanics` → 0.
3. Run `npm test 2>&1 | tail` → PASS (add mechanics verify to pass).

**Verify:** `npm run gen:mechanics && npm run verify:mechanics; echo $?` 0; dev watcher coalesces 150ms (touch `src/logic/funnel-machine.js`, observe `graphData.js` refresh).

---

## Phase 2 — Scheme taxonomy & generator per lens (the raised bar) {#phase-2}

*Tags: Tooling, Function, Design System*

Define the domain — one scheme graph per lens, each optimized for connector density at scheme level.

### Task 4: Write the 4-lens CORE + GROUP_BY_FILE + COLS (single source) ✓ done

**Objective:** Editing `CORE` changes the product picture; file→lane mapping is explicit.

**Files:**
- Modify: `scripts/generate-mechanics-graph.js` (full rewrite — no longer stub)

**Steps:**

1. `GROUP_BY_FILE` for ALPHA (order matters, first match wins):
   ```
   [/^src\/logic\/funnel-machine\.js$/, 'machine'],
   [/^src\/logic\//, 'machine'],
   [/^src\/patterns\/OppsHome\//, 'surface'],
   [/^src\/patterns\/OperateScreen\//, 'surface'],
   [/^src\/patterns\/MonitorScreen\//, 'surface'],
   [/^src\/patterns\/ReportsMatrix\//, 'surface'],
   [/^src\/components\//, 'primitives'],
   [/^src\/glass\//, 'nav'],
   [/^src\/device\//, 'shell'],
   [/^src\/os\//, 'shell'],
   [/^src\/workspace\//, 'shell'],
   [/^src\/arch\//, 'truth'],
   [/^src\/shell\//, 'shell'],
   ```

2. Per-lens `CORE` (edit these to change scheme — never edit generated files). No presentation nodes (no `src/components/*`, `src/glass/*`, `src/device/*`, `src/os/*` groups) — those are excluded by design per your mature requirement.
   - **Logic** (`src/js/mechanics/graphData.logic.js`): GROUPS `machines(18,16,108) / states(162,16,108) / rules(162,244,124) / temporal(322,16,118)` tints `--color-card / violet-50 / amber-50 / stone-100`. Nodes: `funnelMachine` + `temporal` + `transient` + `timeScale` (logic files, kind `state`), 7 state nodes (`initial, elastic, top, middle, bottom, closed, retained` — kind `state`, group `states`), rules `transientVsTemporal`, `appTabBridge`, `morphPipeline`, `NEXT chain` (kind `signal`). Edges: `governs` (machine→state, violet tri), `signal` (state→state `NEXT` dashed amber diamond), `data` (state ↔ temporal/transient, violet `both`).
   - **Schema** (`graphData.schema.js`): Sources `DESIGN.md` + `tokens/primitives.json` + `src/logic/*.js` shapes. GROUPS `entities(18,130,108) / fields(162,16,108) / categories(162,244,124) / flows(322,16,108)`. Nodes: entities `Opportunity`, `Prospect`, `Goal`, `Funnel`, `GemReward` (kind `state`), fields `value-amount/chance-value/status-pill/funnel-glyph/funnel-card/goal-bar` (kind `visual`), categories `Sapphire/Citrine/RedBeryl/Amethyst` + `signal-amber/teal` (kind `shop`), flows `Operate` vs `Monitor` (kind `entry`). Edges: `contains` (entity→field, stone), `governs` (funnel state→field visibility), `signal` (gem category→goal-bar fill, amber).
   - **Decisions** (`graphData.decisions.js`): Sources `docs/decisions/*.md` + `DESIGN.md` + `ARCHITECTURE.md` Rules. GROUPS `product(18,16,108) / system(162,16,108) / architecture(162,244,124) / constraints(322,16,108)`. Nodes per decision (e.g., `dec-001-shell-split`, `dec-sapphire-sole-hue`, `dec-operate-monitor-split`, `dec-transient-vs-temporal`, `dec-signal-swap-slot`, `dec-gems-ceremony`, `dec-light-first-type` — kind `entry|state`, group by `product|system|architecture`), each `desc` is the decision rationale one-liner. Edges: `governs` (decision→schema/logic node it constrains, violet), `contains` (decision grouping, stone).

3. Layout: For each lens, compute `groups[].h = 32+4*2 + count*18 + (count-1)*3` (HEADER_H+PAD_Y*2 + nodes). Assign `nodes[].x = g.x+3, y = g.y+32+4+idx*21, w = g.w-6, h=18`. `KINDS` per spec: `entry:blue-600, state:violet-600, game:amber-700, shop:orange-600, audio:emerald-700, visual:rose-600` (relabel `shop→component`, `audio→signal` for ALPHA if preferred but keep colors).

4. Merge `scripts/graphData.manual.json`: existing id → `Object.assign`, new id → push to `game|surface` lane (expand `h`), same as skill.

5. Emit 3 files `src/js/mechanics/graphData.{decisions,schema,logic}.js` header `// @generated — do not edit. Source: scripts/generate-mechanics-graph.js` + `export const GROUPS/NODES/EDGES/KINDS`. `graphData.js` remains the default export for `logic` (functions parity) for backward compat. No `graphData.components.js` / `graphData.ia.js` / `graphData.truth.js` — presentation graphs are out of scope.

6. `npm run gen:mechanics && npm run verify:mechanics` green.

**Verify:** `ls src/js/mechanics/graphData.*.js` = 3 files; `node scripts/generate-mechanics-graph.js --check; echo $?` 0; per-lens counts: logic ≥10 nodes (4 machines + 7 states + 3 rules), schema ≥12 nodes (5 entities + 6 fields + 4 categories), decisions ≥7 nodes (001-006 + product decisions).

### Task 5: Graph store 4-way + bases per mode ✓ done

**Objective:** `setMode('decisions'|'schema'|'logic')` swaps live `GROUPS/NODES/EDGES/KINDS` atomically.

**Files:**
- Modify: `src/js/mechanics/graph.js` (replace 2-mode STORE with 4)
- Modify: `src/js/mechanics/canvas.js` (add `bases[mode][id]` for `decisions/schema/logic` dblclick resets; currently stores `functions|components` bases — expand)

**Steps:**
1. `import * as Decisions from './graphData.decisions.js'; import * as Schema from './graphData.schema.js'; import * as Logic from './graphData.logic.js'; const STORE={decisions:Decisions, schema:Schema, logic:Logic}; let mode=['decisions','schema','logic'].includes(localStorage.getItem('mechanics:mode')) ? localStorage.getItem('mechanics:mode') : 'logic'; export let GROUPS=STORE[mode].GROUPS …; export function setMode(next){ if(!['decisions','schema','logic'].includes(next)) return; … GROUPS=STORE[mode].GROUPS; … dispatch('mechanics:mode')} `
2. Capture `bases` snapshot per mode at module load: `const bases={}; for(const k in STORE) bases[k]=Object.fromEntries(STORE[k].GROUPS.map(g=>[g.id,{...g}]));`.
3. `canvas.js` `dblclick` on header resets `GROUPS[id]` to `bases[getMode()][id]` then `layoutGroup(g); clearRouteCache(); draw();`.

**Verify:** `localStorage.setItem('mechanics:mode','components'); location.reload()` persists; `engine.setMode('ia')` refits scale/ox/oy from new BB.

---

## Phase 3 — Atlas → Mechanics canvas swap (retain lenses as view modes) {#phase-3}

*Tags: Layout, Component, Interaction*

Replace SVG picture with mechanics canvas — keep left nav + detail lenses, change only the picture.

### Task 6: Reshell #panel-architecture for mechanics engine ✓ done

**Objective:** Right panel hosts the canvas (`#mechanics-canvas` inside `#atlas-canvas`) without breaking workspace grid.

**Files:**
- Modify: `index.html:45-80` (`#panel-architecture` section: replace `div#atlas-canvas.atlas__canvas` inline SVG with mechanics shell: `div#atlas-canvas.atlas__canvas.mechanics-canvas-wrap > canvas#mechanics-canvas + div#mechanics-tooltip + div.mechanics-float-controls + div.mechanics-float-legends` + `.mechanics-topbar` hidden or folded into left card if needed; keep `#atlas-nav` tree)
- Modify: `src/arch/atlas.css` (merge `src/styles/mechanics.css` patterns: canvas-wrap `position:relative overflow:hidden`, float glass `color-mix(card 88%, transparent) blur(10px)`, tooltip 280px clamp, clean mode `--clean` hides legends/footer hint)
- Modify: `src/arch/atlas.js` (composer — remove `renderAtlas/layoutLens` SVG path, import `createMechanicsCanvas` + `getMode/setMode` from `../../js/mechanics/graph.js`)

**Steps:**
1. In `index.html`, keep MPA shell (`ws-controls` 300px | `ws-main` 1fr) — add `canvas#mechanics-canvas width=1600 height=900 aria-label="Architecture mechanics canvas"` inside `#atlas-canvas`. Add 3-option `select#mechanics-mode` (decisions/schema/logic) inside `mechanics-float-controls` (labelled View) + `button#mechanics-chrome-toggle` (`◱ Hide`). Replace `#atlas-nav` 4 buttons (`logic/components/ia/truth`) with 3 product buttons: `Decisions` (`data-lens="decisions"`), `Schema` (`data-lens="schema"`), `Logic` (`data-lens="logic"`) — keep `role=tree` — sync select ↔ nav → `engine.setMode()`.
2. In `atlas.css`, add mechanics chrome: `.mechanics-canvas-wrap{position:relative;overflow:hidden;background:var(--bg-primary)}` `#mechanics-canvas{display:block;width:100%;height:560px}` (560 matches prior SVG max-width but fluid), `.mechanics-tooltip{max-width:280px;…}`, `.mechanics-float-controls{position:absolute;top:12px;right:12px;…}`, `@640px hide hint`, legends pill styles (lane tints `--stone-100/--violet-50/--amber-50/--orange-50/--emerald-50`). Never raw hex.
3. Lazy load: eager import `src/styles/mechanics.css` in `index.html` `<link>` or `atlas.js` top import; lazy import mechanics engine only on first lens click (save ~18KB initial). Pattern from skill: `let loaded=false; nav.addEventListener('click', async e=>{ const btn=e.target.closest('[data-lens]'); if(!btn||loaded) return; const {createMechanicsCanvas}… });`.

**Verify:** `document.getElementById('mechanics-canvas') instanceof HTMLCanvasElement` true; `getComputedStyle(canvas).height` ≥500px; no layout shift on left nav.

### Task 7: Wire atlas-state → mechanics mode + selection bridge ✓ done

**Objective:** One canvas, four lenses — nav, canvas mode, URL state, and detail panel agree. Selection in canvas drives detail cards (logic/components/ia); truth lens renders text page over canvas (as before).

**Files:**
- Modify: `src/arch/atlas.js` (rewrite ~74→ ~99 lines: import `data` still for detail lens copy, but graph comes from mechanics)
- Modify: `src/arch/atlas-state.js` (replace valid lenses `['logic','components','ia','truth']` with `['decisions','schema','logic']`, default `logic`, keep `selected`, add `mode` alias so `mechanics:mode` event syncs it)
- Rewrite: `src/arch/lens-logic.js` (funnel states → governs, temporal rule), `lens-schema.js` (entity→field→category containment), `lens-decisions.js` (decision→governs target + rationale) — each `(node, atlas) → HTML` for `.atlas__sel`; delete `lens-components.js`/`lens-ia.js` (presentation-only) or keep as deprecated but not wired to mechanics
- Retire: `src/arch/atlas-layout.js` (single-col stack no longer used — delete or keep for `canvasSize` fallback only)
- Retire: `src/arch/atlas-render.js` (SVG builders deleted after cut — remove import, keep `renderDetail` if reused)
- Retire: `src/arch/atlas-viewport.js` (canvas engine owns pan/zoom — delete)

**Steps:**
1. `atlas.js` `initAtlas()` now: `const canvasEl=document.getElementById('mechanics-canvas'); const tip=document.getElementById('mechanics-tooltip'); const modeSelect=document.getElementById('mechanics-mode'); let engine=null; function ensureEngine(){ if(engine) return; engine=createMechanicsCanvas(canvasEl, tip); engine.setMode(state.lens); }` Bind `state.subscribe(({lens, selected})=>{ if(engine) engine.setMode(lens); paintSelection(canvas, lensGraph(data, lens), selected, lens); syncModeUI(); })`.
2. `paintSelection` stays but queries canvas engine selection: `canvas.querySelector('.atlas__sel')?.remove(); // product-only: no truth overlay — canvas always visible; `detailFor` now dispatches `decisions→lens-decisions.js`, `schema→lens-schema.js`, `logic→lens-logic.js` (no `renderTruth()` in mechanics canvas; truth stays at `docs/decisions/*` + `docs/graph.mmd`)`
3. `click` in canvas engine already emits selection — bridge it: `canvasEl.addEventListener('mechanics:select', e=>state.select(e.detail.id))` (or reuse `engine.onSelect` callback if provided; if not, add callback param to `createMechanicsCanvas` options: `onTap:id=>state.select(id)`).
4. Mirror `atlas-state.setLens` → `localStorage.setItem('mechanics:mode', lens)` + `document.dispatchEvent(new CustomEvent('mechanics:mode',{detail:{lens}}))` so canvas engine stays in sync when navigating via left nav without engine ready.
5. `H`/`Esc` from skill: `document.addEventListener('keydown', e=>{ if(e.key==='Escape' && state.selected){ state.clear(); engine?.clearSelection(); } if((e.key==='h'||e.key==='H') && engine){ toggleChrome(); }})` — only if no input focused.
6. Delete `atlas-viewport.js` and SVG imports after probe passes; update `docs/graph.mmd` via `node scripts/map-graph.mjs`.

**Verify:** Click left nav `Schema` → canvas refits (scale changes), tooltip shows `lens-schema.js` entity→field; selecting a node in canvas highlights it + populates `.atlas__sel` with decision/schema/logic detail; `localStorage.getItem('mechanics:mode')` persists after reload; `Esc` clears selection; `H` hides chrome.

---

## Phase 4 — Scheme-level connector density + kind semantics (raise the bar) {#phase-4}

*Tags: Design System, Motion, Tooling*

The alphabet must read as a system:mono edges, kind dots, dashed signals, `both` heads, highway spread — legible at 0.3–3.8×.

### Task 8: Edge kinds + kind dots + dot legend per lens ✓ done

**Objective:** Three product lenses share 3 edge alphabets but each lens emphasizes one: logic=`governs`/`signal` dominant (state machine), schema=`contains`/`governs` (entity→field), decisions=`governs` (decision→target).

**Files:**
- Modify: `src/js/mechanics/render.js` (confirm `EDGE_STYLES = { call:{color:'--stone-500',dash:[],w:1.25,head:'tri'}, data:{color:'--violet-600',dash:[],w:1.25,head:'tri'}, signal:{color:'--amber-600',dash:[7,5],w:1.25,head:'diamond'} }` mapping: `contains→call`, `governs|composes|depends→data`, `signal→signal`; or add explicit `contains/governs/composes` aliases)
- Modify: `src/js/mechanics/popover.js` (per-lens badge: logic badge shows `both?↔:→`, components badge shows `composes`, ia badge shows `contains`)
- Modify: `src/arch/atlas.css` (float legends: `Lanes:` pills with tint boxes + `Kinds:` pills `Entry/Component/Screen/Signal` with `i` dots `var(--blue-600) etc.`)

**Steps:**
1. In `render.js` keep `sel/hov/alpha` logic: `sel=amber-50 wash + stone-900 1.7/scale + left strip`, idle `stone-500` vs violet vs amber dash. Ensure `drawEdges` sorted long→short, halo `lw+3.6/scale white .95`, `rad max(2/scale, min(9/scale, minSeg/2.4))`, dot `3.8/scale kindColor`.
2. Lens legends per mode (via `syncModeUI`): logic shows `Machines/States/Rules` lanes + `governs(● violet)/signal(◇ amber)`; schema shows `Entities/Fields/Categories` lanes + `contains(● stone)/governs(● violet)`; decisions shows `Product/System/Architecture` lanes + `governs(● violet)` constrained targets.
3. Tooltip `nodeTipHTML` per lens: logic shows `States: … → Governs: … (targets) · Rule: transient vs temporal · NEXT: …`; schema shows `Entity: Opportunity → Fields: … · Category: gems · Flow: Operate/Monitor`; decisions shows `Decision: 001-shell-split → Governs: … · Rationale: …` (reuse `detail*` HTML but inside tooltip pill if hover, full detail below on selection).

**Verify:** Hover edge → dot color matches legend; `signal` edges dashed `7,5` scaled by `1/scale`; `data` both draws two heads.

### Task 9: Routing at density + staleness badges + gentle scaling ✓ done

**Objective:** 30+ nodes and 40+ edges per lens stay legible; text never too tiny at 0.3×; stale nodes visibly warn.

**Files:**
- Modify: `src/js/mechanics/route.js` (no fork — keep `obstacles` from every NODES+foreign GROUPS, `highway lane max(G.y+h)+22+(idx%4)*14`, `cost hit*400+bends*12+len*0.05`, `violatesCorridor` filter else keep all)
- Modify: `src/js/mechanics/text.js` (keep `p=0.38`: `fitTextSubtle(contentW= w-16,7.5,scale)` for node labels, `subtleFont(11→8)` for headers, edge labels `9.5/scale`)
- Modify: `scripts/generate-mechanics-graph.js` (add staleness: `sources` mtimes same as `atlas.json`; emit `node.stale = sources[node.source] > meta.generatedAt` as boolean)
- Modify: `src/js/mechanics/render.js` (if `n.stale` draw ⚠ badge: muted pill `amber-100` at node top-right, edges dim `.52` for stale incident)

**Steps:**
1. No new routing — tune only if overlapped: if >5 groups, highway spread `idx%5` instead of 4 to avoid U overlap. Otherwise keep `idx%4`.
2. Text scaling verified at `scale=0.3` — label still 6.2px world (≈ 20px screen) not collapsing.
3. Staleness: after `touch src/logic/funnel-machine.js && npm run verify:mechanics` → fail + badge visible; `npm run gen:mechanics` → badge cleared.
4. Call `clearRouteCache()` on every `dragGroup/dragNode/reorder/setMode` (already in engine — confirm not dropped).

**Verify:** At `scale=0.35` every node label readable (≥9px screen); at `scale=3.8` no blur; hover group washes `amber-50 .34` + shadow `soft`; stale badge appears same as `atlas-render.js:26` prior but in canvas.

---

## Phase 5 — Polish, a11y, docs, gates {#phase-5}

*Tags: Layout, Docs, Tests*

### Task 10: Responsive + a11y + viewport retire polish ✓ done

**Objective:** Mechanics chrome feels native in workspace grid; keyboard parity with atlas viewport.

**Files:**
- Modify: `src/styles/mechanics.css` / `src/arch/atlas.css` (mobile: `@640px` hide `.mechanics-hint`, reduce float control padding, collapse legend to 2 rows)
- Modify: `src/js/mechanics/canvas.js` (cap `dpr=Math.min(devicePixelRatio,2)`, clamp `scale .18..3.8`, respect `prefers-reduced-motion` for hover transitions, ensure `canvas.focusable` + `keyboard` arrow nav via `atlas-state`)
- Delete: `src/arch/atlas-viewport.js`, `src/arch/atlas-layout.js` if fully unused, `src/arch/atlas-render.js` (keep `lens-*` only)
- Modify: `docs/graph.mmd` (via `node scripts/map-graph.mjs` — mechanics modules appear, SVG nodes removed)

**Steps:**
1. Responsive: float legends wrap, chrome toggle `H` hides legends+footer+hint (`view.classList.toggle('mechanics-view--clean')` equivalent but applied to `#atlas-canvas`), `engine.resize()` on toggle.
2. Keyboard: canvas node `tabindex=0` not applicable (canvas) — instead arrow keys move `state.select(next)` cycling `graph.nodes` in current order; `Enter` focuses detail below.
3. `prefers-reduced-motion` — disable edge dash animation and group shadow transitions.
4. Run `wc -l` budget check, `npm run build`, `npm test` (gates include both `verify:atlas` + `verify:mechanics`).

**Verify:** `vision_analyze` region of `#atlas-canvas` at `:5174` per lens — crisp type, no overlap at 80% zoom; `npm test -- --grep mechanics` passes.

### Task 11: ds-track + changelog + decisions + presentation probes ✓ done

**Objective:** Ships as Architecture section content; gates self-check; stills for review.

**Files:**
- Modify: `src/ds/changelog-names.json` (add plan title ≤76ch via `npm run plan:names` flow)
- Create: `docs/decisions/mechanics-atlas.md` (record SVG→canvas, 3→4 lenses, deterministic→highway routing, token shim)
- Modify: `ARCHITECTURE.md` (add `src/js/mechanics/` to layer map + contracts)
- Modify: `index.html` left note copy (explain scheme-level connectors per lens)

**Steps:**
1. `npm run plan:names` → 0 missing; `npm run ds:track` → manifest updated (`chore(ds)` commit).
2. `node scripts/map-graph.mjs` → `docs/graph.mmd` no orphans.
3. `npm test > /tmp/out 2>&1; echo $?` → 0 (never `| tail`); `npm run build` → 0.
4. Headless capture per lens on `:5174` (4 shots: logic/components/ia/truth) + stash-A/B pixel probe for `src/arch/*` extract-only slices = 0% drift on chrome.
5. Commit code → `npm run ds:track` → `chore(ds)` manifest commit → `git restore design-system/changelog-manifest.json` per skill (avoid infinite loop).

**Verify:** 4 presentation screenshots per lens, `_stale` badge test passes, `verify:mechanics --check` fails on source touch as expected.

---

## Files likely to change (summary)

`scripts/generate-mechanics-graph.js`, `scripts/graphData.manual.json`, `src/js/mechanics/{index,graph,graphData.logic.js,graphData.schema.js,graphData.decisions.js,canvas,render,route,corridor,popover,text}.js`, `src/styles/mechanics.css`, `src/arch/{atlas.js,atlas.css,atlas-state.js,lens-logic.js,lens-schema.js,lens-decisions.js}`, `src/arch/{atlas-layout.js,atlas-render.js,atlas-viewport.js}` (retired) + delete `lens-components.js`/`lens-ia.js` (or deprecate), `index.html`, `ARCHITECTURE.md`, `design-system/tokens.css`, `package.json`, `vite.config.js`, `tests/mechanics-*.test.mjs`, `src/ds/changelog-names.json`, `docs/graph.mmd`, `docs/decisions/mechanics-atlas.md`. Never touched: `src/components/*`, `src/device/*`, `src/os/*`, `src/glass/*`, `src/patterns/*` (only schema-referenced, not visualized as presentation), `:5173`.

## Tests / validation

- `npm run gen:mechanics && npm run verify:mechanics` 0 drift; `npm test` 0 (includes both `verify:atlas` + `verify:mechanics`); `npm run plan:names` 0 missing.
- CDP probes on `:5174` per lens (canvas nodes count equals emitted NODES for active lens, edge count matches, tip stays within 280px clamp, hover/drag/pan/zoom/H/Esc/double-click header reset/mode switch per lens) — zero console errors.
- Visual: stash-A/B 0% on `src/arch/*` + `src/js/mechanics/*` chrome after extract-only slices; gentle scaling readable at 0.35× and 3.8×.
- Budget: every new file `wc -l ≤99` (or waived via decision doc for 151-line canvas engine split); no raw hex outside tokens; `docs/graph.mmd` no orphans.

## Risks, tradeoffs, open questions

- **Canvas vs SVG sharpness:** Canvas concedes text crispness at high zoom vs SVG's vectors — mitigated by `p=0.38` gentle scale + DPR cap 2 + `2.5D` res. Scheme density needs routing more than vectors.
- **4 graphs vs 1 manifest:** 4 generated graphs duplicate source scans — mitigated by sharing `GROUP_BY_FILE` and `sources` mtimes; consider making `atlas.json` the single manifest and mechanics graphs as projections if duplication becomes fatigue (defer).
- **Truth lens as canvas:** Layer truth is inherently textual — canvas nodes may be lower value than current `renderTruth()` page. Guard: truth lens keeps `renderTruth()` in `atlas.js` and hides canvas when `lens==='truth'` (same as atlas today), so canvas is 3 lenses only — open to you.
- **Token alias politics:** Adding `--stone-*` aliases to `design-system/tokens.css` pollutes DS primitive namespace — mitigated by aliasing to existing neutrals with comment `// mechanics compat`.
- **Scope creep (full code graph):** Explicitly out — scheme only (~60–90 nodes total). `docs/graph.mmd` remains code-truth outlet.

## Minimal adapt checklist for a Second Project (reuse)

- Already done — this plan is the adapt checklist. After shipping, copy `src/js/mechanics/*` + `scripts/generate-mechanics-graph.js` to next Vite app, replace `CORE` per domain, retune `GROUP_BY_FILE` + `COLS`, keep edge semantics (`signal` dashed diamond, `data` violet, `call` stone) and `p=0.38` highway.

