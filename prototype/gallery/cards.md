# Cards + viz — Opportunity / Funnel / Profile / GoalBar · §3 specs

Contracts in `src/components/*/*.css`. Gallery proof: `gallery.html` cards panel.
Shadow law (all cards): hairline border, zero `box-shadow` — cards never float.

## OpportunityCard
**Purpose** — One opportunity row's full story: who, stage, chance, value, next touch.
**Anatomy** — Logo (44px round) · name + product · stage rail (sapphire-400 name +
3px left rule) · sep ticks · chance (red-beryl) + value (sapphire, right) ·
segment bar (`__segs`, active sapphire-400) · contact stack · foot meta +
citrine distance · 44px icon action buttons.
**Variants** — Single variant; content drives emphasis (stage/chance/value hues).
**States** — Default | action-button hover/active wash | focus-visible ring
(`box-shadow: focus-ring`, no outline) | forced-colors (segment hairline).
**Token Usage** —

| Property | Token |
|---|---|
| frame / radius / padding | `bg.surface` / `radius.xl` / `spacing.4`, gaps `spacing.2–3` |
| frame border | `border.thin` + `border-width.thin` |
| name / product / meta ink | `text.primary` / `text.muted`, name `font-tracking.tight` |
| stage rail | `primitive.sapphire-ui.400` + `border-width.thick` rule |
| sep / segments | `primitive.sapphire-ui.200` / `100`, live `400` |
| chance / value | `primitive.red-beryl.400` / `primitive.sapphire-ui.500` |
| distance (sanctioned citrine datum) | `primitive.citrine.700` |
| stack overlap / ring | `-10px` kept, `border-width.medium` + `bg.surface` |
| action buttons | `bg.interactive`, 44px target, `radius.md` |
| focus | `focus.ring` |

Deviation (demo): gallery cards panel renders `__seg` / `__stats` classes that have
no CSS rules — realign the demo to this contract (`__segs`, stage/chance/value)
in Task 9. Deviation (CSS): `-10px` stack overlap and `6px` segment height are
off the 4px scale — kept pixel-identical, scale them in a visual-change task.
**Dos and Don'ts** — DO keep sapphire = stage, red-beryl = chance, citrine =
distance; DON'T shadow the card; DON'T add a second primary button (icon
actions only).
**Accessibility** — Card is an `article` with heading; segment bar needs
`role=progressbar` + `aria-valuenow` where live; 44px action targets; chance
red-beryl-400 on white AA (4.51, gated); value sapphire-500 on white AA (5.9).
**Witness:** ref-01/02/03 opportunity rows.

## FunnelCard
**Purpose** — Pipeline health at a glance: glyph + refresh stamp + metric strip.
**Anatomy** — 48px glyph tile · title + `Last Refreshed` meta · metric chips row.
**Variants** — Single variant; metrics use `badge--neutral`-style chips.
**States** — Static.
**Token Usage** —

| Property | Token |
|---|---|
| frame / radius | `bg.surface` / `radius.lg`, `border.thin` + `border-width.thin` |
| glyph tile | `primitive.sapphire-ui.100` / `primitive.sapphire-ui.500`, `radius.lg` |
| title / meta / metric ink | `text.primary` / `text.muted`, metric `bg.interactive` |

**Dos and Don'ts** — DO keep the glyph sapphire (funnel = measure family visual,
not gem celebration); DON'T put CR/RR/CSAT/NPS anywhere but the strip.
**Accessibility** — Glyph is decorative (`aria-hidden`); metric values are text.
**Witness:** ref-11 funnel.

## ProfileCard
**Purpose** — Person card: face, role, three proof stats. The Olivia pattern.
**Anatomy** — 64px round avatar · name + role · stat trio over a hairline rule.
**Variants** — Single variant.
**States** — Static.
**Token Usage** —

| Property | Token |
|---|---|
| frame / radius | `bg.surface` / `radius.lg`, `border.thin` + `border-width.thin` |
| avatar ring | `border.thin` + `border-width.thin` |
| stat rule | `border.thin` + `border-width.thin` |
| ink | `text.primary` / `text.muted` |

**Dos and Don'ts** — DO keep exactly three stats; DON'T left-align (centered card).
**Accessibility** — Photo `alt=""` (name is text beside it); stats are plain text.
**Witness:** ref-02 profile.

## GoalBar
**Purpose** — Temporal goal fill (D/W/M/Q/Y): label-left, value-right, time on top.
**Anatomy** — 28px pill track · fill (width %) · label + value overlaid ·
`goal-bar--gem` ceremony variant (amethyst-700 + ◇ mark).
**Variants** —

| Variant | Description | Key differences |
|---|---|---|
| default | Operate goal | amethyst-100 track, amethyst-400 fill, white value |
| `goal-bar--gem` | Ceremony/celebration only | amethyst-700 fill, ◇ mark, quarantined copy |

**States** — Fill width animates (`transition.spring`); gem variant never in
Operate chrome.
**Token Usage** —

| Property | Token |
|---|---|
| track / fill / radius | `primitive.amethyst.100` / `400` (gem `700`), `radius.full` |
| fill ink / type | `primitive.gray-white`, `font-size.xs`, `font-weight.semibold` |
| motion | `transition.spring` |

Deviation: xs fill text on the 400 step reads 4.14 — the AA-large exemption —
so small fill labels belong on `strong` (white on amethyst-500 AA, gated).
Visual change; recorded, not applied here. Gem hues stay quarantined to the
`--gem` variant (quarantine gate, Task 17).
**Dos and Don'ts** — DO keep label-left/value-right; DON'T use `--gem` outside
ceremony; DON'T restate the value beside the bar.
**Accessibility** — Fill needs `role=progressbar` + `aria-valuenow` + `aria-label`
where live; white on amethyst-400 is large/bold-only (see deviation).
**Witness:** ref-06 temporal goals.
