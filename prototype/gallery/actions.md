# Actions — Button · Contract

**Component:** `src/components/Button/*` (21 lines CSS + 14 lines JS). Variants: primary (sapphire-500 white), secondary, ghost, destructive; sizes sm 32 / md 44 / lg 48; states: disabled, loading (`aria-busy`, spinner 1.5s), focus-visible 2px sapphire ring.

**Usage:** Primary is sole high-emphasis per row; ghost for tertiary; never more than one primary in a row.

**Do/Don’t:** DO keep sapphire for action alone; DON’T add shadow to “pop”.

**Witness:** ref-01 page actions.

**A11y:** `tabindex` 44px tap, `focus-visible` ring `var(--focus-ring)`, `disabled` + `aria-disabled`, loading `aria-busy=true`.

**Tokens:** `var(--primitive-sapphire-ui-500)`, `var(--radius-md)`, `var(--spacing-*)`, `var(--transition-fast)`.