# Actions — Button · §3 spec

Contract for `src/components/Button/*` (`button.css` 20 lines + `button.js` 13 lines).
Gallery proof: `gallery.html` Actions panel (variants row, sizes + states row).

## Button
**Purpose** — The single high-emphasis tap in a row; carries the row's primary action.
**Anatomy** — Frame (44px md, transparent 1px border holds size across variants) ·
label · optional leading icon (`.btn__icon`) · loading spinner (`.btn__spinner`).
Renders as `<button>` or `a.btn`.
**Variants** —

| Variant | Description | Key differences |
|---|---|---|
| primary | Sole high-emphasis per row | sapphire-500 fill, white ink |
| secondary | Default chrome action | surface fill, ink text, thin border |
| ghost | Tertiary / inline action | transparent, sapphire-500 text |
| destructive | Irreversible action | red-500 fill, white ink |
| sm / md / lg | Density sizes | 32 / 44 / 48px frame, xs/sm/md type |

**States** — Default | Hover (one step deeper: primary 600, ghost sapphire-100 wash,
destructive red-600) | Active (primary 700; destructive holds hover) |
Focus (`focus-visible` 2px sapphire-400 ring, 2px offset) |
Disabled (native `disabled`, `opacity-disabled`, no pointer) |
Loading (`data-loading` demo: `aria-busy`, spinner, no pointer, dim .85 —
proposed token `opacity.loading`, surfaced not invented).
**Token Usage** —

| Property | Token |
|---|---|
| primary fill / ink | `primitive.sapphire-ui.500` / `primitive.gray-white` |
| primary hover / active | `primitive.sapphire-ui.600` / `primitive.sapphire-ui.700` |
| secondary fill / ink / border | `bg.surface` / `text.primary` / `border.thin` |
| ghost ink / hover wash | `primitive.sapphire-ui.500` / `primitive.sapphire-ui.100` |
| destructive fill / hover | `primitive.red.500` / `primitive.red.600` |
| frame radius / gap / padding | `radius.md` / `spacing.2` / `spacing.3–6` |
| border width / icon box | `border-width.thin–medium` / `icon-size.sm` |
| focus ring | `primitive.sapphire-ui.400` |
| disabled dim | `opacity.disabled` |
| motion | `transition.fast` |

Deviation (kept pixel-identical here): fills point at primitives, but Color Law 03
says code touches `role.*` — roles ship soft/base/strong/ink only, so the 100/600/700
steps have no role alias. Gap, not a fix in this task.
**Dos and Don'ts** — DO keep one primary per row; DO keep sapphire the sole action
hue; DON'T add shadow to "pop"; DON'T use ghost for a primary action.
**Accessibility** — md frame meets the 44px target; native button/link semantics;
`focus-visible` ring always; loading sets `aria-busy=true`; contrast gated
(white on sapphire-500 AA, `tests/contrast.test.mjs`).
**Witness:** ref-01 page actions.
