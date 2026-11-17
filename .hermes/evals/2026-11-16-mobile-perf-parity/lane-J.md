# Lane J — regenerate every generated artifact, prove freshness with the repo's own gates

**Date:** 2026-11-17 · **Repo:** `/Users/irfan/Documents/Portfolio Redo/crm_proj` · **Base:** `b97b1de` + ~11 lanes' uncommitted work
**Write scope:** generated artifacts only — `docs/graph.mmd`, `src/js/mechanics/graphData*.js`, `src/arch/atlas.json`, `design-system/changelog-manifest.json`, `design-system/plan-history.json`. No hand-edits, no commit.
**Port:** 5244 reserved; no dev server was needed (no build, no browser) — this lane only runs generators and gates.

Baseline captured first (copies in `$TMPDIR/laneJ/before/`, sha256 in `…/before.sha`), so "changed" below means *changed by the generators*, not "already dirty from another lane".

---

## 1. Generator inventory (read from `package.json` + `scripts/`, not guessed)

| Artifact | Generator | Exact command | npm alias | Automatic hook |
|---|---|---|---|---|
| `docs/graph.mmd` | `scripts/map-graph.mjs` | `node scripts/map-graph.mjs` | **none** | **none** — no npm script, no hook, nothing in `npm run build` |
| `src/js/mechanics/graphData.js`, `.logic.js`, `.schema.js`, `.decisions.js` (4 files, one `outputs[]`) | `scripts/generate-mechanics-graph.js` | `node scripts/generate-mechanics-graph.js` | `gen:mechanics` (write) / `verify:mechanics` (`--check`) | vite plugin `mechanicsGraphPlugin` → `buildStart()` (dev **and** build) + watcher `change/add/unlink` on `src/**` (debounced 150 ms) |
| `src/arch/atlas.json` | `scripts/generate-arch-atlas.mjs` | `node scripts/generate-arch-atlas.mjs` | `gen:atlas` / `verify:atlas` (`--check`) | none at build time; `npm test` verifies |
| `design-system/changelog-manifest.json` + `design-system/plan-history.json` | `scripts/ds-track.mjs` | `node scripts/ds-track.mjs` | `ds:track` | **yes, three hooks:** `.githooks/pre-commit` and `.githooks/post-commit` (`core.hooksPath=.githooks`), plus `npm run predev`, `npm run build`, `npm test` |
| `design-system/plan-history.json` (history backfill only) | `scripts/plan-backfill.mjs` | `node scripts/plan-backfill.mjs` | `plan:backfill` | none |
| `design-system/tokens.css` | `scripts/build-tokens.mjs` | `node scripts/build-tokens.mjs` | part 1 of `build` | `npm run build` | 

`package.json` has **no `prebuild`** script; the auto-generated hooks are `predev` (ds-track) and the two git hooks (ds-track). `npm run build` = `build-tokens && ds-track && vite build`, and the mechanics graph fires from the vite `buildStart` of that last step — so `graphData*` and the changelog pair are self-healing, while **`docs/graph.mmd` has no automation at all** (which is exactly why it sat unchanged since Oct 3).

Two producers are *not* run here, deliberately: `build-tokens.mjs` (writes `design-system/tokens.css`, outside my scope — and it is not stale: newest token source `tokens/primitives.json` is 2026-10-04 18:52, `tokens.css` mtime 2026-11-17 03:43, so output is newer than every input) and `plan-backfill.mjs` (commit-history backfill, not a freshness producer).

---

## 2. What I ran, in dependency order

```
node scripts/map-graph.mjs                     → ✓ 266 modules · 222 edges · 0 cycles · orphans: 28 (see §6)
npm run gen:atlas                              → ✓ gen:atlas — 46 nodes · 16 edges
npm run gen:mechanics                          → ✓ gen:mechanics — 15/19/13 nodes · 4 groups each
npm run ds:track                               → ✓ ds-track — 22 plans · 520 DS commits (520 linked) · 37 wip · 338 revs · 22/22 tagged
npm run ds:track   (again, idempotency probe)  → byte-identical manifest (sha256 unchanged)
```

All exit 0. `map-graph` runs first because nothing consumes it (no verifier, no importer); atlas and mechanics are independent of it; `ds-track` last because its `wip` list is a snapshot of `git status` — it must see the other artifacts already written.

`ds-track` also appends a **revision entry** to `plan-history.json` whenever a `.hermes/plans/*.md` file's content hash is new, so it is a moving target while plan docs are being written: the parity plan was edited at 11:59:19 and 11:59:30 by another process (not me — my only write is this report), and each `ds:track`/`npm test` after that appended one entry (338 → 341 revs). A final `ds:track` was re-run immediately afterwards and was byte-identical, so 341 is the current state. Do not read a plan-history diff as graph drift.

Note the mechanics generator was **not** raced: no other lane was building during this run (it re-reads the four `graphData*.js` and `ARCHITECTURE.md`/`DESIGN.md` mtimes).

---

## 3. File-level diff summary (vs `b97b1de` + baseline)

| File | numstat | What actually changed |
|---|---|---|
| `docs/graph.mmd` | `+102 −9` · 12 203 → 17 303 B | Real content: 96 → 125 node lines, 158 → 222 edge lines. New nodes from lanes' modules (`glass/FabGem.jsx`, `OppsHome/{live-map-breath,live-map-config,pill-ghost,sheet-geometry,sheet-html}.js`, the `GemReward/gem-{appearance,facets,optics,rig,*-ext}.js` split). `components_Icon_gem-icons` node **and** its edge removed. |
| `src/arch/atlas.json` | `17 −17` | **Meta only.** `generatedAt` plus 4 directory mtimes that moved when lanes added/removed files: `src/components/{GemReward,Icon,Overlay}`, `src/patterns/OppsHome`. `nodes`+`edges` are byte-identical to the baseline (46/16) — the atlas data was already structurally right; only its mtime stamps were lying. |
| `src/js/mechanics/graphData.js` / `.logic.js` | `1 −1` each | `META.generatedAt` only. `sources` map unchanged, GROUPS/NODES/EDGES/KINDS byte-identical → the buildStart run that a lane executed at 11:46 had already refreshed content. |
| `src/js/mechanics/graphData.schema.js` / `.decisions.js` | `1 −1` each | Same: `generatedAt` only. |
| `design-system/changelog-manifest.json` | `+46 −31` | `generated` + `wip` 31 → 37 entries: lanes' staged/unstaged work now visible (`A src/shell/icons.jsx`, `D src/components/Icon/gem-icons.js`, the Overlay/glass/component CSS batch). `plans` (22) and `commits` (520) unchanged. |
| `design-system/plan-history.json` | `+148` | **Revision log, not a source mirror.** Four new entries for `.hermes/plans/2026-11-16_225300-mobile-perf-parity.md` (`93a8a70f` → `150a362f`… → `79cd75b4` → `bdecd29d` → 341st rev); nothing else in the file moved. My first `ds:track` run produced **zero** change (sha256 identical), but the plan doc itself kept being edited by another process at 11:59:19, 11:59:30 and 12:00:21 while I worked, so each later `ds:track` (including the one inside `npm test`) appended one revision — 338 → 341 revs. Final state: 341 revs, sha256 `bf4bd68a…`, and a re-run immediately afterwards was byte-identical. |

`graphData.js` and `graphData.logic.js` have identical sha256 by design (`outputs[]` renders the logic graph into both — legacy alias).

---

## 4. Freshness proof (the repo's own verifiers)

```
$ node scripts/generate-arch-atlas.mjs --check
✓ verify:atlas — manifest fresh                                    exit 0
$ node scripts/generate-mechanics-graph.js --check
✓ verify:mechanics — graph fresh                                   exit 0
$ node scripts/lint-tokens.mjs
✓ lint:tokens — 0 raw leaks, 0 over-limit (1756 files scanned)      exit 0
$ node scripts/plan-names.mjs
✓ plan:names — 22 phased plans named                               exit 0
$ npm test
… 197 assertions, 0 failures … ✓ verify:atlas — manifest fresh / ✓ verify:mechanics — graph fresh   exit 0
```

`lint:tokens` scanned **1756** files on the first run and **1758** on the final one (two files were added to the index by other lanes between runs — the gate enumerates `git ls-files`). Either way it is not zero, so the hardened zero-file guard (exit 2) is not masking a blind pass.

Final sweep after everything above (run again immediately before this report, all exit 0):

```
$ node scripts/generate-arch-atlas.mjs --check   ✓ verify:atlas — manifest fresh
$ node scripts/generate-mechanics-graph.js --check  ✓ verify:mechanics — graph fresh
$ node scripts/lint-tokens.mjs                    ✓ 0 raw leaks, 0 over-limit (1758 files scanned)
$ node scripts/plan-names.mjs                     ✓ 22 phased plans named
```

**mtime caveat, stated honestly:** both stat-based verifiers do not hash inputs, they compare *stored mtimes* against `statSync().mtimeMs` of every recorded source. They therefore go stale the instant anyone touches a listed input — including a directory: `atlas.json` records `src/components/<Name>` and `src/patterns/OppsHome` **directory** mtimes, so merely adding or deleting one file in any of those dirs invalidates the atlas without changing a byte of its data. `graphData*` likewise records `ARCHITECTURE.md` and `DESIGN.md` mtimes, so a docs edit invalidates the mechanics graph. Their freshness is a snapshot of the moment I ran them, verified twice minutes apart (last check ran immediately before this report was written), and any later source edit is *supposed* to turn them red — that is the gate working, not drift.

---

## 5. Dead edge (`gem-icons`) — gone, and not by hand

- `grep -n gem-icons docs/graph.mmd` → **no match** (0 occurrences) after `node scripts/map-graph.mjs`. Both the node line (`components_Icon_gem-icons[gem-icons.js]`) and the edge (`components_Icon_Icon --> components_Icon_gem-icons`) are gone. `Icon.jsx → components_Icon_Icon` still has its remaining edges (`GemFriendly`, `GemLite`, `BottomDock`, `dock-track`).
- Also 0 occurrences of `gem-icons` in `atlas.json` and in all four `graphData*.js`.
- **Real cause of the stale edge:** nothing was hard-coded. `map-graph.mjs` derives its file list by walking `src/` and its edges by scanning each file for `from '…'` / `import '…'` specifiers; it hard-fails (`exit 1`) on a specifier that resolves to nothing. The stale `.mmd` was simply **never regenerated** after `Icon.jsx` was repointed at `src/shell/icons.jsx` — the generator had no invocation path (no npm script, no hook), so removal of the source file could not reach the artifact. Regeneration is the fix; no hand-patch of the `.mmd` was needed or performed.
- `changelog-manifest.json` does contain the string `gem-icons` exactly once, and that is correct: it is the `wip` entry `D  src/components/Icon/gem-icons.js` — a truthful `git status` line, not an architecture edge.

---

## 6. Deliberately left stale (and why)

1. **`docs/graph.mmd` under-reports nodes — pre-existing generator defect.** The run prints `266 modules` but the file declares **125** node lines (while emitting all 222 edges). Cause: `layerOf()` returns `'root'` for anything outside the 8 `LAYERS` prefixes, but the emitter only loops `for (const [n] of LAYERS)` writing subgraphs — there is **no `root` subgraph**, so 141 modules are never declared: `src/ds/` 73, `src/pitch/` 49, `src/js/` 14, `src/arch/` 3, `src/shell/` 2. Edges to them dangle (Mermaid synthesises the boxes, so it still renders). This is not new: `b97b1de:docs/graph.mmd` has 96 nodes for the same reason. The fix is one line in `scripts/map-graph.mjs` (append a `root` subgraph) — **hand-written script, outside my write scope**, so I left it and am reporting it.
2. **`graphData*` node `rule-morph` points at a file that does not exist.** `scripts/generate-mechanics-graph.js` CORE says `file:"src/logic/morph-timing.js"`; the real module is `src/patterns/OppsHome/morph-timing.js` (and it is in `graph.mmd` under `patterns`). Because the stale rule computes `(meta.sources[file]||0) > threshold`, a missing file records `0` and the node is stamped `stale:false` — the wrong path is invisible to `verify:mechanics` (drift check strips `stale`). Pre-existing CORE-table bug in a hand-written script; out of scope to edit.
3. **`DESIGN_SYSTEM.md:10` still says** `Icon` is Phosphor `@phosphor-icons/react` regular via `Icon.jsx`. The dependency is gone from `package.json` and `Icon.jsx` imports `src/shell/icons.jsx`. Hand-written doc — outside my write scope; flagged for whoever owns prose.
4. **`design-system/tokens.css`** was not regenerated: its inputs (`tokens/*.json`) are untouched and older than the output, so it is fresh; running `build-tokens` would only rewrite a file I do not own.
5. **Orphans (28)** reported by `map-graph` are the 26 `IllusionCube/illusion-*.js` modules, `src/js/mechanics/graphData.js` and `src/logic/funnel-machine.js` — genuine "no inbound edge" modules, not a defect of this run. Unchanged in kind from `HEAD`.

Nothing in §6 was "fixed" by editing an artifact by hand; every artifact above was produced by its generator.
