---
version: beta
name: ALPHA CRM
description: Field-sales CRM — light-first, typography-driven Operate/Monitor surfaces with a single Sapphire action hue, gem-category gamification, and transient-vs-temporal data logic. Full 50–900 ramps + signal swap-slot.
colors:
  primary: "#222222"
  secondary: "#525252"
  tertiary: "#218aea"
  neutral: "#fafafa"
  neutral-50: "#ffffff"
  neutral-100: "#f5f5f5"
  neutral-200: "#e0e0e0"
  neutral-300: "#cccccc"
  neutral-700: "#525252"
  neutral-900: "#141414"
  sapphire-50: "#f5f9ff"
  sapphire-100: "#ebf5fe"
  sapphire-200: "#c1e0fd"
  sapphire-300: "#7cbefb"
  sapphire-400: "#218aea"
  sapphire-500: "#1666af"
  sapphire-600: "#0b4377"
  sapphire-700: "#032443"
  sapphire-800: "#021a30"
  sapphire-900: "#011020"
  citrine-50: "#fff8e6"
  citrine-100: "#fff1d6"
  citrine-200: "#ffe0a3"
  citrine-300: "#ffc752"
  citrine-400: "#ffb01e"
  citrine-500: "#9d6a00"
  citrine-600: "#704a00"
  citrine-700: "#452c00"
  citrine-800: "#2e1e00"
  citrine-900: "#1a1100"
  redberyl-50: "#fff0f4"
  redberyl-100: "#ffe2eb"
  redberyl-200: "#ffaac5"
  redberyl-300: "#ff85ab"
  redberyl-400: "#ea005e"
  redberyl-500: "#a80035"
  redberyl-600: "#6b0022"
  redberyl-700: "#330010"
  redberyl-800: "#1f000a"
  redberyl-900: "#0f0005"
  amethyst-50: "#fcf5ff"
  amethyst-100: "#f7eeff"
  amethyst-200: "#debeff"
  amethyst-300: "#c48aff"
  amethyst-400: "#a54cff"
  amethyst-500: "#6e00db"
  amethyst-600: "#490091"
  amethyst-700: "#27004d"
  amethyst-800: "#190033"
  amethyst-900: "#0f001f"
  success: "#18d824"
  warning: "#f57f26"
  error: "#ff1f1f"
  signal: "#1666af"
  signal-amber: "#9d6a00"
  signal-teal: "#12a11b"
typography:
  h1:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title-card:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 700
    lineHeight: 1.25
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
  micro:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.35
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  pill: 32px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 12px
  filter-chip:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: 12px
  status-pill-accepted:
    backgroundColor: "{colors.success}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: 8px
  status-pill-progress:
    backgroundColor: "{colors.signal}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: 8px
  status-pill-new:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: 8px
  caution-chip:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: 8px
  funnel-glyph:
    backgroundColor: "{colors.sapphire-100}"
    textColor: "{colors.signal}"
    rounded: "{rounded.lg}"
    padding: 16px
  chance-value:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.redberyl-400}"
    rounded: "{rounded.sm}"
    padding: 8px
  value-amount:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.signal}"
    rounded: "{rounded.sm}"
    padding: 8px
  opportunity-card:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 16px
  funnel-card:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 16px
  goal-bar:
    backgroundColor: "{colors.amethyst-400}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: 12px
  gem-reward-sapphire:
    backgroundColor: "{colors.sapphire-300}"
    textColor: "{colors.sapphire-700}"
    rounded: "{rounded.xl}"
    padding: 24px
  gem-reward-citrine:
    backgroundColor: "{colors.citrine-400}"
    textColor: "{colors.citrine-700}"
    rounded: "{rounded.xl}"
    padding: 24px
  gem-reward-redberyl:
    backgroundColor: "{colors.redberyl-700}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl}"
    padding: 24px
  goal-bar-gem:
    backgroundColor: "{colors.amethyst-700}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: 12px
---

# Overview

ALPHA is the only CRM stack the field team needs — data in here don't lie.
Two surfaces, never mixed: **Operate** (opportunities, prospects, actions) and
**Monitor** (funnel, reports, goals). Both are light-first, typography-led, and
quiet: hairlines carry elevation, one blue carries action, gems carry ceremony.

## Colors

- **Primary (#222222):** headlines, card titles, body ink. (Housed as `--primitive-ink` — see docs/phase-1.)
- **Secondary (#525252):** supporting copy, timestamps.
- **Tertiary Sapphire (#218aea):** the SOLE action hue — CTAs, links, active states, funnel body, recenter control. Never used decoratively. Full ramp 50–900 (`#f5f9ff`→`#011020`) lives in `tokens/primitives.json` (Tier 1) and maps via `--signal` swap-slot (`--signal:var(--primitive-sapphire-ui-500)` → `--color-accent-brand:var(--signal)`), so re-theming never renames components.
- **Neutral (#FAFAFA):** canvas; cards stay pure white. Neutral light 50–900 + dark 50–900 form the 50–950 gray continuum.
- **Citrine (#FFB01E 50–900), Red Beryl (#EA005E 50–900), Amethyst (#A54CFF 50–900):** gamification gem categories + goal-bar fills. Each now ships 50/100/200/300/400/500/600/700/800/900. Never UI chrome. Alternate amber/teal signals via `--signal-amber`/`--signal-teal`.
- **Success / Warning / Error:** messaging + status pills only.

Action, Measure, Score, Warn are roles (`--role-action` → Sapphire / `--signal`, `--role-measure`/`--role-mark` → Amethyst, `--role-score` → Red Beryl, `--role-warn` → Citrine) aliasing the ramps so screens say \"measure\" without picking a hex; gem category hues themselves stay ceremony-only and never color UI chrome; `--signal` remains the swap-slot for re-theming.

## Typography

Inter everywhere. Title 32/bold tight; card title 20/bold; body 16/regular;
meta 14/medium; micro 12/medium. Hierarchy is weight + size, never color —
muted text steps down to secondary, never to a decorative hue.

## Layout

Screen order is law: title + avatar → KPI strip → hero visual → delta line →
filter chips → cards → 5-item bottom tab. 4px base grid; 16px card padding;
16–24px card radii; full-pill chips and bars. Breakpoints hold raw px:
≤767px base (section 24, radius 16), ≥768px (section 32, radius 20–24).

## Elevation & Depth

No decorative shadows on UI cards — elevation is hairline border + white
surface on `#FAFAFA` canvas. Depth (tilt, blur, 3D) belongs to funnel
visualizations and gem ceremonies only.

## Shapes

Pills for anything countable or tappable-as-filter (chips, status, goal bars,
tab indicator). Rounded rectangles (16–24px) for cards. The 3D funnel and gem
capsules are the only organic forms.

## Components

`button-primary` and `filter-chip` are the only high-emphasis tappables per
row. `goal-bar` is always full-pill with label-left/value-right. Status pills
are solid fill + white text, never outline. `gem-reward-sapphire` recolors per
category via its gem token, never via a CSS filter or separate assets. All now reference `{colors.signal}` via the swap-slot.

## Do's and Don'ts

- DO keep Sapphire for action alone; gems never tint buttons. Swap via `--signal` repoint, not rename.
- DO expand the stage's metric card on every funnel segment select.
- DO treat Activities as transient, Goals as temporal (see docs/phase-4).
- DO use glass only on chrome (dock, status edge, sheet scrim) with blur/saturate and hairline; never on content cards — Operate content stays paper + hairline.
- DON'T put moodboard decoration (orbs, gradients, editorial type) inside Operate/Monitor screens.
- DON'T add a shadow to make a card "pop" — use the hairline.
- DON'T use glass or shadow on cards — hairline carries UI, shadow is for depth viz and controls floating on imagery.
- DON'T use ceremony copy (`Rock Solid Goals`, `data in here don't lie`) inside the Operate feed.
- DON'T use 24px as a title — title is 32 (`--type-title` / `--font-size-3xl` at `-0.01em`); 24 (`--font-size-2xl`) is reserved, not a hierarchy step.
