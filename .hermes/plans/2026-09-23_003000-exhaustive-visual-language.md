# Exhaustive Visual Language — eBay bar, paper/glass/ceremony to production

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace the minimal paper/glass/ceremony summary with an eBay-level exhaustive language — every foundation, component, and pattern spec'd to roles, proven by the live prototype and gallery, at the bar of a published system (Material/HIG/Polaris/Carbon, WCAG 2.2) — not copied from them.
**Architecture:** Keep the three registers. Expand the 61-line spec into a full reference (foundations → components → patterns → motion/ceremony), rebuild the gallery so it teaches the language before showing atoms, and make every role, radius, space, motion, and glass number have a live specimen plus a lint/contrast gate. No iOS/Android export, no framework binding, no Storybook.
**Tech Stack:** DTCG JSON → `scripts/build-tokens.mjs` → `design-system/tokens.css`; vanilla pattern CSS; Phosphor `@phosphor-icons/react` + web; `npm test` (lint:tokens + contrast + plan:names + ds-track + verify:atlas/mechanics). Build is `node scripts/ds-track.mjs && vite build`.
**Tags:** Design System, Component, Layout, Tooling

<!-- changelog: hide -->

---

## 0. Audit — what exists vs eBay bar (not a phase)

Current exhaustive parts (already built, do not rebuild):
- `gallery.html` hosts Foundations (Color 50–900 ramps, Typography Inter 12–32, Spacing 4px grid, Radius pills/rects, Shadow hairline vs depth, Motion fast/normal/spring, Iconography Phosphor 12–32) + Components (Actions, Identity, Form, Choice, Nav, Overlays, Data, Cards) + Patterns (Operate, Monitor, Reports) + Motion/Gems — but scattered and not tied to a language.
- `DESIGN.md` beta front-matter (50–900 ramps, signal swap-slot, 10 components) + `design-system/docs/visual-language.md` minimal 5 principles + 3 registers + Operate order.
- Tokens: primitive ramps + semantic light/dark + `role-*` aliases (`action/measure/score/warn/mark`), `type-*` (title 32), `glass-chrome-*` (4.5px/128%), `shadow-*`, `spacing-*`, `radius-*`, `--signal`.

What eBay bar still misses (this plan):
1. No single document that rejects a screen — principles are sentences, not specs with live specimens and do/don't beside the witness ref.
2. Foundations not tied to roles — ramps shown, but no table "this hue for this role, this role for this component, contrast pair, AA gate".
3. No exhaustive type/space/radius/elevation/motion tables with token names, computed values, and live specimens in one place.
4. Components demo'd but not spec'd to language — chip/card/bar/pill use roles in code, but gallery never says "chip is `chip--hot 2px ink` because Paper law".
5. Patterns show Operate/Monitor/Reports frames but not as "language recipe" beside ref-01–12 with the same order law and quarantine proof.
6. Glass numbers exist but never documented as chrome material with live specimen and lint exemption.
7. No language index that teaches before atoms — `language.html` is 60 lines, not an index page at published-system quality.
8. Gates cover contrast and raw-color, but not radius/space/motion/role coverage.

---

## Phase 1 — Name the exhaustive language {#phase-1}

*Tags: Design System*

*The new plan is named and the live index is scaffolded. No pixel changes yet.*

| # | Task | Done when |
|---|---|---|
| 1 | Names entry | `npm run plan:names` 0 missing |
| 2 | Language index scaffold | `language.html` expands to exhaustive index (desktop, ≤200 lines, no raw hex); `gallery.html` lede points to it |
| 3 | Spec outline | `design-system/docs/visual-language-exhaustive.md` exists with 7 sections and cites ref-01–12 + prototype |

*Shipped in pending · Tasks 1–3 · phase-1.*

### Task 1: Register this plan ✓ done
**Objective:** Changelog sees this file before any other edit.
**Files:**
- Modify: `src/ds/changelog-names.json` (or `design-system/changelog-manifest.json` names layer — check repo; crm_proj uses `src/ds/`? Actually this repo uses `design-system/` manifest + `src/ds/changelog-names.json` — add there)

Add one key. Title ≤76 chars. Purpose 2–4 words. Keep one JSON object.

```json
"2026-09-23_003000-exhaustive-visual-language.md": {
  "title": "Exhaustive visual language — eBay bar, paper/glass/ceremony",
  "purpose": "exhaustive language"
}
```

**Verify:** `npm run plan:names` → 0 missing.
**Commit:** `docs(ds): name the exhaustive visual language plan [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-1}]`
Do not push.

### Task 2: Scaffold the exhaustive language index
**Objective:** A desktop document an implementer can learn the language from — not a parts bin.
**Files:**
- Modify: `language.html` — expand from 60-line summary to exhaustive index (≤200 lines; extract to `language-exhaustive.css` if needed, keep ≤100 lines per file)
- Modify: `gallery.html` lede — keep `Language →` but now it points to the exhaustive index (one line edit)
- Do not duplicate `gallery.html` panels — this page teaches, gallery demos.

The index must contain, in order, with live specimens (no raw hex in `style=""`, only `var(--role-*)` / `var(--primitive-*)` / `var(--spacing-*)` / `var(--radius-*)`):
1. **Five principles** — each with one reject example + a live mini specimen (e.g. a card with hairline vs shadow).
2. **Registers** — Paper / Glass chrome / Ceremony / Data-mark table with witness column (ref-01–12 + prototype dock).
3. **Roles** — swatch row: `action`, `measure`, `measure-soft/strong`, `score`, `warn`, `mark` via `background: var(--role-*)` plus the ink/paper pairs and contrast note (measure 4.14 AA-large).
4. **Foundations map** — Type (`type-title` 32/–0.01, `type-card` 20, `body` 16, `meta` 14, `micro` 12), Spacing (4/8/12/16/24/32), Radius (pill/card), Shadow (hairline vs depth), Motion (fast 150/normal 250/spring 400), Glass (`chrome-blur` 4.5px/`chrome-saturate` 128%) — each with token name + computed value.
5. **Composition law** — Operate order (title+avatar → KPI hairline → hero → delta `--role-measure` → chips `chip--hot 2px ink` → cards hairline → glass dock 3 Phosphor), plus Monitor (7-state funnel + tilt) and Reports (blob vs Goals D/W/M/Q/Y) in one sentence each.
6. **Quarantine** — ceremony lives on Gems gallery tab only; this page embeds no Spline iframe.

**Verify:** `language.html` opens on 5174, shows five principles, six role swatches with computed backgrounds, type 32 specimen, space/radius/motion tokens, and the Operate order. `wc -l` checks pass.
**Commit:** `feat(ds): scaffold exhaustive language index [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-1}]`

### Task 3: Exhaustive spec outline
**Objective:** One markdown spec that can reject a screen, separate from the gallery.
**Files:**
- Create: `design-system/docs/visual-language-exhaustive.md` (≤250 lines)
- Modify: `design-system/README.md` — one link to the new spec
- Modify: `DESIGN.md` — one paragraph in Overview pointing at the exhaustive spec (do not duplicate)

The spec must contain, and only contain:
1. **Foundations** — table per foundation: token, value, role, witness, contrast pair where applicable. Cite every ref-01–12 once.
2. **Roles** — table: role → alias → hex → where used (action on button, measure on bars/delta, score on chance, warn on distance, mark on diamonds).
3. **Composition law** — Operate / Monitor / Reports recipes with the missing-step note.
4. **Voice** — Product (numeric `4/32 closed`, `last contact 2d`, `23km away`) vs Ceremony (`Rock Solid Goals`, `data in here don't lie`) quarantine rule.
5. **Supersessions** — dated nav (3-tab glass capsule) + glass-on-chrome (not cards).

**Verify:** file cites ref-01–12 each once, links resolve, no token values change, `git diff --stat` shows only markdown + one README line + one DESIGN.md paragraph.
**Commit:** `docs(ds): outline exhaustive visual language spec [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-1}]`

---

## Phase 2 — Foundations to roles, live and gated {#phase-2}

*Tags: Design System, Tooling*

*Color, type, space, radius, shadow, motion, glass each have a token, a specimen, and a gate. Pixel-identical aliases only — no restyle.*

| # | Task | Done when |
|---|---|---|
| 4 | Foundation token audit | `design-system/tokens.css` exposes `role/type/space/radius/shadow/motion/glass` with `var()` aliases; `npm run build` green |
| 5 | Live specimens in index | `language.html` foundations map renders computed values via `getComputedStyle` specimens |
| 6 | Lint foundation drift | `scripts/lint-tokens.mjs` fails on raw hex/rgba in foundations + adds space/radius/motion checks |

### Task 4: Foundation token audit — no new hex
**Objective:** Every foundation value has a public token; roles alias, never new hex.
**Files:**
- Read first: `tokens/primitives.json`, `tokens/semantic-light.json`, `tokens/semantic-dark.json`, `scripts/build-tokens.mjs`, `design-system/tokens.css`
- Modify: `tokens/primitives.json` only if a foundation (spacing, radius, shadow, motion) lacks a token — add with the value already in use (copy from gallery/demo CSS, do not invent)
- Modify: `scripts/build-tokens.mjs` only if `g('space')`/`g('radius')`/`g('motion')` not emitted

Keys already exist: `--role-*`, `--type-*`, `--glass-chrome-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--motion-*`. Add only what is missing; do not retune.

**Verify:** `npm run build` → `design-system/tokens.css` contains `--role-action`, `--role-measure`, `--type-title`, `--spacing-4`, `--radius-lg`, `--shadow-sm`, `--motion-duration-sm`, `--glass-chrome-blur`. Computed colors unchanged.
**Commit:** `feat(ds): audit foundations to roles — no new hex [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-2}]`

### Task 5: Live specimens in the index
**Objective:** The index doesn't state a value — it shows it.
**Files:**
- Modify: `language.html` foundations map — each row shows token name, computed value (via `var()` swatch or text), and where it is used (e.g. `type-title` → `.opps__title 32`, `spacing-4` → card padding 16, `radius-lg` → card 16, `shadow-sm` → map pill only).

Use `background: var(--role-measure)`, `font-size: var(--type-title)`, `padding: var(--spacing-4)`, `border-radius: var(--radius-lg)` inline only where the value is a `var()`. No raw hex.

**Verify:** open on 5174, each specimen's computed style matches its token; `npm run lint:tokens` green.
**Commit:** `feat(ds): live foundation specimens in language index [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-2}]`

### Task 6: Lint foundation drift
**Objective:** The next screen cannot invent a space, radius, or motion.
**Files:**
- Modify: `scripts/lint-tokens.mjs` — extend scope to `src/styles/**/*.css`, `src/components/**/*.css`, `src/patterns/**/*.css` for `#[0-9a-fA-F]{3,8}` and `rgba(/hsla(` (existing) plus `(?<!var\()--(spacing|radius|motion)` misuse? Simpler: keep existing paint check and add a second check that fails when `src/patterns` or `src/components` CSS contains a raw `px` spacing or `border-radius: 9999px` that should be `var(--radius-full)` — exempt via `lint-allow` comment plus the same device-geometry exemptions (`src/device/`, `src/os/`, `src/glass/`).

Do not fail on the existing 281 raw `px` in device geometry — those are exempt. This task adds the check, it does not fix every px.

**Verify:** temporary `border-radius: 12px` in `src/patterns` fails lint; revert probe before commit.
**Commit:** `feat(tooling): lint foundation drift — space/radius/motion [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-2}]`

---

## Phase 3 — Components spec'd to the language {#phase-3}

*Tags: Component*

*Every component has a language spec and a live specimen that proves it. One icon system.*

| # | Task | Done when |
|---|---|---|
| 7 | Component language table | `design-system/docs/visual-language-exhaustive.md` adds component section: chip/card/bar/pill/avatar × role + token + state + a11y |
| 8 | Gallery components teach the language | `gallery.html` Components tabs each get a one-line language caption (role + token + reject example) |
| 9 | One icon system, enforced | gallery identity/nav uses Phosphor only; sprite marked deprecated; new lint warns on `sprite.svg` in gallery |

### Task 7: Component language table
**Objective:** A builder can implement a chip or card without picking a color.
**Files:**
- Modify: `design-system/docs/visual-language-exhaustive.md` — add **Components** section after Foundations.

Table columns: Component | Role | Token | States | A11y | Reject example

Rows (minimum):
- `chip` / `chip--hot` — inactive `var(--bg-surface)` hairline, hot `2px solid var(--border-accent)` ink, 44px target, Phosphor optional, reject hot as 1px.
- `button-primary` — `var(--role-action)` (`#1666af`) on white, 5.91 AA, reject sapphire-400 soft as button.
- `opp-card` / `funnel-card` — hairline + white on `#fafafa`, no shadow, title `var(--type-card)` 20 bold, reject shadow-sm on card.
- `goal-bar` / `goal-bar--gem` — `var(--role-measure)` fill, white text 4.14 AA-large, gem variant 700 ink, reject ceremony hue leaks.
- `kpi` + `activity-strip` — KPI hairline, delta `var(--role-measure)`, bars `var(--role-measure-soft/strong)`, diamonds `var(--role-mark)`, reject sapphire bars.
- `avatar` / `status-pill` / `badge` — neutral/avatar stack, pills solid fill.

**Verify:** table renders, every role in the table appears in `design-system/tokens.css`, no raw hex.
**Commit:** `docs(ds): component language table — roles to specimens [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-3}]`

### Task 8: Gallery components teach
**Objective:** Atoms demo the language, not just the look.
**Files:**
- Modify: `gallery.html` — in each Components frame (`actions`, `identity`, `cards`, `data`), add a `<p class="meta">` caption with the language line: e.g. "Chip — filter, `var(--role-action)` never decorative hue. Hot is `2px ink`, not 1px." Keep each addition to one line; do not rebuild panels.

**Verify:** each Components tab shows the caption; `npm run lint:tokens` green; `wc -l gallery.html` grows but stays under budget via no new panels.
**Commit:** `feat(ds): gallery components teach the language [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-3}]`

### Task 9: One icon system, enforced
**Objective:** Phosphor is the product system; sprite is legacy.
**Files:**
- Modify: `gallery.html` identity panel — already Phosphor after prior plan; verify no `<use href="src/components/Icon/sprite.svg` remains in identity/nav panels (search and replace with `<i class="ph">` / `ph-fill`).
- Modify: `prototype/gallery/identity.md` (or `design-system/docs/phase-3-components.md` if present) — sprite is deprecated: "new work uses Phosphor regular → fill, `var(--signal)` on fill".
- Modify: `scripts/lint-tokens.mjs` — add a soft warn (not fail) when `gallery.html` reintroduces `sprite.svg#`.

Do not delete `src/components/Icon/sprite.svg` — other gallery panels may still reference it.

**Verify:** `grep -n "sprite.svg" gallery.html` shows only overlays/data panels that intentionally keep it (count drops vs before), identity panel is 0 for sprite.
**Commit:** `fix(ds): gallery is Phosphor — sprite deprecated [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-3}]`

---

## Phase 4 — Patterns as language recipes {#phase-4}

*Tags: Layout, Component*

*Operate, Monitor, Reports are recipes that compose the language — with the prototype as witness beside ref-01–12.*

| # | Task | Done when |
|---|---|---|
| 10 | Pattern recipes in spec | `visual-language-exhaustive.md` adds Pattern section with Operate/Monitor/Reports recipes + empty-state law |
| 11 | Gallery patterns prove the recipes | `gallery.html` Patterns frames add witness captions linking to `ref-01`/`ref-06` and showing token composition |
| 12 | Opps is the proof screen, pinned | `src/patterns/OppsHome/opps-home.css` + `opps-home.js` comments cite the recipe; no visual drift |

### Task 10: Pattern recipes in spec
**Objective:** A missing step is a bug, not a choice.
**Files:**
- Modify: `design-system/docs/visual-language-exhaustive.md` — add **Patterns** section.

Recipes:
- **Operate:** title (`--type-title` 32) + avatar → KPI (`hairline`, no shadow, `4/32 closed`) → hero (map/funnel glyph) → delta (`var(--role-measure)`) → chips (`chip--hot 2px ink`) → cards (hairline, no shadow) → glass dock (3 Phosphor, capsule, signal on selected). Empty tabs use the one `empty-state` component, not omission.
- **Monitor:** funnel 7-state (`initial/elastic/top/middle/bottom/closed/retained`) + tilt 12° on card, metrics, timeline chips, respects `prefers-reduced-motion`.
- **Reports:** blob (Activities, transient) vs Goals (temporal) across D/W/M/Q/Y, `MonitorScreen`/`ReportsMatrix` composition, gem capsules quarantine.

Each recipe lists: order, tokens/roles per step, witness (ref-01 for Operate order, ref-02/03/09 for measurement depth, ref-06 for Reports matrix).

**Verify:** section cites ref-01–12, mentions the prototype file path, and states the empty-state law.
**Commit:** `docs(ds): pattern recipes — Operate/Monitor/Reports [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-4}]`

### Task 11: Gallery patterns prove the recipes
**Objective:** The gallery frames are not mockups — they are language specimens beside the witness.
**Files:**
- Modify: `gallery.html` Patterns frames (`operate`, `monitor`, `reports`) — add a witness caption per frame: e.g. "Operate order matches ref-01 — title 32, KPI hairline, ActivityStrip diamonds `var(--role-mark)`. Map pill keeps `--shadow-md`." Link ref filenames in the caption text (not thumbnail) and keep to one line per frame.

**Verify:** each pattern frame shows the caption; no Spline iframe added inside Operate.
**Commit:** `feat(ds): gallery patterns prove recipes — witness captions [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-4}]`

### Task 12: Opps is the proof screen, pinned
**Objective:** The prototype Opps screen is the only designed screen — pin it to the recipe so drifts fail fast.
**Files:**
- Modify: `src/patterns/OppsHome/opps-home.js` — top comment cites `design-system/docs/visual-language-exhaustive.md#operate` and lists the 7 steps in order.
- Modify: `src/patterns/OppsHome/opps-home.css` — header comment maps each rule to its token/role (`--type-title`, `--role-measure`, `chip--hot`).

No visual change. If the header comment pushes the file over 100 lines, extract to a sibling `README.md` beside `opps-home.css`.

**Verify:** `wc -l` within budget, `npm test` green, computed title still 32px, KPI `box-shadow` none, map pill still md.
**Commit:** `docs(ds): pin Opps proof screen to language recipe [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-4}]`

---

## Phase 5 — Motion, elevation, ceremony quarantine {#phase-5}

*Tags: Design System, Motion*

*Motion explains state, ceremony boasts in one place, glass stays chrome. All tokenized, all gated.*

| # | Task | Done when |
|---|---|---|
| 13 | Motion tokens live | `language.html` + spec show `fast 150 / normal 250 / spring 400 / elastic` with `prefers-reduced-motion` proof |
| 14 | Elevation law live | `language.html` shows hairline vs depth specimens; KPI is hairline, map pill is floating — both computed-checked |
| 15 | Ceremony quarantine proven | Gems gallery tab is the only Spline/iridescence/orb surface; Operate is glass-free — grep gate proves it |

### Task 13: Motion tokens live
**Objective:** Motion is a role, not a vibe.
**Files:**
- Modify: `design-system/docs/visual-language-exhaustive.md` — add **Motion** section: duration tokens, easing (`standard` cubic-bezier, `spring` 0.25,1,0.5,1), elastic funnel scroll (12px overshoot), tilt 12° (600px perspective), reduced-motion instant fallback.
- Modify: `language.html` motion row — buttons demo `var(--transition-fast/normal/spring)` live; caption states the reduced-motion rule.

**Verify:** `grep -n "transition" src/motion/*.css` uses `var(--transition-*)` only; `prefers-reduced-motion` media present in motion CSS.
**Commit:** `feat(ds): motion law — tokens live with reduced-motion [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-5}]`

### Task 14: Elevation law live
**Objective:** Hairline carries UI; shadow is for depth viz and floating controls.
**Files:**
- Modify: `language.html` elevation row — two specimens side-by-side: in-flow card (hairline, `box-shadow: none`) vs floating map control (hairline + `var(--shadow-md)` + glass `backdrop-filter`).
- Modify: `design-system/docs/visual-language-exhaustive.md` — Elevation table: in-flow → hairline, floating → `shadow-md/lg`, depth viz → funnel/gem tilt + blur.

**Verify:** computed `box-shadow` of in-flow card is `none`, floating pill is `md`; `npm run lint:tokens` green.
**Commit:** `feat(ds): elevation law — hairline vs depth live [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-5}]`

### Task 15: Ceremony quarantine proven
**Objective:** Orbs, iridescence, Spline gems, ceremony copy never leak into the feed.
**Files:**
- Modify: `design-system/docs/visual-language-exhaustive.md` — Quarantine table: surface allowed vs forbidden per register.
- Modify: `scripts/lint-tokens.mjs` or new `scripts/lint-ceremony.mjs` — grep gate: fail if `src/patterns/OppsHome`, `src/patterns/EmptyState`, or `src/patterns/ActivityStrip` CSS/JS contains `spline`, `hue-rotate`, `orb`, `iridescen`, or ceremony strings (`Rock Solid`, `data in here don't lie`).

Keep the gate scoped — `src/components/GemReward` and `gallery.html` Gems panel are exempt.

**Verify:** temporary ceremony string in `opps-home.js` fails lint; revert probe before commit.
**Commit:** `feat(tooling): quarantine ceremony — lint gate [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-5}]`

---

## Phase 6 — Teaching gallery and the gates that keep it true {#phase-6}

*Tags: Tooling, Layout*

*The language teaches before the atoms, and CI fails the next fork.*

| # | Task | Done when |
|---|---|---|
| 16 | Gallery teaches before atoms | `gallery.html` now opens on Language tab or shows a top language banner; DS index lists Language first |
| 17 | Contrast + role coverage gate | `tests/contrast.test.mjs` covers every role pair people read; new `tests/visual-language.test.mjs` asserts specimens exist |
| 18 | DESIGN.md is exhaustive and lint-clean | `npx -y @google/design.md lint DESIGN.md` 0 errors, registers named, no orphan tokens, no raw ramp picking |

### Task 16: Gallery teaches before atoms
**Objective:** Someone opening the DS sees the language before the atoms.
**Files:**
- Modify: `gallery.html` — either (a) default active tab is `language` via a new `language` frame that embeds the index summary + CTA to `language.html`, or (b) a persistent top banner "Start with Language →" that survives tab switches. Pick (a) if the tab bar can host a Language entry without packing lines; otherwise (b). Keep ≤100 lines per file.
- Modify: `DESIGN.md` — front-matter stays valid; ensure `colors`/`typography`/`rounded`/`spacing`/`components` reference the exhaustive spec in their descriptions.

**Verify:** `gallery.html` opens and Language is the first thing read; `wc -l` within budget.
**Commit:** `feat(ds): gallery teaches language before atoms [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-6}]`

### Task 17: Contrast + role coverage gate
**Objective:** The pairs a person reads are gated, plus the specimens exist.
**Files:**
- Modify: `tests/contrast.test.mjs` — already covers ink/paper, white on `role-action` (5.91), `role-measure` 4.14 large, `role-score` on white 4.51. Add missing: ink on `role-warn` warning chip, white on `role-measure-strong` strong bar, and `role-mark` diamond usage note. Do not change hex to pass — assert the exempt as large/bold only.
- Create: `tests/visual-language.test.mjs` — assert against source (node, not browser): `language.html` exists and contains `role-action|measure|score|warn|mark`, `design-system/docs/visual-language-exhaustive.md` exists and cites ref-01–12, gallery captions exist, `opps-home.js` cites the recipe, no pattern CSS sets `outline: none` without `:focus-visible`.

**Verify:** `node tests/visual-language.test.mjs` and `npm test` green.
**Commit:** `test(ds): gate exhaustive language — contrast + specimens [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-6}]`

### Task 18: DESIGN.md is exhaustive and lint-clean
**Objective:** Machine-readable spec agrees with the exhaustive doc.
**Files:**
- Modify: `DESIGN.md` body (Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts) — Colors paragraph already names roles; expand Do's and Don'ts to mirror the exhaustive quarantine (glass on chrome yes, glass on cards no, ceremony copy in feed no, 24px is not a title). Add `role-measure`/`role-warn`/`role-mark` components if needed to satisfy orphan-token lint, referencing `{colors.amethyst-400}` etc. Do not add unused ramps.

**Verify:** `npx -y @google/design.md lint DESIGN.md` → 0 errors. `npm test` green. `npm run ds:track` tagged 8/8, wip 0 (except new plan before first commit is 1 wip, expected).
**Commit:** `docs(ds): DESIGN.md exhaustive — registers + quarantine lint-clean [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-6}]`

---

## Phase 7 — Builder-complete: specs, feedback, audit loop {#phase-7}

*Tags: Design System, Component*

*Recursive builder pass over Phases 1–6 output: token-first sweep, full component specs to template, pattern library per Pattern Layer, live audit checklist. Additive only — extends, never rewrites.*

| # | Task | Done when |
|---|---|---|
| 19 | Opacity + token-first sweep | `opacity` tokens exist; no hardcoded value left in components/patterns outside exempt geometry |
| 20 | Full component specs to template | every `src/components/*` has Purpose/Anatomy/Variants/States/Token Usage/Dos/A11y; feedback states documented |
| 21 | Pattern library per Pattern Layer | each pattern lists combines + layout rules + when-vs-alternative; page intake works |
| 22 | Audit checklist + coverage tracker | `design-system/docs/audit-checklist.md` flags Compliant/Deviation/Gap; Growing checklist all checked |

### Task 19: Opacity + token-first sweep
**Objective:** Close the last foundation gap. Reverse-engineer every crude/hardcoded value into a token before any spec references it.
**Files:**
- Read first: `tokens/primitives.json`, `tokens/semantic-light.json`, `tokens/semantic-dark.json`, `design-system/tokens.css`
- Modify: `tokens/primitives.json` — add `opacity` scale only (`disabled`, `overlay`, `subtle`) with values already in use (copy from component CSS, do not invent)
- Modify: `scripts/build-tokens.mjs` — emit `opacity.*` as `--opacity-*` if not already emitted
- Modify: `design-system/docs/visual-language-exhaustive.md` — Foundations table gains Opacity row (token, value, where used)

Do not retune any existing ramp. Pixel-identical aliases only.
**Verify:** `npm run build` → `design-system/tokens.css` contains `--opacity-disabled/overlay/subtle`; `grep -rn "opacity: 0\." src/components src/patterns` shows only `var(--opacity-*)` outside exempt `src/device|src/os|src/glass`.
**Commit:** `feat(ds): opacity tokens — token-first sweep complete [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-7}]`

### Task 20: Full component specs to template
**Objective:** Task 7 covered 6 rows. Every remaining component gets the skill's Component Spec Template — nothing hardcoded.
**Files:**
- Modify: `design-system/docs/visual-language-exhaustive.md` — extend Components section to all `src/components/*` (Button, Chip, Badge, StatusPill, Avatar, Icon, TextInput, Select, Search, Textarea, Checkbox, Radio, Switch, Slider, Tabs, Breadcrumbs, Pagination, Accordion, TabBar, Overlay, Table, ListRow, KpiStat, Timeline, OpportunityCard, FunnelCard, ProfileCard, GoalBar, FunnelGlyph, Sparkline, Toolbar, GemReward)
- Per component, all seven fields: Purpose (1 sentence) | Anatomy (token-only parts) | Variants table | States (Default/Hover/Active/Focus/Disabled/Loading/Error where applicable) | Token Usage table (token names, never raw values) | Dos and Don'ts (2–4, sharp) | Accessibility (44px target, contrast pair, ARIA role)
- Feedback states documented once, referenced per component: Loading (skeleton/shimmer quarantined to ceremony-safe surfaces), Error (`role-score` + label, never color-alone), Disabled (`opacity-disabled` + `aria-disabled`), Toast/modal via Overlay (focus trap, `role=dialog/alertdialog`)

If the section pushes the spec over budget, split per-component contracts into `prototype/gallery/*.md` (existing contracts) and keep the exhaustive spec as the index table linking to them.
**Verify:** every component dir name appears in the spec; every Token Usage cell is a `var(--*)`/`token.*` name (no `#hex`); `npm run lint:tokens` green.
**Commit:** `docs(ds): full component specs to template + feedback states [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-7}]`

### Task 21: Pattern library per Pattern Layer
**Objective:** Patterns are compositions, not screens. Each documents the three skill fields.
**Files:**
- Modify: `design-system/docs/visual-language-exhaustive.md` — extend Patterns section (after Task 10 recipes) with per-pattern blocks for OperateScreen, MonitorScreen, ReportsMatrix, ActivityStrip+EmptyState composition
- Per pattern: which components combine (names) | layout rules (spacing tokens between steps, alignment) | when to use vs alternative (e.g. Operate vs Monitor for funnel depth; ReportsMatrix vs MonitorScreen for transient blob vs temporal Goals D/W/M/Q/Y)
- Modify: `prototype/gallery/patterns.md` — same three fields, one paragraph each, linking to exhaustive spec

Page intake: state the intake line — *"here's a rough X sample, add it to the system" → Intake (Token→Component→Pattern→Page layer ID) → reverse-engineer tokens → spec → flag deviations* — so future screens enter through this loop.
**Verify:** each pattern block has all three fields; page intake line present; no new components created in this task.
**Commit:** `docs(ds): pattern library per Pattern Layer + page intake [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-7}]`

### Task 22: Audit checklist + coverage tracker
**Objective:** The adherence enforcement loop, as a shippable artifact. Drop in any product screen and get Compliant / Deviation / Gap.
**Files:**
- Create: `design-system/docs/audit-checklist.md` (≤100 lines) — per element checklist: element → system reference (token/component/pattern) → flag Compliant/Deviation/Gap → for deviations the correct token/component → for gaps the proposed spec template pointer. Include the 5-step Working-With-Samples flow (extract implicit decisions → nearest token → propose token → document spec → flag violations).
- Modify: `design-system/docs/visual-language-exhaustive.md` — append Growing coverage checklist, all checked by this phase: Token foundations complete / Core components specced / Feedback states documented / Pattern library started / Audit checklist exists
- Modify: `tests/visual-language.test.mjs` (from Task 17) — assert `audit-checklist.md` exists and contains `Compliant / Deviation / Gap`, and every component in `src/components/*` has a spec heading

Output conventions enforced: tokens by name, tables for variants/mappings, direct language. Every session states added/changed/missing.
**Verify:** `node tests/visual-language.test.mjs` green; `npm test` green; checklist renders with all five coverage items checked.
**Commit:** `test(ds): audit checklist + coverage tracker — builder-complete [plan:2026-09-23_003000-exhaustive-visual-language.md#{#phase-7}]`

---

## Risks
- **Scope vs 100-line cap:** gallery + language are already line-tight. Every edit in this plan extracts via tokens/CSS, not packing lines onto one line — packing is a violation.
- **Title 32 is locked:** it is the only intentional visual change from the minimal plan; do not return to reserved 24 without a dated supersession.
- **Glass blur confusion:** `--glass-blur` (12px) is not the dock's `4.5px` chrome blur — Task 4 audits, not retunes. Copy literals via `optics.js` if in doubt.
- **Shared tree:** other sessions edit this repo. `git status` before each commit. Do not stage files this plan did not name. `git checkout -- design-system/changelog-manifest.json` on timestamp-only churn.

## Open questions (do not block the plan)
- Whether to add a dark product theme is out of scope — roles exist in `semantic-dark.json`, but no dark frame in this plan.
- Funnel full Reports screen remains product work later — compose from `MonitorScreen`/`ReportsMatrix` + these roles.
- Gem FAB (`aria-label="Gem search"`) stays undecided — leave it.

