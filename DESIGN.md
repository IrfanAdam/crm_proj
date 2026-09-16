---
version: alpha
name: ALPHA CRM
description: Field-sales CRM — light-first, typography-driven Operate/Monitor surfaces with a single Sapphire action hue, gem-category gamification, and transient-vs-temporal data logic.
colors:
  primary: "#222222"
  secondary: "#525252"
  tertiary: "#218aea"
  neutral: "#fafafa"
  sapphire-100: "#ebf5fe"
  sapphire-300: "#7cbefb"
  sapphire-500: "#1666af"
  sapphire-700: "#032443"
  citrine-400: "#ffb01e"
  citrine-700: "#452c00"
  redberyl-400: "#ea005e"
  redberyl-700: "#330010"
  amethyst-400: "#a54cff"
  amethyst-700: "#27004d"
  success: "#18d824"
  warning: "#f57f26"
  error: "#ff1f1f"
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
  pill: 9999px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.sapphire-500}"
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
    backgroundColor: "{colors.sapphire-500}"
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
    textColor: "{colors.sapphire-500}"
    rounded: "{rounded.lg}"
    padding: 16px
  chance-value:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.redberyl-400}"
    rounded: "{rounded.sm}"
    padding: 8px
  value-amount:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.sapphire-500}"
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

- **Primary (#222222):** headlines, card titles, body ink. (Token gap: needs a primitive slot — see docs/phase-1.)
- **Secondary (#525252):** supporting copy, timestamps.
- **Tertiary Sapphire (#218aea):** the SOLE action hue — CTAs, links, active states, funnel body, recenter control. Never used decoratively.
- **Neutral (#FAFAFA):** canvas; cards stay pure white.
- **Citrine (#FFB01E), Red Beryl (#EA005E), Amethyst (#A54CFF):** gamification gem categories + goal-bar fills. Never UI chrome.
- **Success / Warning / Error:** messaging + status pills only.

## Typography

Inter everywhere. Title 32/bold tight; card title 20/bold; body 16/regular;
meta 14/medium; micro 12/medium. Hierarchy is weight + size, never color —
muted text steps down to secondary, never to a decorative hue.

## Layout

Screen order is law: title + avatar → KPI strip → hero visual → delta line →
filter chips → cards → 5-item bottom tab. 4px base grid; 16px card padding;
16–24px card radii; full-pill chips and bars.

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
category via hue-rotate filter, never via separate assets.

## Do's and Don'ts

- DO keep Sapphire for action alone; gems never tint buttons.
- DO expand the stage's metric card on every funnel segment select.
- DO treat Activities as transient, Goals as temporal (see docs/phase-4).
- DON'T put moodboard decoration (orbs, gradients, editorial type) inside Operate/Monitor screens.
- DON'T add a shadow to make a card "pop" — use the hairline.
