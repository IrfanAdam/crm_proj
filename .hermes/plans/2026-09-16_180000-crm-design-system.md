**Goal:** Establish a durable, reference-backed design system for the CRM Sales Tracking app — tokens, hierarchy, components, patterns, motion — stored as versioned MDs + `DESIGN.md` spec, updatable over time via a references registry.

**Architecture:** Three-tier tokens (primitive → semantic → component) already in `design-system/tokens.css`; `DESIGN.md` is the machine-readable spec (Google design.md format); `design-system/docs/phase-N-*.md` is the human rationale per phase; `design-system/references/` + `REGISTRY.md` is the append-only moodboard intake.

**Tech Stack:** Apple-native mobile UI (SwiftUI conventions: 4px grid, Inter, light-first + dark wrapper), WebGL/Spline for achievement gems, `npx @google/design.md` for spec lint.

**Tags:** Design System

## Phase 1 — Foundations & Tokens {#phase-1}

*Tags: Design System*

Lock the single-source token space from ref-07 (color ramps board).

### Task 1: Audit `tokens.css` against ref-07 ramps ✓ done

Map every ramp in `ref-07-tokens-color-ramps.png` (Citrine/Topaz golds, Red Beryl/Ruby reds-pinks, Amethyst purples, Neutrals, Orange/Red/Green messaging, Sapphire UI + Sapphire gamification) to Tier-1 primitives. Record gaps: raw leaks `--text-primary: #222222` and `--text-dim: #737373` have no primitive slot. Spec: `design-system/docs/phase-1-foundations-tokens.md`.

### Task 2: Semantic mapping (light-first, dark wrapper) ✓ done

Confirm Tier-2 roles (`--bg-primary/surface`, `--text-primary/secondary/muted`, `--border-thin/medium`, `--color-accent-*`, `--shadow-*`) resolve per ref-01/02/03 light screens and ref-11 dark cards. Rule: Sapphire `#218aea` is the ONLY action hue; gamification gems never color UI chrome. Spec: same MD, § Semantic.

### Task 3: Author + lint `DESIGN.md` ✓ done

Encode colors, Inter type scale, rounded, spacing, and 8 components with `{token}` references. Gate: `npx -y @google/design.md lint DESIGN.md` — zero errors, zero orphans;
one contrast warning triaged as AA-large pass (goal-bar 4.14:1, large/bold
values only; body text uses the 700 step). Spec: `DESIGN.md` itself.

*Shipped in 8eeebc5 · Tasks 1–3 · phase-1.*

## Phase 2 — Hierarchy & Layout {#phase-2}

*Tags: Design System, Layout*

Derive the app shell order from ref-01/02/03/09.

### Task 4: Screen hierarchy doctrine ✓ done

Canonical order: page title (32/bold, left) + avatar (right) → KPI strip (`4/32 closed +2%`) → hero visual (bar chart / map / 3D funnel) → delta line (`+32 than yesterday`) → filter chips → content cards → bottom tab bar (5 items). Every screen must follow it; deviations need a note. Spec: `design-system/docs/phase-2-hierarchy-layout.md`.

### Task 5: Type + spacing + shape scales ✓ done

Inter only; title 32 / card title 20 / body 16 / meta 12–14; 4px base grid; radii: cards 16–24, chips full-pill, goal bars full-pill; hairline borders, no decorative shadows on UI cards (elevation = hairline + surface step). Spec: same MD, § Scales.

*Shipped in pending · Tasks 4–5 · phase-2.*

## Phase 3 — Components {#phase-3}

*Tags: Design System, Component*

Build each atom from its reference witness.

### Task 6: Chips, pills, bars

Filter chips (`Value range`, `Stages`, `Economic 4`), status pills (`ACCEPTED` green / `IN PROGRESS` blue / `REVIEW` blue / `NEW`), goal bars (purple pill, `23 Wed` left + `72%` right, `1.4x` gem variant), timeline slider bars. Witnesses: ref-01, ref-02, ref-06, ref-11. Spec: `design-system/docs/phase-3-components.md`.

### Task 7: Cards (opportunity, funnel, profile)

Opportunity card anatomy (org logo → name → product → stage + chance + value → segmented progress → contacts → last-contact/distance → mail/calendar/phone actions); funnel summary card (funnel glyph + `Last Refreshed` + pipelines/demographics + CR/RR/CSAT/NPS strip); profile card (Olivia Jein pattern: avatar, score, projects, return, skill rows). Witnesses: ref-01, ref-02, ref-03, ref-11. Spec: same MD, § Cards.

### Task 8: Navigation + map prospect pill

Bottom tab (5 glyphs, single active dot, no labels); map card with clustered count badges + `3 prospects nearby →` pill + recenter control. Witness: ref-01. Spec: same MD, § Navigation.

*Shipped in pending · Tasks 6–8 · phase-3.*

## Phase 4 — Patterns & System Logic {#phase-4}

*Tags: Design System, Component*

Encode behaviors, not just looks.

### Task 9: Funnel interaction states

Seven states from ref-04 (Initial Load → Scroll Down elastic → Top/Middle/Bottom/Closed→Retained auto-scroll + card expand). Rule: selecting a funnel segment always expands that stage's metric card. Spec: `design-system/docs/phase-4-patterns.md`.

### Task 10: Transient vs temporal doctrine

From ref-05: Activities are transient, Goals are temporal, Funnel is transient by default with temporal trends. Timeline slider (Y/Q/M/W/D + As of Now) highlights value at point; timeframe sliding reshapes the funnel. Spec: same MD, § Time.

### Task 11: Reports list-pattern matrices

Blob (activity dots) vs Goals (bars) across Day/Week/Month/Quarter/Year from ref-06; list-pattern state chips (Business/Performance/Productivity). Spec: same MD, § Reports.

*Shipped in pending · Tasks 9–11 · phase-4.*

## Phase 5 — Motion, Gamification & Polish Loop {#phase-5}

*Tags: Design System, Motion*

### Task 12: Motion posture + 3D rewards

Elastic funnel scroll, timeline scrub, tilt-depth funnel cards (ref-09); single Spline gem recolored per category via hue-rotate filters (already in guardrails §4 — keep, don't duplicate); `Rock Solid Goals` capsule ceremony copy (`+Rs 4lakh / Closed Beyond Your Target`, ref-08). Spec: `design-system/docs/phase-5-motion-gamification.md`.

### Task 13: Moodboard direction tokens

Frosted-glass orbs, pink/purple/blue gradient spheres, `Bubble / Stand Out / Break Layout` editorial voice (ref-10, ref-11); iridescent-cube brand surface + `Only CRM stack you need / data in here don't lie` ALPHA voice (ref-12). Constraint: decoration lives in brand/mood surfaces only — never inside Operate/Monitor screens. Spec: same MD, § Mood.

### Task 14: Living-system loop (references registry)

Append-only intake: drop new refs into `design-system/references/` as `ref-NN-slug.png`, log in `REGISTRY.md` (subject, phases touched, supersedes?), then open a dated polish pass against the affected phase MD + `DESIGN.md` (bump version, re-lint). Never edit a phase MD's locked decisions without a new registry row. Spec: `design-system/references/REGISTRY.md`.

*Shipped in pending · Tasks 12–14 · phase-5.*
