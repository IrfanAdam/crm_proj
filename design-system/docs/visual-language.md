# Visual Language — paper, glass, ceremony

> Witnesses: ref-01 through ref-12 (see REGISTRY.md). Prototype: `src/patterns/OppsHome/opps-home.js`.

## Principles (reject what breaks them)

1. **Paper carries the work. Glass is chrome. Ceremony is a reward.**
   Reject: placing a Spline gem or glass blur on an opportunity card.
2. **Sapphire acts. Amethyst measures. Red-beryl scores. Citrine warns distance. Nothing else is a hue.**
   Reject: using a decorative teal for a chip count instead of `--role-action`.
3. **Type is weight and size. Muted text steps down the neutral ramp. Never a decorative hue for hierarchy.**
   Reject: coloring a timestamp amethyst to make it "secondary".
4. **Hairline elevates in-flow UI. Shadow is for depth viz and for controls floating on imagery.**
   Reject: giving a KPI pill `--shadow-sm` instead of a `1px` hairline.
5. **Motion explains state. Ceremony may boast. The feed may not.**
   Reject: looping a gem shimmer on the opportunities feed.

## Registers

| Register | What it is | Witness |
|---|---|---|
| Paper | Content surface — `--bg-surface` on `--bg-primary` (`#fafafa` field), hairline `--border-thin`, quiet lists | ref-01, ref-02, ref-03 (paper `#f9f9fa` / `#ebe6f0` / `#f6f9fc`), ref-09 (depth on funnel only) |
| Glass chrome | Device/chrome material — capsule dock, top blur, sheet scrim; `color-mix` + `blur` (not card elevation) | prototype dock; supersedes the flat 5-glyph tab in ref-01 (2026-09-22) |
| Ceremony | Brand/reward surface — single Spline gem, capsule copy, orbs, iridescence | ref-08 (`Rock Solid Goals` / `+Rs 4lakh`), ref-10 (pink orbs `#fe009c`), ref-11 (light `#efeff2` / dark `#272629` action `#086df6`), ref-12 (iridescent `#9e94aa` / `#a1b5de` · `data in here don't lie`) |
| Data-mark | Diamond marker on peaked bars (measure accent), not a gem | phase-3 + Opps activity strip (ref-01 / ref-02 bars); not ref-08 ceremony |
| Ramps & behavior | Token ramps + funnel doctrine (already built, not styled here) | ref-07 (ramp board, already tokenized 100–700), ref-04 (7 funnel states), ref-05 (transient vs temporal), ref-06 (blob vs Goals matrices; `ref-06-*-DUP` duplicate) |

## Composition law — Operate screen

One Operate screen composes, in order:

1. Large title (`--type-title` 32 / `-0.01em` bold) + avatar
2. KPI strip (`4/32 closed`)
3. Hero visual (map or funnel glyph)
4. Delta (`+32` · `var(--role-measure)`)
5. Chips — `chip` + `chip--hot` (2px ink)
6. Cards — `opportunity-card` / `funnel-card` (hairline, no shadow)
7. Glass dock (3 tabs, capsule, Phosphor, signal on selected)

A missing step needs a written note in the PR. Home and Leads may omit hero/cards only by using the one empty state below — not by omitting the title. If the title is absent, the morph and top blur have no anchor.

## Voice

Product (numeric, specific — Operate/Monitor chrome):

- `4/32 closed`
- `last contact 2d`
- `23km away`
- `3 Pipelines · 2 Demographies`

Ceremony (short, boastful — brand/reward only):

- `Rock Solid Goals`
- `data in here don't lie`

Ceremony copy never appears in Operate chrome. Product copy never boasts.

## Supersessions (dated, do not revert)

- **2026-09-22 — Nav:** Product nav is 3 tabs (Home, Leads, Opportunities), glass capsule, Phosphor House/Users/Handshake, signal on the selected icon. ref-01's 5-glyph position-only dot is the witness, not the law.
- **2026-09-22 — Glass:** Glass is legal on chrome (dock, status edge, sheet scrim). It is not legal on content cards. Amends the 2026-09-16 "never inside Operate" sentence in `phase-5-motion-gamification.md`.
