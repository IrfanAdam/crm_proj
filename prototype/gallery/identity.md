# Identity — Chip / Badge / StatusPill / Avatar · §3 specs

Gallery proof: `gallery.html` Identity panel. Icon ships in Task 11 — untouched below.

## Chip
**Purpose** — M3 compact element for a filter choice, an action, a text
snippet, or a suggestion; the Opps filter row. Carbon sibling: `Tag`.
**Anatomy** — Full-pill frame · optional leading icon (`icon-size.sm` box) · label · optional count (`.chip__count`) · optional
trailing remove button (`.chip__close`, input type only) · optional face
stack (`.chip--faces`, 44px). `chip--assist` / `chip--filter` share the base
outlined chrome below — the classes are semantic hooks (JS/a11y), not visual
overrides.
**Variants (M3's 4 types)** —

| Variant | Description | Key differences |
|---|---|---|
| `chip--assist` | One-tap action (e.g. "Add filter") | base chrome; hook class |
| `chip--filter` | Selectable facet (Opps filters) | base chrome + checkmark icon when selected |
| `chip--input` | Entered value / recipient | `bg.interactive` fill, trailing `.chip__close` |
| `chip--suggestion` | Low-emphasis AI/hint pick | tonal fill, transparent border, secondary ink |
| `chip--selected` (`chip--active` legacy alias) | Chosen state | black fill, white ink |
| `chip--hot` | Live streak facet (Opps) | 2px ink border law, bold label |
| `chip--faces` | People facet (Opps) | 44px frame, mini-stack + flame |

**Sizes** — `chip--sm` 24px frame / xs type (dense rows); default md 32px
frame / sm type (md = base `.chip`, no modifier needed).
**Deletable** — Input chips only: trailing `.chip__close` (`16px` hit box
inside the 32px chip); Delete/Backspace while the chip is focused removes
it; removal moves focus to the next chip (or the input).
**States** — Default | Hover (`bg.interactive-hover` wash; selected hovers
one step to `neutral-dark-600`) | Active press (`bg.interactive-active`) |
Focus (`focus-visible` 2px sapphire-400 ring, 2px offset) | Disabled
(native `disabled` or `aria-disabled`, `opacity-disabled`, no pointer) |
Drag (`chip--dragging`: elevated surface + `shadow-md`, grabbing cursor —
grab source keeps its label, drop target shows the wash).
**Token Usage** —

| Property | Token |
|---|---|
| frame / radius / padding | `bg.surface` / `radius.full` / `spacing.2–3` |
| border / hot border width | `border.thin` / `border-width.medium` + `border.accent` |
| text / count dim | `text.primary` / `opacity.subtle` |
| selected fill / ink | `primitive.gray-black` / `primitive.gray-white` |
| suggestion fill / ink | `bg.interactive` / `text.secondary` |
| faces frame | 44px touch target, `spacing.2–3` |
| disabled dim | `opacity.disabled` |
| drag lift | `bg.surface-elevated` + `shadow.md` |
| motion | `transition.fast` (none under reduced-motion) |

Deviation: `button.js` toggles `chip--active` with no `aria-pressed` sync —
correct by syncing pressed state in `button.js` (JS scope, not this task).
**Dos and Don'ts** — DO use `chip--filter` + `aria-pressed` for toggle
facets; DO reserve `chip--input` + close button for removable values; DO
keep one label + at most one adornment per chip; DO reserve `chip--hot`
for the live streak. DON'T use gem hues for chip chrome; DON'T put a close
button on assist/filter/suggestion chips; DON'T wrap chip labels to two
lines; DON'T use a chip where a Button (action) or Badge (count) belongs.
**Accessibility** — Native `<button>` (or `role=checkbox` + `aria-checked`
in multi-filter groups); `aria-pressed` mirrors selected; input chips
delete via Delete/Backspace with focus moved on removal; close button has
`aria-label="Remove …"`; 44px `chip--faces` target; `focus-visible` ring;
forced-colors maps selected to CanvasText/Canvas; ink pairs gated
(`tests/contrast.test.mjs`).
**Witness:** ref-01 chips.

## Badge
**Purpose** — Unread/count glyph beside a label or anchored to an object;
never carries meaning alone. Carbon sibling: `Tag` count / `OverflowMenu`
badge.
**Anatomy** — Pill frame · bold micro count · tinted fill + darker ink +
matching border; or a bare 8px `.badge--dot` with no text.
**Variants (all 5 tones)** —

| Variant | Description | Key differences |
|---|---|---|
| default | Brand count | sapphire-100 / sapphire-700 / sapphire-200 |
| `badge--neutral` | Muted count | interactive / secondary / thin |
| `badge--success` | Positive count | green-100 / green-700 / green-200 |
| `badge--warning` | Attention count | orange-100 / orange-700 / orange-200 |
| `badge--danger` | Error count | red-100 / red-700 / red-200 |

**Sizes** — `badge--sm` 16px frame (dense lists, icon anchors); default md
20px frame (md = base `.badge`, no modifier needed). Dot is a fixed 8px
circle in every size (`.badge--dot`, text omitted).
**Max-count** — Counts cap at `99+` (`.badge--max`, tabular numerals keep
the pill width stable); JS truncates, CSS guarantees the pill never wraps.
**Positioning** — Standalone: inline-flex beside its label, flows with text.
Overlap: `.badge-wrap` (relative anchor) + `.badge--overlap` pinned
top-right (`translate(50%,-50%)`) over icons/avatars; the pill's own border
draws the separation ring, so no extra halo token is needed.
**States** — Static only: no hover/active/disabled/focus. A badge is never
interactive — it inherits its context's state (the button or row around
it). Giving it hover or focus would promise an action it must not own;
keyboard users reach the anchor, never the badge.
**Token Usage** —

| Property | Token |
|---|---|
| fills / inks / borders | `primitive.{sapphire-ui,green,orange,red}.*` + `bg.interactive`, `text.secondary`, `border.thin` |
| radius / padding / border width | `radius.full` / `spacing.1–2` / `border-width.thin` |
| type / max-count numerals | `font-size.xs`, `font-weight.bold`, tabular-nums |
| overlap offset | `translate(50%,-50%)` off the anchor corner |

**Dos and Don'ts** — DO pair every badge with a visible label or anchored
object; DO cap at `99+`; DO use the dot only for presence (no count); DO
use `badge--overlap` for icon/avatar anchors. DON'T use as a status word
(use StatusPill); DON'T make a badge focusable or clickable; DON'T invent
a sixth tone (map to the five); DON'T show an exact 4-digit count (cap it).
**Accessibility** — Redundant badge (label already says the count) is
`aria-hidden="true"`; standalone badge (count unclear from context) gets
`aria-label` (e.g. `aria-label="5 unread"`); dot always needs a text twin
elsewhere; tint + dark ink keeps micro type readable (gated in
`tests/contrast.test.mjs`); forced-colors flattens to Canvas/CanvasText so
the count survives without hue.
**Witness:** ref-01 badges.

## StatusPill
**Purpose** — Record stage flag (Accepted / In Progress / Review / New /
Warning / Danger); solid fill + uppercase label + optional icon/dot. Never
color-alone: the label (and icon/dot) carries meaning in every state.
**Anatomy** — Pill frame · optional leading `status-pill__icon` (Phosphor,
`icon-size-xs`) or `status-pill__dot` (currentColor) · uppercase micro label.
**Variants** —

| Variant | Description | Key differences |
|---|---|---|
| `status-pill--accepted` | Won / done | green-300 fill, ink text |
| `status-pill--progress` | In flight | sapphire-500 fill, white text |
| `status-pill--review` | Needs eyes | sapphire-100 fill, sapphire-600 text, sapphire-300 border |
| `status-pill--new` | Fresh record | neutral-dark-700 fill, white text |
| `status-pill--warning` | Caution | orange-400 fill, ink text |
| `status-pill--danger` | Blocked / lost | red-400 fill, white text |
| `status-pill--sm` | Compact (dense rows) | spacing-1 / spacing-2 padding |
| `status-pill--md` | Default size | 6px / spacing-3 padding (base) |
| `status-pill__icon` | Icon prefix | 12px Phosphor, inherits ink |
| `status-pill__dot` | Dot prefix | 8px currentColor dot |

**States** — Static by default (no hover). `status-pill--clickable` adds
pointer + `opacity-subtle` hover — hover ONLY when clickable. Focus
(`focus-visible` 2px sapphire-400 ring). Disabled (`opacity-disabled`,
no pointer).
**Token Usage** —

| Property | Token |
|---|---|
| fills / inks | variant ramp steps + `primitive.ink` / `primitive.gray-white` |
| border (transparent base) | `border-width.thin` + `color.transparent` |
| radius / tracking | `radius.full` / `font-tracking.wide` |
| type | `font-size.xs`, `font-weight.semibold` |
| gap / padding | `spacing.1` / `spacing.3` (sm: `spacing.1` / `spacing.2`) |
| icon / dot size | `icon-size.xs` / `spacing.2` |
| hover / focus / disabled | `opacity.subtle` / sapphire-400 ring / `opacity.disabled` |
| motion | `transition.fast` |

Deviation: `6px` vertical padding is off the 4px spacing scale — kept pixel-identical;
correct to a scale step in a visual-change task, not here.
**Dos and Don'ts** — DO always show the label (never color-alone); DO use the
icon or dot prefix when scanning speed matters; DO reserve hover for clickable
pills; DON'T invent new status hues (map to the six); DON'T use for counts
(use Badge); DON'T use for filters (use Chip).
**Accessibility** — Status never color-alone (label + variant + optional
icon/dot); gated pairs hold (ink on green-300 AA, ink on orange-400 AA,
`tests/contrast.test.mjs`). Clickable pills are native `<button>`/`<a>` with
an accessible name = label text; decorative prefix icons carry
`aria-hidden="true"`.
**Witness:** ref-02 status.

## Avatar
**Purpose** — Person mark: initials fallback or photo, with presence and
stacking. Round only — never square or squircle.
**Anatomy** — Round frame · initials text (fallback) or `img` (photo) ·
optional presence dot (`avatar--online` / `avatar--offline`) · stack overlap
in `.avatar-stack` with surface ring.
**Variants** —

| Variant | Frame | Type |
|---|---|---|
| `avatar--xs` | 20px (`spacing.5`) | `type.micro` |
| `avatar--sm` | 24px (`spacing.6`) | `font-size.xs` |
| `avatar--md` | 32px (`spacing.8`, base) | `font-size.sm` |
| `avatar--lg` | 48px (`spacing.12`) | `font-size.xl` |
| `avatar--xl` | 64px (`spacing.16`) | `font-size.2xl` |
| initials | Fallback when no photo | 1–2 chars, semibold |
| `img` | Photo when available | `object-fit: cover`, never cropped face |
| `.avatar-stack` | Face pile | one-step overlap + surface ring |
| `avatar--online` | Available | green-300 dot + surface ring |
| `avatar--offline` | Away / inactive | dim dot + surface ring |

**States** — Default. `avatar--clickable` adds pointer + `border-accent`
hover — hover ONLY when clickable. Focus (`focus-visible` 2px sapphire-400
ring). Disabled (`opacity-disabled`, no pointer).
**Token Usage** —

| Property | Token |
|---|---|
| frames | `spacing.5 / 6 / 8 / 12 / 16` (xs / sm / md / lg / xl) |
| frame / fill / border | `radius.full` / `bg.interactive` / `border-width.thin` + `border.thin` |
| text | `text.primary`, `font-family.sans`, `font-weight.semibold` |
| stack overlap / ring | `spacing.2` negative / `border-width.medium` + `bg.surface` |
| online dot fill / ring / size | `primitive.green-300` / `bg.surface` / `spacing.2` |
| offline dot fill | `text.dim` |
| hover / focus / disabled | `border.accent` / sapphire-400 ring / `opacity.disabled` |
| motion | `transition.fast` |

**Dos and Don'ts** — DO overlap stacks by one spacing step; DO keep the
surface ring on stacked avatars and presence dots; DO use initials when no
photo; DON'T crop faces (`object-fit: cover`); DON'T use the dot without the
surface ring; DON'T use presence color alone to mean availability in text
contexts.
**Accessibility** — Decorative photos carry `alt=""`; initials are text, not
image. Presence dots are decorative — announce status in text
(`aria-label="Online"` on the avatar or adjacent status text), never by dot
color alone. Clickable avatars are native `<button>`/`<a>` with an accessible
name (person name).
**Witness:** ref-01 avatar stack.

## Icon
**Purpose** — Phosphor-only icon system (`Icon.jsx` registry + web CDN).
Regular 1.5px stroke unselected; Fill + signal on selected. Legacy
`sprite.svg` deprecated, fallback only — new work never uses
`<use href="sprite.svg">`.
**Anatomy** — `.icon` frame (currentColor) · Phosphor `svg` at 100% ·
optional size modifier · decorative (`aria-hidden`) or semantic (named).
**Variants** —

| Variant | Size | Token |
|---|---|---|
| `icon--xs` | 12px | `icon-size.xs` |
| `icon--sm` | 16px | `icon-size.sm` |
| `icon--md` | 20px (base, no modifier) | `icon-size.md` |
| `icon--lg` | 24px | `icon-size.lg` |
| `icon--xl` | 32px | `icon-size.xl` |
| regular weight | Default 1.5px stroke | `Icon.jsx` `weight="regular"` |
| fill weight | Selected / emphasis only | `Icon.jsx` `weight="fill"` |
| bold weight | High-emphasis only | `Icon.jsx` `weight="bold"` |
| `icon--muted` | Secondary ink | `text.muted` |
| `icon--subtle` | Faint ink | `text.dim` |

**States** — Static (inherits context color); no hover/active/disabled of its
own. Selected state = fill weight + signal color via `Icon.jsx`.
**Token Usage** —

| Property | Token |
|---|---|
| sizes | `icon-size.xs / sm / md / lg / xl` |
| ink | `currentColor` (inherits context) |
| muted / subtle | `text.muted` / `text.dim` |

**Dos and Don'ts** — DO use Phosphor only (registry in `Icon.jsx`); DO mark
decorative icons `aria-hidden="true"`; DO reserve fill weight for selected
state; DON'T use `sprite.svg` in new work; DON'T use icons color-alone for
meaning (pair with label or accessible name); DON'T invent sizes off the
xs–xl scale.
**Accessibility** — Decorative icons: `aria-hidden="true"`, never focusable.
Semantic icons: exposed via the control's accessible name (e.g. button
`aria-label`) or `role="img"` + `aria-label` when standalone. Icon color never
carries meaning alone — contrast follows the surrounding text pair.
**Witness:** gallery Avatar + stack + icons row.
