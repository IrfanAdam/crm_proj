# Actions — Button · §3 spec

Contract for `src/components/Button/*` (base + variants,
`button.css` barrel, `button.js`).
Gallery proof: `gallery.html` Actions panel (variants row,
sizes + states row).

## Button
**Purpose** — The single high-emphasis tap in a row; carries
the row's primary action.
**When to use** — One primary action per row or dialog footer:
submitting forms, confirming dialogs, advancing flows.
**When not to use** — Navigation (use links); icon toolbars
without labels (use icon-only sparingly); toggle or selection
state (use chips/switch); 3+ options (use a menu).
**Anatomy** — Frame (sm 32 / md 44 / lg 48px; transparent 1px
border holds size across variants) · label · optional leading
icon (`.btn__icon`, 16px) · loading spinner (`.btn__spinner`,
12px) · min-width 64px (`spacing-16`). Renders as `<button>`
or `a.btn`.
**Variants** —

| Variant | Use | Key differences |
|---|---|---|
| primary | Sole high-emphasis per row | `role-action` fill, action ink |
| secondary | Default chrome action | `bg-surface`, ink text, thin border |
| ghost | Tertiary / inline action | transparent, `role-action` text |
| destructive | Irreversible action | `role-danger` fill, danger ink |
| tonal | Medium-emphasis alt to primary | `role-action-soft` fill, gray-900 ink |
| danger-ghost | Tertiary destructive (row delete) | transparent, `role-danger` text |
| icon-only | Toolbar / close affordance | square, no padding, 16px icon |
| full-width | Stacked mobile / dialog CTA | `width:100%` |
| sm / md / lg | Density sizes | 32 / 44 / 48px frame, xs/sm/md type |

**States** —

| State | Visual | Keyboard / ARIA |
|---|---|---|
| default | Variant fill + ink | Focusable, `Enter`/`Space` activates |
| hover | One step deeper (strong, wash, danger-strong) | — |
| active | Primary sapphire-700; destructive holds hover | — |
| focus-visible | `focus-ring` shadow + sapphire-400 outline | Tab reaches; ring always shown |
| disabled | Native `disabled`, dim, no pointer | Out of tab order, no events |
| aria-disabled | Same dim, `cursor:not-allowed` | Focusable; announces dimmed |
| loading | Spinner swaps label, frame held, dim | `aria-busy=true`; input ignored |

Skeleton rule: loading keeps frame size (spinner replaces label
in place), so rows never shift while waiting.
**Token Usage** —

| Property | Token |
|---|---|
| primary fill / ink | `role-action` / `role-action-ink` |
| primary hover / active | `role-action-strong` / `sapphire-ui-700` |
| secondary fill / ink / border | `bg-surface` / `text-primary` / `border-thin` |
| secondary hover / active | `bg-interactive-hover` / `bg-interactive-active` |
| ghost ink / hover / active | `role-action` / `sapphire-ui-100` / `-200` |
| destructive fill / ink / hover | `role-danger` / `role-danger-ink` / `-strong` |
| tonal fill / ink | `role-action-soft` / `primitive-gray-900` |
| danger-ghost ink / hover wash | `role-danger` / `primitive-red-50` |
| frame radius / gap / padding | `radius-md` / `spacing-2` / `spacing-0/3/4/6` |
| min-width / icon / spinner | `spacing-16` / `icon-size-sm` / `icon-size-xs` |
| border width / focus ring | `border-width-thin/medium` + `focus-ring` |
| disabled / loading dim | `opacity-disabled` / `opacity-subtle` |
| motion / spinner sweep | `transition-fast` / `motion-duration-xl` |

Deviation (kept, token-level): fills point at primitives where
roles ship no step (100/200 washes, sapphire-700 active) —
Color Law 03 gap, roles cover soft/base/strong/ink only.
**Dos and Don'ts** —

- DO keep one primary per row; pair with secondary/ghost only.
- DO keep sapphire the sole action hue; red is destructive-only.
- DON'T add shadow to "pop" a button; fill rank gives emphasis.
- DON'T use ghost (or danger-ghost) for a primary action.

**Accessibility** — md frame meets the 44px target (min-height
44px); sm stays 32px, so reserve it for repeating rows, never
the primary CTA. Native button/link semantics; `focus-visible`
ring always. Loading sets `aria-busy=true`; `aria-disabled`
keeps focus while announcing dimmed. Contrast pairs gated
(`tests/contrast.test.mjs`): white on `role-action`, gray-900
on tonal, danger-ink on `role-danger`. Spinner halts under
`prefers-reduced-motion`; `forced-colors:active` maps fills to
`ButtonFace`/`ButtonText` with `Highlight` focus.
**Witness:** ref-01 page actions.
