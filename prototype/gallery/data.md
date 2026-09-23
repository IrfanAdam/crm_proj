# Data — KpiStat / Table / ListRow / Timeline / Sparkline / FunnelGlyph · §3 specs

Contracts in `src/components/*/*.css`. Gallery proof: `gallery.html` data panel
(Table, KPI, ListRow, Timeline) + cards panel (glyph + sparkline).

## KpiStat
**Purpose** — One headline number: value + total + delta. The `4/32 closed +2%`.
**Anatomy** — Baseline trio: value (xl) · total (muted) · delta chip (tinted).
**Variants** — Delta up (green tint) / `kpi__delta--down` (red tint).
**States** — Static; delta direction is the only change.
**Token Usage** —

| Property | Token |
|---|---|
| value / total ink | `text.primary` / `text.muted`, `font-size.xl` value |
| delta up | `primitive.green.300` on `primitive.green.100`, `radius.full` |
| delta down | `primitive.red.500` on `primitive.red.100` |
| type | `font-weight.bold` value, `semibold` delta |

Deviation: both delta pairs are tone-on-tone and read below AA (up ~1.36,
down ~2.0) — follow the badge ink scale (700-step ink on 100-step tint) in a
visual-change task. Recorded, not applied here.
**Dos and Don'ts** — DO keep value/total/delta in that order; DON'T add a second
delta; DON'T use the delta chip outside a KPI.
**Accessibility** — Trio must read as one sentence to AT (value, total, delta);
delta never color-alone (signed `+2%` text).
**Witness:** ref-01 KPI strip.

## Table
**Purpose** — Comparable rows with sortable columns; keyboard-driven sort.
**Anatomy** — Header row (pointer, `aria-sort` arrow) · body rows · hover wash ·
optional `table--striped`.
**Variants** — Default / `table--striped` (even-row tint).
**States** — Header hover (ink) | sorted (`aria-sort` + sapphire arrow) | row hover.
**Token Usage** —

| Property | Token |
|---|---|
| header / cell ink | `text.muted` / `text.primary`, `font-weight.semibold` header |
| rules | `border.thin` + `border-width.thin` |
| sort arrow | `primitive.sapphire-ui.500` |
| row hover / stripe | `bg.interactive-hover` / `bg.interactive` |

**Dos and Don'ts** — DO keep one sorted column at a time; DON'T stripe dense
tables (hover is enough).
**Accessibility** — `scope=col`, `aria-sort` ascending/descending, Enter/Space
toggles sort (gallery JS); arrows decorative (`::after`).
**Witness:** ref-02 opportunity rows.

## ListRow
**Purpose** — One-line opportunity: logo, name, meta, end slot. Card hairline law.
**Anatomy** — 32px logo tile · name (ellipsized) + meta · end column (badge/time).
**Variants** — Single variant; end slot composes Badge + meta.
**States** — Hover wash; no selection state (rows navigate).
**Token Usage** —

| Property | Token |
|---|---|
| frame / radius | `bg.surface` / `radius.md`, `border.thin` + `border-width.thin` |
| logo tile | `bg.interactive`, `radius.sm` |
| ink | `text.primary` / `text.muted` |
| motion | `transition.fast` |

Deviation: `2px` end-slot gap is off-scale — kept pixel-identical.
**Dos and Don'ts** — DO ellipsize the name (never wrap); DO keep the end slot
right-aligned; DON'T shadow rows.
**Accessibility** — Row is an `article` with heading where standalone; logo tile
decorative.
**Witness:** ref-01 list rows.

## Timeline
**Purpose** — Event spine: dots on a rail, done vs todo. The blob report.
**Anatomy** — Rail (`::before`) · item rows · dot (hollow → sapphire-filled done) ·
label + right time.
**Variants** — Default / `timeline__item--done` (filled dot).
**States** — Static; done is data, not interaction.
**Token Usage** —

| Property | Token |
|---|---|
| rail | `border.thin`, `border-width.thin` |
| dot ring / done fill | `primitive.sapphire-ui.400` + `bg.surface`, `radius.full` |
| ink | `text.primary` / `text.muted` |

Deviation: `10px` dot/rail geometry and `6px` dot offset are off-scale —
kept pixel-identical.
**Dos and Don'ts** — DO right-align times; DON'T use the rail without dots.
**Accessibility** — List semantics (`role=list` / items); done state needs text,
not dot-alone, where status matters.
**Witness:** ref-06 activity dots.

## Sparkline
**Purpose** — Gesture of momentum: bars in gem hues only, never chrome.
**Anatomy** — Bar row (flex) · base bars (amethyst-300) · `--accent` (500) ·
`--gem` (700) peaks.
**Variants** — Base / `--accent` / `--gem` bar emphasis.
**States** — Height animates (`transition.fast`); static otherwise.
**Token Usage** —

| Property | Token |
|---|---|
| bars | `primitive.amethyst.300` / `500` / `700` |
| motion | `transition.fast` on height |

Deviation: `3px` gap and `2px` top radius are off-scale — kept pixel-identical.
Gem hues quarantined to viz bars (quarantine gate, Task 17).
**Dos and Don'ts** — DO mark the peak (`--accent`/`--gem`); DON'T axis-label a
sparkline (use a chart); DON'T reuse gem bars for chrome fills.
**Accessibility** — `aria-hidden` bars + table/data fallback beside them.
**Witness:** ref-11 viz.

## FunnelGlyph
**Purpose** — Funnel mark: 56px hero, 40px small. Measure-family visual.
**Anatomy** — Rounded tile + glyph (⬢) in semibold xl/md type.
**Variants** — Default 56 / `funnel-glyph--small` 40.
**States** — Static.
**Token Usage** —

| Property | Token |
|---|---|
| tile / ink | `primitive.sapphire-ui.100` / `primitive.sapphire-ui.600`, `radius.lg` |
| type | `font-weight.bold` |

**Dos and Don'ts** — DO keep sapphire (funnel = measure, not celebration);
DON'T set the glyph in a gem hue.
**Accessibility** — Decorative (`aria-hidden`); sapphire-600 on sapphire-100
reads ~9 AAA.
**Witness:** ref-11 funnel.
