# Data — KpiStat / Table / ListRow / Timeline / Sparkline / FunnelGlyph · §3 specs

Contracts in `src/components/*/*.css`. Gallery proof: `gallery.html` data panel
(Table, KPI, ListRow, Timeline) + cards panel (glyph + sparkline).
Bar: Material 3 data tables + Carbon (density, sticky header, sort, selection).

## Table
**Purpose** — Comparable rows with sortable columns; keyboard-driven sort.
**Anatomy** — `.table__wrap` responsive scroll container · `table.table` ·
header row (pointer + `aria-sort` arrow) · body rows · `.table__footer`
pagination slot (hosts Pagination, count text left, controls right).
**Variants** —

| Variant | Description | Key differences |
|---|---|---|
| default | Comfortable operate density | `spacing-3` cells |
| `table--striped` | Even-row tint | `bg.interactive` even rows |
| `table--compact` | Dense (Carbon-style) | `spacing-1 spacing-2` cells |
| `table--comfortable` | Roomy monitor density | `spacing-3 spacing-4` header, `spacing-4` cells |
| `table--sticky` | Sticky header in scroll container | `position: sticky`, `z-index.sticky`, `bg.surface` mask |

**States** — Header hover (ink) | sorted (`aria-sort` + sapphire arrow) |
row hover wash | `.table__row--selected` (active wash + sapphire inset rail) |
`.table__empty` (centered muted row) | `.table__skeleton-bar` shimmer while loading.
Selectable rows use a leading `.table__cell--select` checkbox column.
**Token Usage** —

| Property | Token |
|---|---|
| wrap frame / radius | `border.thin` + `border-width.thin` / `radius.lg`, `bg.surface` |
| header / cell ink | `text.muted` / `text.primary`, `font-weight.semibold` header |
| rules | `border.thin` + `border-width.thin` |
| sort arrow / focus | `primitive.sapphire-ui.500` / `400` ring |
| row hover / selected / stripe | `bg.interactive-hover` / `bg.interactive-active` + sapphire-500 rail / `bg.interactive` |
| sticky mask / depth | `bg.surface` / `z-index.sticky` |
| skeleton shimmer | `bg.interactive` ↔ `bg.interactive-hover`, `motion.duration-xl` + `motion.easing-standard` |
| footer ink / type | `text.muted`, `font-size.xs` |
| select column width | `spacing.8` |

**Dos and Don'ts** — DO keep one sorted column at a time; DO scope sticky to
`.table__wrap` (never page-level); DON'T stripe dense tables (hover is enough);
DON'T put actions inside the sort header (arrow is decorative `::after`).
**Accessibility** — `scope=col`, `aria-sort` ascending/descending, Enter/Space
toggles sort with an audible announcement (gallery JS); checkbox column needs
`scope` + row `aria-selected`; empty state is a real row (AT-readable);
skeleton is `aria-busy`, never focusable.
**Witness:** ref-02 opportunity rows.

## ListRow
**Purpose** — One-line opportunity: logo, name, meta, end slot. Card hairline law.
**Anatomy** — `__logo` 32px tile · `__main` (ellipsized `__name` + `__meta`) ·
`__end` right column composing Badge + `__time` (stacked, right-aligned).
**Variants** —

| Variant | Description | Key differences |
|---|---|---|
| default | Navigating row | hover wash only |
| `list-row--selected` | Current/picked row | `bg.interactive-active` + sapphire-500 border |
| `list-row--disabled` | Unavailable row | `opacity.disabled`, no pointer |

**States** — Hover wash | selected | disabled dim | focus-visible ring.
**Token Usage** —

| Property | Token |
|---|---|
| frame / radius | `bg.surface` / `radius.md`, `border.thin` + `border-width.thin` |
| logo tile | `bg.interactive`, `radius.sm`, `text.secondary`, `font-weight.semibold` |
| ink | `text.primary` / `text.muted` |
| selected | `bg.interactive-active` + `primitive.sapphire-ui.500` |
| disabled / focus | `opacity.disabled` / `focus.ring` via sapphire-ui.400 |
| motion / end gap | `transition.fast` / `spacing.1` (scaled from 2px — applied) |

**Dos and Don'ts** — DO ellipsize the name (never wrap); DO keep the end slot
right-aligned (badge over time); DON'T shadow rows; DON'T use selection where
rows only navigate.
**Accessibility** — Row is an `article` with heading where standalone; logo tile
decorative; time is plain text, never badge-alone (badge hue + time text).
**Witness:** ref-01 list rows.

## KpiStat
**Purpose** — One headline number: value + total + delta. The `4/32 closed +2%`.
**Anatomy** — Baseline trio: `__value` (xl) · `__total` (muted) · `__delta` chip ·
`__spark` trailing sparkline slot (right-aligned, baseline).
**Variants** —

| Variant | Description | Key differences |
|---|---|---|
| default (delta up) | Improving metric | green 700 ink on green 100 |
| `kpi__delta--down` | Declining metric | red 700 ink on red 100 |
| `kpi--sm` / `kpi--lg` | Density sizes | md value / 2xl value + md total |

**States** — Static; delta direction is the only change.
**Token Usage** —

| Property | Token |
|---|---|
| value / total ink | `text.primary` / `text.muted`, `font-size.xl` value |
| delta up | `primitive.green.700` on `primitive.green.100`, `radius.full` |
| delta down | `primitive.red.700` on `primitive.red.100` |
| type | `font-weight.bold` value, `semibold` delta |
| chip padding / gap | `spacing.1` `spacing.2` (scaled from 2px — applied) |

FIX APPLIED: delta was tone-on-tone (up ~1.36, down ~2.0, sub-AA) — now follows
the badge ink scale (700-step ink on 100-step tint).
**Dos and Don'ts** — DO keep value/total/delta in that order; DO sign the delta
(`+2%`); DON'T add a second delta; DON'T use the delta chip outside a KPI.
**Accessibility** — Trio must read as one sentence to AT (value, total, delta);
delta never color-alone (signed text); sizes never drop the total.
**Witness:** ref-01 KPI strip.

## Timeline
**Purpose** — Event spine: dots on a rail, done vs todo. The blob report.
**Anatomy** — Rail (`::before`) · `__item` rows · `__dot` (hollow → filled done) ·
`__label` + right `__time`.
**Variants** —

| Variant | Description | Key differences |
|---|---|---|
| default (vertical) | Reading order spine | left rail, rows stack |
| `timeline--horizontal` | Stepper / progress axis | top rail, items in columns |
| `timeline--compact` | Dense activity feed | `spacing.1` row padding |
| `timeline__item--done` | Completed event | sapphire-filled dot |
| `--success` / `--warning` / `--danger` | Status tones | green-500 / orange-500 / red-500 ring + done fill |

**States** — Static; done/status is data, not interaction.
**Token Usage** —

| Property | Token |
|---|---|
| rail | `border.thin`, `border-width.thin` |
| dot ring / done fill | `primitive.sapphire-ui.400` + `bg.surface`, `radius.full` |
| status rings | `primitive.green.500` / `orange.500` / `red.500` |
| stroke scale | `border-width.thin` rail, `border-width.medium` dot ring |
| ink | `text.primary` / `text.muted` |

Deviation kept: `10px` dot/rail geometry and `6px` dot offset are off-scale —
kept pixel-identical (no spacing token fits).
**Dos and Don'ts** — DO right-align times; DO pair status dots with text;
DON'T use the rail without dots; DON'T invent new dot hues (three tones only).
**Accessibility** — List semantics (`role=list` / items); done state needs text,
not dot-alone, where status matters; horizontal variant keeps DOM order = time order.
**Witness:** ref-06 activity dots.

## Sparkline
**Purpose** — Gesture of momentum: bars in gem hues only, never chrome.
**Anatomy** — Bar row (flex) · base bars (amethyst-300) · `--accent` (500) ·
`--gem` (700) peaks · `--stroke` outline-bar style (transparent fill,
amethyst-400 `border-width.medium` ring, open bottom).
**Variants** —

| Variant | Description | Key differences |
|---|---|---|
| default | Momentum bars, 40px | amethyst-300 base |
| `sparkline--sm` / `--lg` | Sizes | 24px / 56px row height |
| `sparkline--stroke` | Outline bars (overlays) | transparent + medium amethyst-400 stroke |
| bar `--accent` / `--gem` | Peak emphasis | 500 / 700 fill |

**States** — Height animates (`transition.fast`); static otherwise.
**Token Usage** —

| Property | Token |
|---|---|
| bars | `primitive.amethyst.300` / `500` / `700` |
| stroke style | `border-width.medium` + `primitive.amethyst.400` |
| gap / caps | `spacing.1` / `radius.xs` (scaled from 3px / 2px — applied) |
| motion | `transition.fast` on height |

Gem hues quarantined to viz bars (quarantine gate, Task 17).
**Dos and Don'ts** — DO mark the peak (`--accent`/`--gem`); DON'T axis-label a
sparkline (use a chart); DON'T reuse gem bars for chrome fills.
**Accessibility** — Decorative: `aria-hidden` bars + table/data fallback beside
them. Semantic: `role=img` + `aria-label` summarizing the trend ("up 12% over 7d").
**Witness:** ref-11 viz.

## FunnelGlyph
**Purpose** — Funnel mark: 56px hero, 40px small, 32px inline. Measure-family visual.
**Anatomy** — Rounded tile + glyph (⬢) in bold display type.
**Variants** —

| Variant | Description | Key differences |
|---|---|---|
| default | Hero / card tile | 56px, `radius.lg`, `font-size.xl` |
| `funnel-glyph--small` | Strip / row tile | 40px, `font-size.md` |
| `funnel-glyph--xs` | Inline / chip-adjacent | 32px, `font-size.sm`, `radius.md` |

**States** — Static; always decorative.
**Token Usage** —

| Property | Token |
|---|---|
| tile / ink | `primitive.sapphire-ui.100` / `primitive.sapphire-ui.600`, `radius.lg` |
| type | `font-weight.bold`, `font-size` scale per size |
| geometry | 56/40/32px tile (avatar px-geometry pattern, not spacing) |

**Dos and Don'ts** — DO keep sapphire (funnel = measure, not celebration);
DON'T set the glyph in a gem hue; DON'T restyle per metric (one tile everywhere).
**Accessibility** — Decorative (`aria-hidden`); metric values are adjacent text;
sapphire-600 on sapphire-100 reads ~9 AAA.
**Witness:** ref-11 funnel.
