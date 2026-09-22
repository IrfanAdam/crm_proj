# Visual Language — ceramic, aluminium, gems

> Witnesses: ref-01 through ref-12 (see REGISTRY.md). Prototype: `src/patterns/OppsHome/opps-home.js`.
> Rendered for humans in the gallery `Language` tab (`public/language-panel.html`); this file is the spec source.

## The idea (from the SEP Notion: Redefine, 2023–24)

Businesses grow when their people hit goals — so the whole goal-management system is by design meant to enable the professional to have **high output**. Tracking becomes momentum: gamified goals, the app nudging the next step (high-traffic areas, next follows, warm leads), a reward when the work lands. UI principles from the same source: minimalism, spacing, a **fresh, friendly visual language**, and one **strong dazzling element** (the gems). The day moves Alert → Progress → Study → Planning → Sales → Review.

## Principles (reject what breaks them)

1. **Ceramic holds the work. Aluminium frames it. Gems celebrate it.**
   Reject: placing a Spline gem or glass blur on an opportunity card.
2. **Sapphire is the device's LED. Amethyst measures. Red-beryl scores. Citrine warns distance. Nothing else is a hue.**
   Reject: using a decorative teal for a chip count instead of `--role-action`.
3. **Every screen opens with the same display title. Muted text steps down the neutral ramp. Never a decorative hue for hierarchy.**
   Reject: a 24px title, or coloring a timestamp amethyst to make it "secondary".
4. **Seams, not shadows. Shadow is for depth viz and for controls floating on imagery.**
   Reject: giving a KPI pill `--shadow-sm` instead of a `1px` hairline.
5. **Motion explains a state change. The feed states; only celebration boasts.**
   Reject: looping a gem shimmer on the opportunities feed.

## Materials — what each surface is made of

| Material | What it is | Witness |
|---|---|---|
| Ceramic | Content surface — `--bg-surface` on `--bg-primary` (`#fafafa` field), hairline `--border-thin`, quiet lists | ref-01, ref-02, ref-03 (ceramic `#f9f9fa` / `#ebe6f0` / `#f6f9fc`), ref-09 (depth on funnel only) |
| Aluminium | Device frame — capsule dock, rails, machined edges, top blur, sheet scrim; `color-mix` + `blur` (never a card) | prototype dock; supersedes the flat 5-glyph tab in ref-01 (2026-09-22) |
| Gems | Celebration, kept in its box — Rock Solid Goals (sapphire, `+Rs 4lakh`), Golden Streak (citrine), Focus Master (amethyst), Momentum (red-beryl); capsule copy, orbs, iridescence | ref-08, ref-10 (pink orbs `#fe009c`), ref-11 (light `#efeff2` / dark `#272629` action `#086df6`), ref-12 (iridescent `#9e94aa` / `#a1b5de` · `data in here don't lie`) |
| Peak marker | Diamond blink on peaked bars (measure accent), never a gemstone | phase-3 + Opps activity strip (ref-01 / ref-02 bars); not ref-08 gems |
| Ramps & behavior | Token ramps + funnel doctrine (already built, not styled here) | ref-07 (ramp board, already tokenized 100–700), ref-04 (7 funnel states), ref-05 (transient vs temporal), ref-06 (blob vs Goals matrices; `ref-06-*-DUP` duplicate) |

## Roles — where the light goes

| Role | Alias | Hex | Where used |
|---|---|---|---|
| `action` | `var(--signal)` → sapphire-ui-500 | `#1666af` | the signal light — primary button, selected tab icon, chip count |
| `measure` | amethyst-400 | `#a54cff` | funnel fill, delta `+32`, goal progress |
| `measure-soft` | amethyst-200 | `#debeff` | funnel wash under 400 core, peaked-bar base |
| `measure-strong` | amethyst-500 | `#6e00db` | emphasized measure, peak diamond marker |
| `score` | red-beryl-400 | `#ea005e` | chance %, score glyph, Momentum stone |
| `warn` | citrine-700 | `#452c00` | distance `23km`, caution chip, Golden Streak stone |
| `mark` | amethyst-500 | `#6e00db` | map arrow shadow pair, peak marker |

Display title: `--type-title` 32/`-0.01em` bold (every screen opens with it; 24 reserved, never a title) · card 20 · body 16 · meta 14 · micro 12.

## Screen recipes — the build order

Three screens, one grammar. Each step names the piece, then says what it is.

Operate — the everyday screen, your pipeline at a glance — composes, in order:

1. Display title (`--type-title` 32 / `-0.01em` bold) + avatar
2. KPI strip (`4/32 closed`)
3. Hero visual (map or funnel glyph)
4. Delta (`+32` · `var(--role-measure)`)
5. Chips — `chip` + `chip--hot` (2px ink)
6. Ceramic cards — `opportunity-card` / `funnel-card` (hairline, no shadow)
7. Aluminium dock (3 tabs, capsule, Phosphor, signal on selected)

A missing step needs a written note in the PR. Home and Leads may omit hero/cards only by using the one empty state below — not by omitting the title. If the title is absent, the morph and top blur have no anchor.

Monitor — the funnel readout, where every deal stands — composes, in order: 1. Display title (`--type-title` 32) + avatar 2. Funnel hero (tilt 3D, 7-state machine ref-04: first touch to retained, tap a stage and the card expands) 3. Metrics (`32%` conversion, `4.9` NPS) 4. Timeline chips (Y/Q/M/W/D + Now — switching reshapes the funnel, ref-05 temporal).

Reports — the review, patterns over time — composes, in order: 1. Display title 32 (no avatar — this screen is about the numbers) 2. Matrix tabs (M/Q/Y time slices) 3. Blob-vs-Goals grid (ref-06; activity dots against goal bars — effort vs target) 4. Business/Performance chips (the lens).

## Voice

Product (numeric, specific — Operate/Monitor chrome):

- `4/32 closed`
- `last contact 2d`
- `23km away`
- `3 Pipelines · 2 Demographies`

Celebration (short, boastful — reward moment only):

- `Rock Solid Goals`
- `data in here don't lie`

Celebration copy never appears in Operate chrome. Product copy never boasts.

## Only here, never there (dated, do not revert)

- **2026-09-22 — Nav:** Product nav is 3 tabs (Home, Leads, Opportunities), aluminium capsule dock, Phosphor House/Users/Handshake, signal light on the selected icon. ref-01's 5-glyph position-only dot is the witness, not the law.
- **2026-09-22 — Aluminium:** Blur and glass finishes are legal on the aluminium frame (dock, status edge, sheet scrim). They are not legal on ceramic cards. Amends the 2026-09-16 "never inside Operate" sentence in `phase-5-motion-gamification.md`.
- **2026-09-22 — Display title:** Operate/Monitor/Reports open with the display title — `--type-title` 32/`-0.01em` bold. 24 is reserved, not a hierarchy step — a 24 title is a deviation even when it "looks fine".
- **2026-09-23 — Materials:** Paper/glass/ceremony renamed ceramic/aluminium/gems; the celebration stones are named Rock Solid Goals, Golden Streak, Focus Master, Momentum. No hue or order changed — words only.
