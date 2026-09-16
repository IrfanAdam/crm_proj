# Form — TextInput / Select / Search / Textarea

**Anatomy:** label (`field__label` 12 medium) + wrap/input (`field__input` 44px tall, 12px radius, hairline → focus 2px sapphire) + prefix/suffix slots (₹/L) + help/error. Variants: pill search (`search__input` full-pill) vs 12px inputs; textarea.

**Witness:** P2 form depth (Operate).

**A11y:** `label` association (`for` or wrapped), `aria-describedby` for help/error, `aria-invalid` on error, `aria-label` on search clear/chevron.

**Tokens:** `var(--spacing-2)` gap, `var(--radius-md)`, `var(--border-thin)`, `var(--focus-ring)`, 4.5:1 text.