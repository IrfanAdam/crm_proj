# Identity — Chip / Badge / StatusPill / Avatar · §3 specs

Gallery proof: `gallery.html` Identity panel. Icon ships in Task 11 — untouched below.

## Chip
**Purpose** — Filter or countable facet the user toggles; the Opps filter row.
**Anatomy** — Full-pill frame · label · optional count (`.chip__count`) ·
optional face stack (`.chip--faces`, 44px).
**Variants** —

| Variant | Description | Key differences |
|---|---|---|
| default | Unselected filter | surface fill, thin border |
| `chip--active` | Selected filter | black fill, white ink |
| `chip--hot` | Live streak facet (Opps) | 2px ink border law, bold label |
| `chip--faces` | People facet (Opps) | 44px frame, mini-stack + flame |

**States** — Default | Hover (interactive-hover wash) | Active (`chip--active` fill) |
Focus (`focus-visible` 2px sapphire-400 ring) | Disabled (`opacity-disabled`, no pointer).
**Token Usage** —

| Property | Token |
|---|---|
| frame / radius / padding | `bg.surface` / `radius.full` / `spacing.2–3` |
| border / hot border width | `border.thin` / `border-width.medium` + `border.accent` |
| text / count dim | `text.primary` / `opacity.subtle` |
| active fill / ink | `primitive.gray-black` / `primitive.gray-white` |
| faces padding | `spacing.3` / `spacing.2` |
| disabled dim | `opacity.disabled` |
| motion | `transition.fast` |

Deviation: `button.js` toggles `chip--active` with no `aria-pressed` sync —
correct by syncing pressed state in `button.js` (JS scope, not this task).
**Dos and Don'ts** — DO use pills for countable/filterable facets; DO reserve
`chip--hot` for the live streak; DON'T use gem hues for chip chrome.
**Accessibility** — Native `<button>`; 44px `chip--faces` target; `focus-visible`
ring; pressed state must be announced (see deviation).
**Witness:** ref-01 chips.

## Badge
**Purpose** — Unread/count glyph beside a label; never carries meaning alone.
**Anatomy** — 20px pill · bold micro count · tinted fill + darker ink + matching border.
**Variants** —

| Variant | Description | Key differences |
|---|---|---|
| default | Brand count | sapphire-100 / sapphire-700 / sapphire-200 |
| `badge--neutral` | Muted count | interactive / secondary / thin |
| `badge--success` | Positive count | green-100 / green-700 / green-200 |
| `badge--warning` | Attention count | orange-100 / orange-700 / orange-200 |
| `badge--danger` | Error count | red-100 / red-700 / red-200 |

**States** — Static (no hover/active/disabled; inherits context).
**Token Usage** —

| Property | Token |
|---|---|
| fills / inks / borders | `primitive.{sapphire-ui,green,orange,red}.*` + `bg.interactive`, `text.secondary`, `border.thin` |
| radius / padding / border width | `radius.full` / `spacing.2` / `border-width.thin` |
| type | `font-size.xs`, `font-weight.bold` |

**Dos and Don'ts** — DO pair with a label; DON'T use as a status word (use StatusPill).
**Accessibility** — Expose the count where context is unclear (`aria-label`);
tint + dark ink keeps micro type readable.
**Witness:** ref-01 badges.

## StatusPill
**Purpose** — Record status as solid fill + uppercase label; never color-alone.
**Anatomy** — Pill frame · uppercase micro label · solid variant fill.
**Variants** —

| Variant | Description | Key differences |
|---|---|---|
| `status-pill--accepted` | Won / done | green-300 fill, ink text |
| `status-pill--progress` | In flight | sapphire-500 fill, white text |
| `status-pill--review` | Needs eyes | sapphire-100 fill, sapphire-600 text |
| `status-pill--new` | Fresh record | neutral-dark-700 fill, white text |
| `status-pill--warning` | Caution | orange-400 fill, ink text |
| `status-pill--danger` | Blocked / lost | red-400 fill, white text |

**States** — Static; label text carries meaning in every state.
**Token Usage** —

| Property | Token |
|---|---|
| fills / inks | variant ramp steps + `primitive.ink` / `primitive.gray-white` |
| radius / tracking | `radius.full` / `font-tracking.wide` |
| border width / type | `border-width.thin` / `font-size.xs`, `font-weight.semibold` |

Deviation: `6px` vertical padding is off the 4px spacing scale — kept pixel-identical;
correct to a scale step in a visual-change task, not here.
**Dos and Don'ts** — DO always show the label; DON'T invent new status hues
(map to the six); DON'T use for counts (use Badge).
**Accessibility** — Status never color-alone (label + variant); gated pairs hold
(ink on green-300 AA, ink on orange-400 AA, `tests/contrast.test.mjs`).
**Witness:** ref-02 status.

## Avatar
**Purpose** — Person mark: initials or photo, with presence and stacking.
**Anatomy** — Round frame · initials or `img` · optional online dot ·
stack overlap in `.avatar-stack`.
**Variants** — `avatar--sm/md/lg/xl`: 24 / 32 / 48 / 64px frames.
**States** — Default | `avatar--online` (green-300 dot, surface ring).
**Token Usage** —

| Property | Token |
|---|---|
| frame / fill / border | `radius.full` / `bg.interactive` / `border.thin` |
| text | `text.primary`, `font-weight.semibold` |
| stack overlap | `spacing.2` negative |
| online dot fill / ring / size | `primitive.green-300` / `bg.surface` / `spacing.2` |

**Dos and Don'ts** — DO overlap stacks by one spacing step; DON'T crop faces
(`object-fit: cover`); DON'T use the dot without the surface ring.
**Accessibility** — Decorative photos carry `alt=""`; initials are text, not image.
**Witness:** ref-01 avatar stack.

## Icon (Task 11 — unchanged)
Phosphor Regular → Fill (`Icon.jsx` + web CDN, regular 1.5px unselected, fill +
signal on selected); legacy `sprite.svg` (13 lines, 8 symbols) deprecated, fallback
only — new work never uses `<use href="sprite.svg">`.
