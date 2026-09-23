# Design System — ground-up build, tokens to pages

> **For Hermes (any session):** this file is self-contained. The builder skill is
> embedded below (§Builder skill). Build order is strict ground-up: Language →
> Tokens → Foundations → Components → Patterns → Pages → Gates. Never spec a
> component on an untokenized value; never compose a pattern from unspecced
> components. Work task-by-task, in order. Do not skip Task 1.
> Trigger phrases that invoke the embedded skill mid-plan: *"add this to the system"*,
> *"how should this component work"*, *"token for X"*, *"is this consistent"*,
> *"here's a rough X sample, add it to the system"*.

**Goal:** Build the ALPHA CRM design system from the ground up to industry bar
(Material/Carbon/Polaris/HIG, WCAG 2.2) — language first, then a complete token source,
then all 32 components specced and built on those tokens, then patterns, then composed
pages, then the gates that keep it true. One system, one chapter order, one icon set.
**Architecture:** Strict layer order, additive from raw material. Today's repo values
(ramps, screens, refs 01–12, prototype) enter as **intake samples**: reverse-engineered
into tokens per skill §2, never copied blind. Each phase finishes its layer before the
next begins: (0) language declares principles/registers/roles → (1) tokens express them
as DTCG source → (2) foundations document them with specimens → (3–4) components consume
only tokens → (5) patterns compose only specced components → (6) pages prove the
composition → (7) gates + audit loop lock it. Prior shipped plans stay frozen; their
recorded supersessions (3-tab glass dock, glass-on-chrome-only, title 32) are ground
truth carried forward, not relitigated.
**Tech Stack:** DTCG JSON (`tokens/`) → `scripts/build-tokens.mjs` →
`design-system/tokens.css`; vanilla component/pattern CSS; Phosphor
`@phosphor-icons/react` + web; `npm test` (lint:tokens + contrast + plan:names +
ds-track + verify:atlas/mechanics). Build is `node scripts/ds-track.mjs && vite build`.
**Tags:** Design System, Component, Layout, Tooling

---

## 0. Ground truth — raw material vs what must be built (not a phase)

Today's repo is raw material, not a system. Intake verdicts (§Builder skill §5):

**Raw material (reverse-engineer into tokens, do not copy blind):**
- `tokens/primitives.json` — 50–900 ramps (sapphire, citrine, red-beryl, amethyst…),
`font/spacing/radius/transition` groups; `tokens/motion.json` — durations/easings;
`tokens/semantic-light/dark.json` — bg/border/text/accent/shadow/role groups
- ref-01–12 witnesses (paper/glass/ceremony registers, Operate order, funnel doctrine)
- Prototype Opps screen (title 32, KPI hairline, chips `2px ink`, ActivityStrip diamonds)
- 32 `src/components/*` + 6 `src/patterns/*` implementations (values need tokenizing)
- Contrast + quarantine lint gates (extend, never rebuild)

**Must be built from the ground up (gaps):**
1. Layer 0 — the language itself as DS Chapter 1 (principles that reject, registers with
witnesses, roles, composition law, voice). Today split across a 47-line page + 61-line
stub. A DS *is* its visual language — build it once, as chapter one.
2. Layer 1 — a *complete* token source: `opacity` scale missing; role/type/space/radius/
shadow/motion/glass aliases partial; flat dot-notation discipline unenforced.
3. Layer 2 — foundations documentation: token tables + live specimens + contrast pairs +
code snippets per foundation. Today 28–42 line stubs with none of these.
4. Layer 3 — component specs: 0 of 32 have the full §3 template
(Purpose/Anatomy/Variants/States/Token Usage/Dos/A11y). Gallery shows renders, not specs.
5. Layer 4 — pattern library per §4 (combines + layout rules + when-vs-alternative).
6. Layer 5 — composed pages proving the stack (Opps pinned; Home/Leads on the one
empty state, not dashed boxes).
7. Layer 6 — gates + audit loop: foundation-drift lint, role-coverage tests, quarantine
gate, `audit-checklist.md`, DESIGN.md lint-clean, coverage tracker all checked.

Out of scope, do not build: Storybook, framework bindings, iOS/Android export, dark
product theme, glass retunes, deleting `ref-06-*-DUP`, packing lines to beat the
100-line cap (packing is a violation — extract instead).
Standing laws that still win: `AGENTS.md` §1–10 (100 lines/file, no raw color outside
generated tokens, one plan trailer per DS commit, no push without explicit `y`).

---

## Builder skill (embedded — normative for this plan)

### 1. Intake
A sample/idea enters at one layer: **Token → Component → Pattern → Page**.
Ask: does it exist already (partially/fully)? Extend or reconcile if yes, create if no.

### 2. Token Layer (Foundation) — token-first discipline
No component spec references a value that is not a token first. Reverse-engineer crude
samples into nearest tokens before speccing; propose the token if missing. Categories:
`color` (brand, semantic success/warning/error/info, neutral scale, surface, on-surface),
`typography` (family, size, weight, line-height, letter-spacing), `spacing` (4px base),
`radius` (none/sm/md/lg/full), `elevation`/`shadow` (0–4), `motion` (fast/base/slow +
easing), `opacity` (disabled, overlay, subtle). Flat dot-notation JSON:
`{"color.brand.primary": {"value": "#0057FF", "type": "color"}}`.

### 3. Component Layer — the spec template (every component, no exceptions)
#### [Component Name]
**Purpose** — one sentence: problem solved + where it lives.
**Anatomy** — every part labeled (container, label, icon, indicator). Tokens only.
**Variants** — table: Variant | Description | Key differences.
**States** — Default | Hover | Active | Focus | Disabled | Loading | Error (as applicable).
**Token Usage** — table: Property | Token (names, never raw values).
**Dos and Don'ts** — 2–4 sharp rules.
**Accessibility** — min touch target, contrast pair, ARIA role.

### 4. Pattern Layer
Per pattern: which components combine | layout rules (spacing tokens, alignment) |
when to use vs an alternative.

### 5. Audit Mode (adherence loop)
Per element of any screen: **Compliant / Deviation / Gap** (gap = not in system yet).
Deviations → correct token/component. Gaps → new spec via §3 template.

### Working With Existing Samples
1. Extract implicit decisions (spacing? type sizes?) 2. Reverse-engineer to nearest
tokens 3. Propose missing tokens 4. Write the §3 spec 5. Flag principle violations.

### Output Conventions
Tokens by name, tables for variants/mappings, direct language, no filler adjectives.
Propose-and-ask on ambiguity ("Does this match your intent?"). Every session states
added / changed / still missing.

### Coverage tracker (all checked before this plan closes)
- [ ] Token foundations complete
- [ ] Core components specced (button, input, card, modal, nav, badge, toast)
- [ ] Feedback states documented
- [ ] Pattern library started
- [ ] Audit checklist exists

---

## Phase gate protocol — you approve every phase (normative)

No phase closes without your explicit approval in chat. The mechanism, same for all
7 phases and every session that runs this plan:

**1. Present verifiable outputs.** When a phase's tasks are done and green, the agent
presents the phase's outputs (table below) — opens the live pages in the preview pane,
names the exact files, pastes the gate outputs (tests/lint). Never a summary *about*
the work; the work itself, viewable. Every presentation attaches rendered screenshots of
each changed page/frame — headless Chrome against a temp server on a non-dev
port, one shot per changed tab/panel, attached as MEDIA. Approval is judged on
pixels, never on SHAs and file lists.
**2. You tweak recursively.** You give feedback on what you see ("title still small",
"chip wrong", "drop that panel"). The agent revises (appends fix commits under the same
phase, re-runs `npm test` + `npm run ds:track`), re-presents. Rounds continue until you
approve — there is no auto-advance, no "looks good to me, shipping".
**3. Approval closes.** Only your explicit `approve / y / ship it` for that phase lets
the agent write the `*Shipped in <sha> · Tasks a–b · phase-N.*` line and mark tasks
`✓ done`. Until then the line stays `pending` and the next phase does not start.
An approval covers that phase only — never future phases.
**4. State survives sessions.** Gate state lives in this file per phase:
`*Gate: awaiting review*` → `*Gate: approved <date> — <your words quoted>*`. Any session
resumes by reading the gate lines: first phase without an approval line is the active one.

| Phase | Verifiable outputs you check | Where you view them |
|---|---|---|
| 1 Language | Chapter-1 doc text; chapter order; gallery opens on Language | `language.html` :5174, `design-system/README.md`, `gallery.html` |
| 2 Tokens+foundations | Token source diff; every foundation with specimen + contrast + snippet; lint output | `gallery.html` Foundations tabs, `design-system/tokens.css`, terminal output |
| 3 Core components | 13 component specs (§3, all 7 fields); CSS token-only; gallery captions | `prototype/gallery/actions+identity+cards+data.md`, gallery panels |
| 4 Rest components | 19 remaining specs; Phosphor-only proof (`grep sprite.svg`) | `prototype/gallery/form+choice+navigation+overlays.md`, gallery panels |
| 5 Feedback+patterns+pages | Feedback section; 4 pattern recipes; Opps/Home/Leads composed | prototype :5174 (Opps, Home, Leads tabs) |
| 6 Motion+gates | Motion demos + reduced-motion; quarantine/contrast test outputs | `gallery.html` motion frame, `npm test` output |
| 7 Lock | Audit checklist doc; DESIGN.md lint 0 errors; coverage boxes checked | `audit-checklist.md`, `DESIGN.md`, this file's tracker |

---

## Phase 1 — Register + build Layer 0: the language {#phase-1}

*Tags: Design System*

*Ground floor. The language is written as DS Chapter 1 with reject power, and the
chapter order every later layer follows is declared. No tokens, no pixels yet.*

| # | Task | Done when |
|---|---|---|
| 1 | Names entry | `npm run plan:names` no longer lists this file |
| 2 | Language built as Chapter 1 | `design-system/docs/visual-language.md` holds principles + registers + roles + composition law + voice, each with reject lines + witnesses |
| 3 | Chapter order declared + gallery opens on it | `design-system/README.md` lists Chapters 1–5; `gallery.html` opens on Language; tab order matches |

*Shipped in 3e75875 · Tasks 1–3 · phase-1.*

*Gate: approved 2026-09-23 — "Approve, start Phase 2"*

### Task 1: Register this plan ✓ done
**Objective:** Changelog sees this file before any other edit.
**Files:**
- Modify: `src/ds/changelog-names.json` — add one key (Title ≤76ch, purpose 2–4 words,
keep one JSON object):
```json
"2026-09-23_002500-design-system-consolidation.md": {
  "title": "Design system — ground-up build, tokens to pages",
  "purpose": "ground-up DS"
}
```
**Verify:** `npm run plan:names` → this file not listed.
**Commit:** `docs(ds): name the ground-up DS build plan [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-1}]`

### Task 2: Build the language — Chapter 1 ✓ done
**Objective:** The ground every layer stands on. Five principles that can reject a
screen; three registers + data-mark with ref witnesses; role table (action/measure/
soft/strong/score/warn/mark → alias → hex → where used); Operate/Monitor/Reports
composition law with order; product-vs-ceremony voice rule; dated supersessions
(3-tab glass dock; glass on chrome only; title 32).
**Files:**
- Modify: `design-system/docs/visual-language.md` — build it to the full Chapter 1
 above (extend the 61-line stub; split nothing — this file *is* Chapter 1).
- Modify: `language.html` — rebuild as the Chapter-1 page: principles with reject
lines, role swatches via `var(--role-*)`, Operate order list, quarantine note. Tokens
only, no raw hex.

**Verify:** every ref-01–12 cited once; every role named with alias + usage; no token
values changed (language declares, Phase 2 tokenizes).
**Commit:** `docs(ds): build DS Chapter 1 — the language [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-1}]`

### Task 3: Declare chapter order, gallery opens on it ✓ done
**Objective:** One IA all layers follow: 1 Language · 2 Foundations · 3 Components ·
4 Patterns+Pages · 5 Audit. Each chapter links its doc + gallery tab + DESIGN.md section.
**Files:**
- Modify: `design-system/README.md` — rewrite index as Chapters 1–5.
- Modify: `gallery.html` — default active tab becomes Language (new `language` frame:
principles + role swatches + CTA to `language.html`); tab order re-sequenced to the
chapter order. One-line edits per tab; extract CSS/JS if near budget (never pack lines).

**Verify:** fresh load shows Language; every `data-tab` appears under the same name in
the chapter list.
**Commit:** `feat(ds): gallery opens on Chapter 1 in chapter order [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-1}]`

---

## Phase 2 — Build Layer 1+2: token source + foundations {#phase-2}

*Tags: Design System, Tooling*

*Ground-up token construction: every value in §2's categories exists as DTCG source,
builds to CSS, and is documented with specimen + contrast + snippet. Components may
only begin after this phase.*

| # | Task | Done when |
|---|---|---|
| 4 | Token source complete | color/type/space/radius/shadow/motion/opacity/glass all exist as DTCG + `--*` CSS |
| 5 | Foundations documented | gallery Foundations frames show token table + contrast + snippet per foundation |
| 6 | Lint foundation drift | `scripts/lint-tokens.mjs` fails raw paint/space/radius/motion in components/patterns |

*Shipped in f428087 · Tasks 4–6 · phase-2.*

*Gate: approved 2026-09-23 — "Approve — close Phase 2, start Phase 3"*

> **Course correction 2026-09-23:** Task 5's append-lines pass shipped (commits `93a8993`) but reads as meta-line soup — no layout, story, or structure; below industry-doc bar. Foundations are rebuilt as chapter-idiom articles (`public/foundations/*.html`, fetched into slim frame shells): kicker → hero → lede → laws + rejects → token table → specimens → contrast → snippet → related. Color first as exemplar; the other six follow on exemplar approval.

### Task 4: Build the token source ground-up ✓ done
**Objective:** The complete Layer 1. Intake the raw material (§0) into tokens; propose
(not invent) anything missing.
**Files:**
- Read first: `tokens/primitives.json`, `tokens/semantic-light.json`,
`tokens/semantic-dark.json`, `tokens/motion.json`, `scripts/build-tokens.mjs`,
`design-system/tokens.css`
- Modify: `tokens/primitives.json` — complete the source: 50–900 ramps verified
untouched; add the missing `opacity` scale (`disabled`, `overlay`, `subtle`) with
values copied from current component CSS; fill any absent `spacing`/`radius`/
`transition` steps the gallery already renders.
- Modify: `tokens/semantic-light.json` + `tokens/semantic-dark.json` — complete the
`role` group (action/measure/soft/strong/score/warn/mark) and `type` group
(title 32/card 20/body 16/meta 14/micro 12) as aliases, pixel-identical, never retuned.
- Modify: `scripts/build-tokens.mjs` — emit every group (`opacity.*`, `role.*`,
`type.*`, `space.*`, `radius.*`, `motion.*`, `glass.*`) as `--*` CSS if any emitter
is absent. Never hand-edit `tokens.css` (`npm run build`).

**Verify:** `npm run build` → `tokens.css` contains `--role-*`, `--type-*`,
`--spacing-*`, `--radius-*`, `--shadow-*`, `--motion-*`/`--transition-*`,
`--opacity-*`, `--glass-*`; computed colors unchanged; flat dot-notation keys
throughout the JSON source.
**Commit:** `feat(ds): build token source ground-up — all layers tokenized [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-2}]`

### Task 5: Document foundations with specimens + contrast + code ✓ done
**Objective:** Layer 2. Each foundation teaches: token → value → where used →
contrast pair + ratio → copy-paste snippet.
**Files:**
- Modify: `gallery.html` Foundations frames (color, typography, spacing, radius, shadow,
motion, iconography) — per frame add: token-name table row, one contrast note with
ratio (white on `role-action` 5.91 AA; `role-measure` 4.14 AA-large only;
`role-score` on white 4.51), one `<code>` snippet using `var(--*)`. One line per
addition; no new panels.

**Verify:** each Foundations tab shows tokens + contrast + snippet; `lint:tokens` green.
**Commit:** `feat(ds): foundations documented — tokens, contrast, code [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-2}]`

### Task 6: Lint foundation drift ✓ done
**Objective:** The ground stays solid — the next screen cannot invent paint, space,
radius, or motion.
**Files:**
- Modify: `scripts/lint-tokens.mjs` — extend the raw-paint check
(`#hex`/`rgba(`/`hsla(`) to `src/styles/**/*.css` + `src/components/**/*.css` +
`src/patterns/**/*.css`, plus raw-spacing/radius probe (`border-radius: 9999px` that
should be `var(--radius-full)`). Exempt via `lint-allow` + device geometry
(`src/device/`, `src/os/`, `src/glass/`).

This task adds the check, not a cleanup of every existing px.
**Verify:** temporary `border-radius: 12px` in `src/patterns` fails lint; probe reverted
before commit.
**Commit:** `feat(tooling): lint foundation drift [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-2}]`

---

## Phase 3 — Build Layer 3, batch 1: core components {#phase-3}

*Tags: Component*

*Components built on Layer-1 tokens only (§3 template, all seven fields). Batch 1 is
the skill's own core list: button, card, nav, badge + chip, avatar, KPI/data.*

| # | Task | Done when |
|---|---|---|
| 7 | Button + inputs' siblings specced and built | Button, Chip, Badge, StatusPill, Avatar — full §3 specs; CSS uses tokens only |
| 8 | Cards + data specced and built | OppCard, FunnelCard, ProfileCard, GoalBar, KpiStat, Table, ListRow, Timeline — full §3 |
| 9 | Gallery proves batch 1 | each batch-1 panel shows anatomy + token table + do/don't caption + contract link |

### Task 7: Build actions + identity on tokens ✓ done
*Shipped in 80164f5 — see commit subject.*
**Objective:** Intake the five highest-traffic components; reverse-engineer every crude
value to its Phase-2 token first; surface (never invent) new token needs.
**Files:**
- Modify: `prototype/gallery/actions.md` — Button to §3 (variants
primary/secondary/ghost/destructive; sizes sm/md/lg; all states incl loading/disabled;
Token Usage table; 44px target; `aria-disabled`/focus-ring; 2–4 dos/don'ts).
- Modify: `prototype/gallery/identity.md` — Chip (incl `chip--hot` 2px ink law), Badge,
StatusPill (solid fill + label, never color-alone), Avatar (stack, online dot) to §3.
- Modify: the five components' CSS only where a raw value remains — swap to the
Phase-2 token, zero visual change.

**Verify:** all seven §3 fields per component; zero raw values in Token Usage;
`lint:tokens` green.
**Commit:** `feat(ds): build actions + identity on tokens [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-3}]`

### Task 8: Build cards + data on tokens ✓ done
**Objective:** Same bar for the domain components.
**Files:**
- Modify: `prototype/gallery/cards.md` — OpportunityCard (sapphire stage, red-beryl
chance, citrine distance, hairline no-shadow law), FunnelCard, ProfileCard, GoalBar
(`role-measure` fill, gem variant quarantined) to §3.
- Modify: `prototype/gallery/data.md` — KpiStat, Table (aria-sort), ListRow, Timeline,
Sparkline, FunnelGlyph to §3.
- Modify: the components' CSS only for raw-value → token swaps, zero visual change.

**Verify:** card shadow law stated per card (hairline vs floating); gem hues quarantined
to ceremony variants only.
**Commit:** `feat(ds): build cards + data on tokens [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-3}]`

### Task 9: Gallery proves batch 1 ✓ done
**Objective:** Panels are specimens: anatomy labels + token table + do/don't, beside the
render.
**Files:**
- Modify: `gallery.html` — batch-1 panels (`actions`, `identity`, `cards`, `data`) gain
one anatomy caption + one token line + one do/don't line each (three one-line additions
per panel max; link the `prototype/gallery/*.md` contract).

**Verify:** panels render captions; `wc -l` within budget; `lint:tokens` green.
**Commit:** `feat(ds): gallery proves batch-1 components [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-3}]`

---

## Phase 4 — Build Layer 3, batch 2: remaining components {#phase-4}

*Tags: Component*

*Form, choice, nav, overlays, toolbar, icon. Same §3 bar. Closes "0 of 32 specced". One
icon system is built here (Phosphor), not patched later.*

| # | Task | Done when |
|---|---|---|
| 10 | Form + choice built on tokens | TextInput, Select, Search, Textarea, Checkbox, Radio, Switch, Slider — full §3 |
| 11 | Nav + overlays + icon built | Tabs, Breadcrumbs, Pagination, Accordion, TabBar, Overlay family, Toolbar, Icon (Phosphor only) — full §3 |
| 12 | Gallery proves batch 2 | batch-2 panels show anatomy + tokens + do/don't captions |

### Task 10: Build form + choice on tokens
**Objective:** Intake the input layer, incl shared focus-ring + reduced-motion laws.
**Files:**
- Modify: `prototype/gallery/form.md` — TextInput (label/help/error/prefix/suffix),
Select, Search (pill), Textarea to §3; error pattern cites `role-score` + text (never
color-alone).
- Modify: `prototype/gallery/choice.md` — Checkbox, Radio, Switch, Slider to §3;
`prefers-reduced-motion` behavior stated per control.
- Modify: component CSS only for raw-value → token swaps, zero visual change.

**Verify:** error/disabled states reference `opacity-disabled` + `aria-disabled`;
seven fields each.
**Commit:** `feat(ds): build form + choice on tokens [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-4}]`

### Task 11: Build nav + overlays + icon on tokens
**Objective:** Navigation semantics, overlay accessibility contracts, one icon system.
**Files:**
- Modify: `prototype/gallery/navigation.md` — Tabs (roving tabindex), Breadcrumbs,
Pagination, Accordion, TabBar (3 Phosphor tabs, icon-only, signal-on-selected,
supersession dated 2026-09-22 cited), Toolbar to §3.
- Modify: `prototype/gallery/overlays.md` — Modal/Drawer/Menu/Tooltip/Popover/Toast:
focus-trap, esc, `role=dialog/alertdialog/status`, layering + quarantine (ceremony copy
never in Operate chrome).
- Modify: `gallery.html` + component markup — replace remaining
`<use href="src/components/Icon/sprite.svg#…">` with `<i class="ph…">` equivalents.
Record in `identity.md`: "Phosphor regular → fill is the system; sprite deprecated,
removal follows the zero-importer guarantee (grep 0 importers, build+smoke ok,
`git stash` checkpoint)." Delete `sprite.svg` in this task only if the guarantee is
fully met; otherwise record remaining importers and carry them.

**Verify:** every overlay states focus behavior + ARIA role; `grep -rn "sprite.svg"
gallery.html src/components src/patterns` → zero or a written importer list.
**Commit:** `feat(ds): build nav + overlays + one icon system [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-4}]`

### Task 12: Gallery proves batch 2
**Objective:** Same three-line proof per panel as Task 9.
**Files:**
- Modify: `gallery.html` — `text`, `choice`, `nav`, `overlays` panels gain anatomy +
token + do/don't captions with contract links.

**Verify:** captions render; budget + lint green.
**Commit:** `feat(ds): gallery proves batch-2 components [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-4}]`

### Task 12A: Gallery showcases actions + identity variants
**Objective:** Pixels finally move — the Actions and Identity panels render every
rebuilt variant/state/size side by side, so the M3+Carbon rebuild is judgable on
sight. Panel partials live in `public/gallery-panels/*.html` (Vite serves `public/`
at root), loaded through the existing `data-doc` fetch in `gallery-shell.js`;
`gallery.html` keeps only thin frame shells (file-budget law).
**Files:**
- Create: `public/gallery-panels/actions.html` — all button variants
(primary/secondary/tonal/ghost/destructive/danger-ghost), icon-led + icon-only,
sm/md/lg, full-width, disabled + aria-disabled + loading (`data-loading` demo),
focus-ring note, caption + contract link.
- Create: `public/gallery-panels/identity.html` — chip types
(filter/assist/input/suggestion, selected, sm, deletable), badge tones + sm/dot/
max/overlap, status-pill tones + sm + dot/icon, avatar xs–xl + stack + presence.
- Modify: `gallery.html` — `actions` + `identity` frames become `data-doc` shells.
**Verify:** panels render on `:5174/gallery.html#actions` + `#identity`; screenshots
attached at gate; budget + lint green.
**Commit:** `feat(ds): gallery showcases actions + identity variants [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-4}]`

### Task 12B: Gallery showcases remaining variants
**Objective:** Same full-variant showcase for `text`, `choice`, `nav`, `overlays`,
`data`, `cards` panels. Fanned out to 6 parallel subagents (one per panel), no
approval gate per user override — each agent writes ONLY its own
`public/gallery-panels/<panel>.html` partial (copying `actions.html` as the idiom:
`<div class="pad">`, `h3` rows, `.row`, caption + contract link, ≤100 lines,
Phosphor `<i class="ph…">` icons, never `sprite.svg`); parent does the single
`gallery.html` rewiring + shell delegation fix itself so agents never collide.
**Files:**
- Create: `public/gallery-panels/{text,choice,nav,overlays,data,cards}.html`.
- Modify: `gallery.html` — remaining frames become `data-doc` shells.
- Modify: `src/ds/gallery-shell.js` — convert direct bindings (accordion, table
sort, tooltip) to delegated `document` listeners so fetched panels stay live.
**Verify:** all six panels render on `:5174`; screenshots at gate; budget + lint green.
**Commit:** `feat(ds): gallery showcases remaining variants [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-4}]`

### Task 12C: Full component articles — Material/Carbon-grade docs
**Objective:** Every component gets a full article in `public/component-docs/*.html`
(kicker → hero → lede → laws+rejects → variants table → states table → token
table → code snippet → do/don't → a11y → related + contract link), copying the
`button.html` exemplar idiom and `ch-*`/`tp-*` classes, ≤100 lines each. Articles
load as second `data-doc` pads inside their gallery frame, below the specimens.
Fanned out per panel (6 agents, one panel each); parent wires frames.
**Files:**
- Create: `public/component-docs/{badge,statuspill,avatar,icon,textinput,select,
search,textarea,checkbox,radio,switch,slider,tabs,breadcrumbs,pagination,
accordion,tabbar,toolbar,overlays,table,listrow,kpi,timeline,sparkline,
funnelglyph,opportunitycard,funnelcard,profilecard,goalbar,gemreward}.html`
(`button.html`, `chip.html` done as exemplars).
- Modify: `gallery.html` — one `component-docs` pad per article per frame.
**Verify:** every article renders on `:5174` with all 10 sections; screenshots at
gate; budget + lint green.
**Commit:** `feat(ds): full component articles [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-4}]`

### Task 12D: Pairings in situ — the pairing map, mapped to elements ✓ done
**Objective:** The 17×16 matrix modal answered nothing: its axes were token keys, the
cross-product was mostly pairs nothing ships, and the calibrated picks already live in
the playground above. Replace it with evidence — every pair the components actually
ship, on the element that carries it (Button · primary, StatusPill · accepted,
GoalBar · fill…), grouped by the playground's families, measured live, click-to-pin
kept. Rows are audited from `src/components/*` CSS, so a pair that is not in the
components cannot appear, and a key that does not resolve renders `unresolved` instead
of a silently wrong ratio.
**Files:**
- Create: `src/ds/pair-map-data.js` (the audited rows) + `src/ds/pair-map.js`
(cards into `[data-pairmap]`).
- Modify: `public/foundations/color-contrast.html` (modal copy + host), `src/ds/gallery.js`
(matrix + `mx` table removed, `primary`/`interactive`/`danger-strong` keys added),
`src/ds/contrast-controls.js` (pin branch), `src/ds/contrast-playground.css` (`.pm-*`),
`gallery.css` (`.mx` table rules), `gallery.html` (script block),
`src/ds/contrast-families.js` (`gray` ramp for pin resolution).
**Verify:** 25 cards render on `:5174` with live ratios; the AA-large flags
(GoalBar fill 4.14, Eyebrow 3.23, StatusPill blocked 3.84, KpiStat delta down 3.25,
Badge warning 3.57) are the audit; pin flow closes the modal and reads back in the
playground; `npm test` green.
**Commit:** `feat(ds): pairings in situ — matrix modal mapped to shipped elements [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-4}]`
*Shipped in da10664 · Task 12D · phase-4.*

### Task 12E: Contextual specimens — verbose text embedded per component ✓ done
**Objective:** Kill the scroll — every frame reads intro (kicker + hero + 1-line
lede) → specimens, with each specimen section carrying its own rule inline
(`spec-note`) and its tables behind a native `<details class="spec-more">`.
No separate spec pads below the specimens; `gallery.html` frames keep intro +
specimens only. Exemplar is Actions (`button-intro` slim + `actions.html`
contextual + `.specimen/.spec-note/.spec-more` in `gallery.css`); remaining 7
frames follow the same idiom next iterations.
**Files:**
- Modify: `public/component-docs/button-intro.html` (slim), `public/gallery-panels/actions.html` (contextual), `gallery.css` (specimen rules), `gallery.html` (drop `button.html` pad).
**Verify:** `#actions` renders intro → 5 specimens each with note + Spec details, zero long tables in the open scroll; `npm test` green.
**Commit:** `feat(ds): contextual specimens, actions exemplar [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-4}]`
*Shipped in 5b53d45 · Task 12E · phase-4.*

### Task 12F: Contextual specimens — identity frame ✓ done
**Objective:** Same contextual idiom as 12E for Identity: full `chip-intro`
kept above; `identity.html` becomes 5 specimens (chips, badges, pills,
avatars, icons) each with demo + 1-line `spec-note` + `<details class="spec-more">`;
5 spec pads unwired from the frame. Spec article files stay on disk (no
deletions without the grep-0-importers guarantee).
**Files:**
- Modify: `public/gallery-panels/identity.html` (contextual), `gallery.html` (drop 5 spec pads).
**Verify:** `#identity` renders intro → 5 specimens, zero open-scroll tables; `npm test` + `npm run build` green.
**Commit:** `feat(ds): contextual specimens, identity frame [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-4}]`
*Shipped in 29bf342 · Task 12F · phase-4.*

### Task 12G: Contextual specimens — form frame ✓ done
**Objective:** Same contextual idiom for Form: full `textinput-intro` kept
above; `text.html` becomes 6 specimens (sizes, affixes, states, select,
search, textarea) each with demo + 1-line `spec-note`, tables/details only
where they pay (sizes, states full mini-tables; select/search/textarea condensed
meta); 4 spec pads unwired from the frame. Article files stay on disk.
**Files:**
- Modify: `public/gallery-panels/text.html` (contextual), `gallery.html` (drop 4 spec pads).
**Verify:** `#text` renders intro → 6 specimens, zero open-scroll tables; `npm test` + `npm run build` green.
**Commit:** `feat(ds): contextual specimens, form frame [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-4}]`
*Shipped in 744386f · Task 12G · phase-4.*

### Task 12H: Contextual specimens — choice frame ✓ done
**Objective:** Same contextual idiom for Choice: full `checkbox-intro` kept
above; `choice.html` becomes 5 specimens (checkbox, sizes, radio, switch,
slider) each with demo + 1-line `spec-note` + condensed `<details>`; 4 spec
pads unwired. Article files stay on disk.
**Files:**
- Modify: `public/gallery-panels/choice.html` (contextual), `gallery.html` (drop 4 spec pads).
**Verify:** `#choice` renders intro → 5 specimens, zero open-scroll tables; `npm test` + `npm run build` green.
**Commit:** `feat(ds): contextual specimens, choice frame [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-4}]`
*Shipped in 88a2c96 · Task 12H · phase-4.*

### Task 12I: Contextual specimens — nav/overlays/data/cards via subagents ✓ done
**Objective:** Fan-out finish: 4 parallel subagents rewrite `nav` (6 specimens),
`overlays` (5), `data` (7), `cards` (5) panels in the 12E idiom; parent trims
nav 101→99 lines, rewires all 4 frames (18 spec pads unwired), verifies.
Every component frame is now intro + specimens; article files stay on disk.
**Files:**
- Create (via subagents): `public/gallery-panels/{nav,overlays,data,cards}.html` contextual.
- Modify: `gallery.html` (drop 18 spec pads).
**Verify:** all 8 frames intro → specimens, zero open-scroll tables; `npm test` + `npm run build` green.
**Commit:** `feat(ds): contextual specimens, final 4 frames [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-4}]`
*Shipped in 18d5e97 · Task 12I · phase-4.*

### Task 12J: Overlay showcase alignment fix ✓ done
**Objective:** Tooltip/toast/drawer specimens escaped the gallery row —
absolute tooltip floated unanchored, fixed toast-region left a void, fixed
drawer left an empty row; plus the toast × never closed (missing from the
close selector). Gallery-scoped showcase rules pin all three in-flow;
toast × added to the close selector. Component CSS untouched.
**Files:**
- Modify: `gallery.css` (3 showcase rules), `src/components/Overlay/overlay.js` (close selector).
**Verify:** `npm test` + `npm run build` green.
**Commit:** `fix(ds): overlay specimens render in-flow, toast close works [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-4}]`
*Shipped in <sha> · Task 12J · phase-4.*

---

## Phase 5 — Build Layer 4+5: feedback, patterns, pages {#phase-5}

*Tags: Component, Layout*

*Feedback documented once and referenced everywhere. Patterns compose only specced
components (§4 three fields). Pages prove the whole stack.*

| # | Task | Done when |
|---|---|---|
| 13 | Feedback states built | loading/error/disabled/empty/toast rules exist once + per-component refs |
| 14 | Pattern library built | Operate/Monitor/Reports/ActivityStrip+EmptyState: combines + layout + when-vs |
| 15 | Pages prove the stack | Opps pinned to recipe with zero drift; Home/Leads on the one empty state |

### Task 13: Build the feedback system
**Objective:** Loading, error, disabled, empty, toast behave the same everywhere —
built once, referenced per component.
**Files:**
- Modify: `design-system/docs/visual-language.md` — append Feedback section: Loading
(skeleton/shimmer quarantined to ceremony-safe surfaces, reduced-motion instant) |
Error (`role-score` + label text) | Disabled (`opacity-disabled`, `aria-disabled`,
44px target kept) | Empty (the one `empty-state` component) |
Toast (`role=status`, `aria-live=polite`, Overlay layering).
- Per-component refs: Phase 3–4 specs link this section instead of restating.

**Verify:** five states each state trigger + visual + ARIA; no component contradicts it.
**Commit:** `feat(ds): build feedback system — one behavior [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-5}]`

### Task 14: Build the pattern library
**Objective:** Each pattern states skill §4's three fields; page-intake line ships.
**Files:**
- Modify: `prototype/gallery/patterns.md` — OperateScreen, MonitorScreen,
ReportsMatrix, ActivityStrip+EmptyState composition. Per pattern: components combined
(names) | layout rules (spacing tokens between steps, alignment) | when-vs-alternative
(Operate vs Monitor for funnel depth; ReportsMatrix vs MonitorScreen for transient blob
vs temporal Goals D/W/M/Q/Y).
- State the page-intake line: *"here's a rough X sample, add it to the system" →
Intake (layer ID) → reverse-engineer tokens → §3 spec → flag deviations.*

**Verify:** all three fields per pattern; intake line present verbatim; no new
components created in this task (compose only).
**Commit:** `feat(ds): build pattern library per Pattern Layer [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-5}]`

### Task 15: Compose the pages — Opps pinned, Home/Leads emptied
**Objective:** Layer 5 proof: the one designed screen pinned to the recipe; the two
dashed-box tabs composed from the system (title + one empty state), not omitted.
**Files:**
- Modify: `src/patterns/OppsHome/opps-home.js` — header comment cites the Operate
recipe + 7 steps in order. Modify: `src/patterns/OppsHome/opps-home.css` — header maps
rules to tokens/roles. Zero visual change; extract to sibling README if near 100 lines.
- Modify: Home + Leads mounts — replace `EMPTY_HTML` dashed boxes with title +
`empty-state` composition per the recipe (hero/cards omissible only via the empty
state, never by dropping the title).

**Verify:** `wc -l` in budget; computed Opps title 32px, KPI `box-shadow` none, map
pill keeps `--shadow-md`; Home/Leads render title + empty state; `npm test` green.
**Commit:** `feat(ds): compose pages — Opps pinned, Home/Leads emptied [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-5}]`

---

## Phase 6 — Build Layer 6: motion, quarantine, gates {#phase-6}

*Tags: Tooling, Motion*

*Motion is tokenized with reduced-motion proof. Ceremony stays caged by lint. Roles
are gated by contrast tests.*

| # | Task | Done when |
|---|---|---|
| 16 | Motion law live | duration/easing tokens demo live with reduced-motion proof; CSS uses `var()` only |
| 17 | Quarantine gate | lint fails ceremony leaks in the Operate feed |
| 18 | Contrast + role coverage gate | every readable role pair asserted; specimens asserted in source |

### Task 16: Build motion law live
**Objective:** Motion is roles, not vibes; reduced motion is proven, not promised.
**Files:**
- Modify: `gallery.html` motion frame + `prototype/gallery/motion-gems.md` — duration
tokens (`xs 100/sm 150/md 250/lg 400/xl 600`), easings (standard/entrance/exit/spring/
elastic), elastic overshoot 12px, tilt 12°/600px perspective, `prefers-reduced-motion`
instant fallback — each with a live demo + token name.
- Modify: `src/motion/*.css` — transitions via `var(--transition-*)` only.

**Verify:** `grep -n "transition" src/motion/*.css` shows `var()` only; reduced-motion
media present.
**Commit:** `feat(ds): build motion law with reduced-motion [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-6}]`

### Task 17: Cage ceremony — quarantine gate
**Objective:** Orbs, iridescence, Spline, ceremony copy never leak into the feed again.
**Files:**
- Modify: `scripts/lint-tokens.mjs` (or new `scripts/lint-ceremony.mjs` wired into
`npm test`) — fail when `src/patterns/OppsHome`, `src/patterns/EmptyState`, or
`src/patterns/ActivityStrip` CSS/JS contains `spline`, `hue-rotate`, `orb`,
`iridescen`, or ceremony strings (`Rock Solid`, `data in here don't lie`). Exempt:
`src/components/GemReward`, gallery Gems panel.

**Verify:** temporary ceremony string in `opps-home.js` fails lint; probe reverted.
**Commit:** `feat(tooling): cage ceremony — quarantine gate [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-6}]`

### Task 18: Gate roles — contrast + specimens
**Objective:** The pairs people read are gated; specimens are asserted, not eyeballed.
**Files:**
- Modify: `tests/contrast.test.mjs` — cover ink/paper, white on `role-action` (5.91),
`role-measure` 4.14 (AA-large only), `role-score` on white 4.51, ink on `role-warn`,
white on `role-measure-strong`, `role-mark` usage note. Never change hex to pass —
assert exempts as large/bold only.
- Create: `tests/visual-language.test.mjs` — source asserts (node, no browser):
Chapter-1 page contains all six roles; every `src/components/*` dir has a §3 spec
heading; gallery captions link contracts; `opps-home.js` cites the recipe; no pattern
CSS sets `outline: none` without `:focus-visible`.

**Verify:** both test files + `npm test` green.
**Commit:** `test(ds): gate roles — contrast + specimens [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-6}]`

---

## Phase 7 — Lock it: audit loop, DESIGN.md, coverage {#phase-7}

*Tags: Design System, Tooling*

*The adherence loop ships as an artifact. Machine spec agrees with human docs. All
five coverage boxes checked. Any future session enters through the intake line.*

| # | Task | Done when |
|---|---|---|
| 19 | Audit checklist ships | `design-system/docs/audit-checklist.md` runs Compliant/Deviation/Gap on any screen |
| 20 | DESIGN.md built from the system | machine spec mirrors Chapters 1–5; `design.md lint` 0 errors |
| 21 | Coverage closed + intake open | all five tracker boxes checked; intake line is the documented front door |
| 22 | Final verification sweep | full gates green, changelog resolves per phase, plan closed |

### Task 19: Ship the audit checklist
**Objective:** Any session, any screen: run the checklist, get flags, fix, re-audit.
**Files:**
- Create: `design-system/docs/audit-checklist.md` (≤100 lines) — per-element rows:
element → system reference → **Compliant / Deviation / Gap** → fix (correct token/
component, or §3 pointer for gaps). Embed the 5-step sample flow (§Working With
Existing Samples). Link from `design-system/README.md` Chapter 5.

**Verify:** checklist contains all three flags + sample flow; `npm test` green.
**Commit:** `test(ds): ship audit checklist — adherence loop [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-7}]`

### Task 20: Build DESIGN.md from the system
**Objective:** The machine-readable spec is generated from the built layers, not
written beside them: colors (ramps + roles), typography, spacing, radius, elevation,
shapes, components, Do's and Don'ts mirroring the quarantine (glass on chrome yes /
on cards no / ceremony copy out of feed / 24px is not a title). Orphan-token lint
satisfied via `{colors.*}` refs. No unused ramps.
**Files:**
- Modify: `DESIGN.md` body to the above.

**Verify:** `npx -y @google/design.md lint DESIGN.md` → 0 errors. `npm test` green.
**Commit:** `docs(ds): build DESIGN.md from the system [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-7}]`

### Task 21: Close coverage, open intake
**Objective:** The skill's tracker all checked; the front door labeled.
**Files:**
- Modify: this plan file — check all five §Coverage tracker boxes.
- Modify: `design-system/README.md` — front-door paragraph: start with
*"here's a rough X sample, add it to the system"* → the skill intakes at
Token→Component→Pattern→Page, reverse-engineers tokens, writes the §3 spec, flags
deviations. Link `audit-checklist.md`.

**Verify:** five boxes checked in this file; README front door present with the intake
phrase verbatim.
**Commit:** `docs(ds): close coverage — intake open [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-7}]`

### Task 22: Final verification sweep
**Objective:** Prove the ground-up stack stands end to end.
**Files:** none (verification only).
- Run: `npm run plan:names` → 0 missing. `npm run ds:track` → fully tagged, wip 0.
`npm test` green. `npm run build` green. Visual: `/ds/#/changelog` Miller columns +
drawer badges resolve per phase of this plan.
- Close each phase in this file with its `*Shipped in <sha> · Tasks a–b · phase-N.*`
line and mark every task `✓ done` (or `✗ cancelled` with the user-override blockquote
per SOP — never unchecked, never re-proposed).

**Verify:** all gates above green in one run.
**Commit:** `chore(ds): verify ground-up DS build complete [plan:2026-09-23_002500-design-system-consolidation.md#{#phase-7}]`

---

## Risks
- **Strict layer order:** a task that needs an upper layer's token/component stops and
intakes it at the correct layer first — never hardcodes upward.
- **Scope vs 100-line cap:** gallery + language are line-tight. Extract to sibling
CSS/MD, never pack lines onto one line — packing is a violation, not a fix.
- **Title 32 stands:** returning to reserved 24 needs a dated supersession, not a quiet
edit.
- **Glass blur confusion:** `--glass-blur` (12px) ≠ dock chrome blur (4.5px). Task 4
builds, never retunes. Copy literals via `optics.js` when unsure.
- **Shared tree:** other sessions edit this repo. `git status` before each commit; stage
only files the task names; `git checkout -- design-system/changelog-manifest.json` on
timestamp-only churn.
- **Multi-session resume:** every session reads §Builder skill + §0 + the gate
protocol + `git log --oneline -5`, resumes at the first phase without a
`*Gate: approved…*` line, ends having run `npm run plan:names`, `npm run ds:track`,
`npm test`. State added / changed / missing. Never write a `*Shipped in*` line or
start the next phase without the user's explicit approval for that phase.

## Open questions (do not block the plan)
- Dark product theme stays out — roles exist in `semantic-dark.json`, no dark frame here.
- Full Reports/Funnel product screens are product work later — compose from
MonitorScreen/ReportsMatrix + these roles.
- Gem FAB (`aria-label="Gem search"`) stays undecided — leave it.
- Whether `language.html` survives as the Chapter-1 page or thins to a redirect is
decided in Task 3 with link evidence, not before.
