# Form — TextInput / Select / Search / Textarea

Contracts for `src/components/TextInput/text-input.css`,
`src/components/Select/select.css`, `src/components/Search/search.css`,
`src/components/Textarea/textarea.css`.
Gallery proof: `gallery.html` form panel (name, amount-error with ₹/L affixes,
Stage select, pill search, notes textarea, disabled).
Bar: Material 3 text fields (outlined + filled, focus indicator) + Carbon
(label/help/error pattern, 44px target).

Shared: md frame is 44px tall (touch target); focus is affine-border change +
`focus.ring`; `forced-colors` restores a `CanvasText` outline (box-shadows are
invisible there); `prefers-reduced-motion` kills transitions and the search spin.

## TextInput

**When to use** — Single-line free text: names, amounts, emails, quantities.
**When not** — Constrained choice (use Select / Radio / Checkbox); search
(use Search); multi-line (use Textarea); dates/numbers with steppers (native
input types, same `.field__input` skin).

**Anatomy** — `.field` (column, `spacing.2` gap) · `.field__label` (xs,
semibold, uppercase, wide tracking) · `.field__wrap` (relative anchor) ·
`.field__input` (44px, `radius.md`, hairline → focus sapphire-400 + ring) ·
`.field__prefix` / `.field__suffix` (absolute 16px slots, ₹/L, icon, or
action) · `.field__help` / `.field__error` (xs meta under the frame).

**Variants** —

| Variant | Description | Key differences |
|---|---|---|
| outlined (default) | Default entry | `bg.surface`, `border.thin` hairline |
| `field__input--filled` | Dense/filter chrome | `bg.interactive` wash, transparent border |
| `field__input--sm / --lg` | Density sizes | 32px (`spacing.8`, xs type) / 48px (`spacing.12`, md type) |
| `field__input--with-prefix / --with-suffix` | Affix room | `calc(spacing.3 + icon-size.sm + spacing.2)` pad |
| `field--loading` | Async submit guard | `progress` cursor on the input |

**States** —

| State | Visual | ARIA / markup |
|---|---|---|
| default | hairline `border.thin` | `label[for]` or wrapped label |
| hover | one step deeper `border.medium` | — |
| focus | sapphire-400 border + `focus.ring` shadow | visible on `:focus`, not only keyboard |
| focus-within | affix slots tint `role.action` | wrapper-level, input keeps ring |
| disabled | `opacity.disabled`, not-allowed, muted ink, interactive fill | native `disabled` |
| readonly | dashed hairline, default cursor | native `readonly` (value still submitted/focusable) |
| error | `role.danger` border; focus swaps ring for danger outline + offset | `aria-invalid="true"`, `aria-describedby` → error id |
| success | `role.success` border; focus swaps ring for success outline | `aria-describedby` → confirmation id |
| loading | `progress` cursor | `aria-busy="true"`, keep label, block submit |
| placeholder | `text.muted` at full opacity | never a label replacement |
| autofill | ink forced to `text.primary`, surface flood (see deviation) | UA `:-webkit-autofill` + `:autofill` |

**Token Usage** —

| Property | Token |
|---|---|
| frame / radius / gaps | `bg.surface` / `radius.md` / `spacing.2`, pads `spacing.3` |
| frame border (all widths) | `border.thin` + `border-width.thin`, hover `border.medium` |
| label / input / help ink | `text.secondary` / `text.primary` / `text.muted` |
| affix ink / focus tint | `text.muted`, `text.secondary`; focus-within `role.action` |
| focus border + ring | `primitive.sapphire-ui.400` + `focus.ring` |
| error / success | `role.danger` / `role.success` (focus: width-medium outline + offset) |
| disabled dim / filled wash | `opacity.disabled` / `bg.interactive`, transparent `color.transparent` |
| sizes | sm `spacing.8`, md 44px raw (deviation), lg `spacing.12` |
| icon box / motion | `icon-size.sm` / `transition.fast` |

**Dos and Don'ts** — DO keep every input labelled; DO put errors in
`.field__error` with `aria-describedby`, not color alone; DO keep md at 44px;
DON'T use placeholder as the label; DON'T disable without saying why nearby;
DON'T invent a second error hue (danger only).

**Accessibility** — Label association (`for` or wrapped); error sets
`aria-invalid` + `aria-describedby`; success/error text is never color-alone
(icon + text); md frame meets the 44px target; ink pairs gated
(`text.muted` on paper, `role.danger` AA per `tests/contrast.test.mjs`);
forced-colors outline; reduced-motion still.

## Select

**When to use** — 4+ mutually exclusive options where the current value must
stay visible (Stage: Prospecting → Closed). **When not** — ≤3 options
(Radio, all visible); multi-select (Checkbox); free text with suggestions
(Search + listbox, not a select).

**Anatomy** — `.select` (relative flex anchor) · `.select__input` (native
`<select>`, same 44px/`radius.md` frame, right pad for chevron) ·
`.select__chevron` (16px, `pointer-events:none`, rotates 180° on
focus-within) · native `option` (surface wash, primary ink).

**Variants** — outlined (default) · `--filled` · `--sm / --lg` (32/48px, same
scale as TextInput). No pill select — pill is Search-only.

**States** — Same table as TextInput (default / hover / focus ring /
disabled / readonly-dashed / error-outline / success-border), plus: chevron
tints `role.action` + rotates while open (`:focus-within` proxy — native
`<select>` exposes no open state in CSS); `option` inherits surface/ink in
both themes.

**Token Usage** — Frame/border/radius/sizes/focus/disabled/error/success map
1:1 to the TextInput table; chevron `text.muted` → `role.action` open,
`icon-size.sm`, `transition.fast`.

**Dos and Don'ts** — DO keep the native `<select>` (free keyboard + mobile
sheet); DO give it an accessible name (`aria-label` or `.field__label`);
DON'T fake a select with divs; DON'T hide the chevron.

**Accessibility** — Native semantics (screen readers announce options +
count); chevron `aria-hidden`; 44px frame; `aria-invalid` + `aria-describedby`
on error exactly like TextInput; forced-colors outline; reduced-motion still
(no rotate animation, instant flip).

## Search

**When to use** — Filtering/finding within the dataset (opportunities, list
rows) with a clear action. **When not** — As a labelled data-capture field
(use TextInput); as navigation (use links/tabs); with a submit button beside
it (⏎ submits, clear resets).

**Anatomy** — `.search` (relative flex anchor) · `.search__input` (always
`radius.full` pill, 44px, left pad for icon) · `.search__icon` (16px leading,
decorative) · `.search__clear` (24px round button, interactive wash,
`aria-label="Clear"`).

**Variants** — Single pill variant; sm/lg intentionally absent (search is
always the 44px filter affordance). `--error` / `--success` borders only for
no-results / applied-filter confirmation states.

**States** — TextInput table (default / hover / focus ring / disabled /
readonly-dashed / error-outline / success-border) plus: clear hover
(primary ink on `bg.interactive-active` wash) · clear `focus-visible`
(sapphire width-medium outline + offset) · `search--loading` (icon spins,
`motion-duration.md`, `linear`, infinite; cursor stays text).

**Token Usage** — As TextInput, except radius is always `radius.full`;
clear is `icon-size.lg` box, `bg.interactive` → hover `bg.interactive-active`,
`radius.full`, `transition.fast`; spin `motion-duration.md`.

**Dos and Don'ts** — DO show clear only when there is text; DO keep the pill
(filter affordance, never 12px); DO announce result counts via live region;
DON'T put help text inside the pill; DON'T use search as a generic input.

**Accessibility** — Input needs a label (`for`/wrapped/`aria-label`); icon
`aria-hidden`; clear is a real `<button aria-label="Clear">` (24px visual
inside the 44px field — target met by the field, flag before shrinking);
loading sets `aria-busy`; `role="status"` count line for results;
forced-colors outline; reduced-motion stops the spin.

## Textarea

**When to use** — Multi-line free text (Notes, context, P2 depth). **When
not** — Single value (TextInput); structured lines (rows of TextInputs);
rich text (needs toolbar + different component).

**Anatomy** — Composes `.field__input` (requires `text-input.css`) as
`textarea.field__input`: auto height, 88px min, `spacing.3` pad, relaxed
leading, vertical resize only · `.textarea` (column, `spacing.2` gap) ·
`.textarea__count` (right-aligned xs muted; `--limit` warns
`role.warning-strong` near cap).

**Variants** — `.textarea__input--sm` (64px min, `spacing.16`) /
`--lg` (160px min). Outlined/filled/error/success/disabled/readonly all
inherited from `.field__input` modifiers — no duplicated states here.

**States** — Inherits the full TextInput state table (hover / focus ring /
disabled / readonly / error / success / loading / placeholder / autofill);
resize is vertical-only so layout never breaks horizontally.

**Token Usage** — Everything from TextInput plus: pad `spacing.3`,
leading `font-leading.relaxed`, count `font-size.xs` + `text.muted`,
near-limit `role.warning-strong`.

**Dos and Don'ts** — DO set a sensible `rows` + maxlength with a visible
count; DO keep vertical-only resize; DON'T use textarea for one word;
DON'T disable resize entirely (small screens need it).

**Accessibility** — Label + `aria-describedby` (help, error, AND count id);
error path identical to TextInput; count needs `aria-live="polite"` past 90%;
44px min touch height far exceeded; reduced-motion still.

## Deviations (kept, not fixed here)

- md 44px is a raw px touch target — no `spacing.*` token equals 44px
(sm `spacing.8`, lg `spacing.12` are tokens). Visual-law, not a leak.
- Autofill flood `0 0 0 100px … inset` uses raw geometry (color is
`bg.surface` token) — the only way to beat the UA yellow; standard trick.
- `textarea` 88/160px min-heights are px content targets, same class of
deviation as the 44px frame.
- Spin uses the `linear` keyword — no motion-easing token names it.
- Success message ink stays `text.muted`/`text.secondary`: `role.success`
fails small-text contrast, so the border + icon carry the hue, never text.

**Witness:** P2 form depth (Operate); gallery form panel renders all four.
