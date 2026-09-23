# Choice — Checkbox / Radio / Switch / Slider

Shared law (all four): native `input` stays in the DOM, visually hidden but
focusable; the `label` wraps control + text. Focus = `box-shadow:
var(--focus-ring)` (2px sapphire ring, Carbon/Material-3 aligned) on the visual
proxy. Motion = `var(--transition-fast)` for paint, `var(--transition-spring)`
for thumb/dot travel; `prefers-reduced-motion` kills all of it. Hit target ≥
44px (`min-height: 44px` on label rows; slider thumb 20px on a full-width
track). Forced colors: `forced-color-adjust: auto` on visuals + a
`forced-colors: active` override mapping selected paint to `Highlight`.

## Checkbox vs Switch vs Radio — selection rules

| Situation | Use |
|---|---|
| 0..n independent on/off in a list or form | Checkbox |
| One choice out of 2..n mutually exclusive options | Radio group |
| Instant-effect binary setting (takes effect on toggle, no submit) | Switch |
| Binary choice that needs Review → Submit | Checkbox, never switch |
| Single "I agree / subscribe" confirmation | Checkbox, never radio, never switch |
| Yes/No as a submitted form answer | Checkbox (or two radios), never switch |
| 3+ exclusive options, or options need comparison text | Radio, never switch |
| "Select all" over a list with partial selection | Checkbox with `indeterminate` |

Never: switch inside a submitted form; radio for a lone boolean; checkbox for
an instant setting; radio group with a single option.

## Checkbox (`.check`)

**When to use:** multi-select lists, bulk select, confirmations, form booleans.
**When not:** instant settings (→ switch), exclusive choice (→ radio).

**Anatomy:** `label.check` → `input[type=checkbox]` (absolute, `opacity: 0`,
kept focusable) + `.check__box` (20px, `var(--radius-sm)`, tick `.check__icon`
SVG scales 0.6→1, `opacity` 0→1) + `.check__label` text.

**Variants:** `.check--sm` (16px) / default (20px) / `.check--lg` (24px);
indeterminate via native `input:indeterminate` (set `el.indeterminate = true`
in JS for "select all" partial); `.check--error`; `.check--disabled`.

**States:** unchecked (surface, `--border-strong`) → hover (accent border +
`--bg-interactive-hover`) → checked/indeterminate (`--role-action` fill, white
tick) → active/pressed (`--bg-interactive-active`, checked presses to
`--role-action-strong`) → `focus-visible` (shared ring) → `disabled`
(`var(--opacity-disabled)` on box, `--text-muted` label, `not-allowed`) →
error (`--role-danger` border/fill, `--role-danger-strong` label).

**Tokens:**

| Token | Role |
|---|---|
| `var(--bg-surface)` | box face |
| `var(--border-strong)` | resting border |
| `var(--role-action)` / `--role-action-strong` | checked fill, hover border, pressed fill |
| `var(--primitive-gray-white)` | tick |
| `var(--role-danger)` / `--role-danger-strong` | error border/fill, error label |
| `var(--text-primary)` / `--text-muted` | label / disabled label |
| `var(--focus-ring)` | focus-visible ring |
| `var(--opacity-disabled)` | disabled |
| `var(--spacing-2)` | control–label gap |
| `var(--icon-size-sm/md/lg)` | sm / default / lg box |
| `var(--icon-size-xs)` | tick |
| `var(--radius-sm)` | box corner |
| `var(--transition-fast)` | paint + tick travel |

**Do:** wrap `input` in `label`; use `indeterminate` only for partial-group.
**Don't:** fake with divs; shrink below 16px; put two checkboxes on one label.

**A11y:** native `input[type=checkbox]` (no `aria-checked` needed);
`aria-checked="mixed"` only if a custom proxy hides the native indeterminate;
`Space` toggles; label text always visible; ring = shared law; 44px row;
`forced-colors` maps fill to `Highlight`; motion off under reduced-motion.

## Radio (`.radio`, `.radio-group`)

**When to use:** exactly-one-of-n, 2–7 visible options, options need subtitles.
**When not:** lone boolean (→ checkbox), instant setting (→ switch), 7+
options (→ select), multi-select (→ checkbox).

**Anatomy:** `fieldset.radio-group` (+ `legend`) → `label.radio` →
`input[type=radio][name=shared]` + `.radio__dot` (20px circle,
`var(--radius-full)`, inner `::after` dot at 50% scale 0.6→1) + `.radio__label`.

**Variants:** `.radio-group--vertical` (default, `var(--spacing-2)` gap) /
`.radio-group--horizontal` (`row`, `var(--spacing-4)` gap, wraps on narrow);
`.radio--sm` / `--lg`; `.radio--error`; `.radio--disabled`.

**States:** unchecked → hover (accent border) → checked (accent ring + dot) →
active (`--bg-interactive-active` well) → `focus-visible` (shared ring) →
disabled (opacity + muted label) → error (danger ring; checked dot danger).

**Tokens:**

| Token | Role |
|---|---|
| `var(--bg-surface)` | dot well |
| `var(--border-strong)` | resting ring |
| `var(--role-action)` / `--role-action-strong` | checked ring, dot, hover |
| `var(--role-danger)` | error ring/dot |
| `var(--text-primary)` / `--text-muted` | label / disabled |
| `var(--focus-ring)` | focus-visible ring |
| `var(--opacity-disabled)` | disabled |
| `var(--spacing-2)` / `--spacing-4` | vertical / horizontal group gap |
| `var(--icon-size-sm/md/lg)` | dot sizes |
| `var(--radius-full)` | outer + inner circle |
| `var(--transition-fast)` | ring + dot travel |

**Do:** share one `name`; `fieldset` + `legend`; pre-select a sane default.
**Don't:** mix radios and checkboxes in one group; disable all options without
help text; lay out horizontally on narrow screens.

**A11y:** native same-`name` radios; arrows move + select per platform, `Space`
selects; `Tab` enters group once; `aria-describedby` for group help/error;
`aria-invalid` on error; ring/target/motion/forced-colors = shared law.

## Switch (`.switch`)

**When to use:** instant binary effect (notifications, dark mode, availability);
effect applies on toggle, reversible inline.
**When not:** anything submitted via a form (→ checkbox); exclusive choice
(→ radio); destructive irreversible action without confirm.

**Anatomy:** `label.switch` → `input[type=checkbox][role=switch]` +
`.switch__track` (44×26, `var(--radius-full)`) + `.switch__thumb` (20px,
`var(--shadow-sm)`, travels 18px via `translateX`, `var(--transition-spring)`)
+ optional `.switch__icon` inside thumb (fades in only when on) +
`.switch__label`.

**Variants:** without icon (default) / with icon (`.switch__icon` child, on =
check glyph at `opacity: 1`); `.switch--sm` (36×22 track, 16px thumb, 14px
travel); `.switch--error`; `.switch--disabled`.

**States:** off (`--bg-interactive` track) → hover (accent border) → on
(`--role-action` track, thumb right) → active/pressed (off presses to
`--bg-interactive-active`, on presses to `--role-action-strong`) →
`focus-visible` (shared ring on track) → disabled (opacity, `not-allowed`) →
error (danger border).

**Tokens:**

| Token | Role |
|---|---|
| `var(--bg-interactive)` / `--bg-interactive-active` | off track / pressed |
| `var(--role-action)` / `--role-action-strong` | on track / pressed-on |
| `var(--border-strong)` | resting track border |
| `var(--bg-surface)` | thumb face |
| `var(--role-action-strong)` | on-icon tint |
| `var(--role-danger)` | error border |
| `var(--shadow-sm)` | thumb lift |
| `var(--focus-ring)` | focus-visible ring |
| `var(--opacity-disabled)` | disabled |
| `var(--spacing-2)` | track–label gap |
| `var(--radius-full)` | track + thumb |
| `var(--transition-fast)` | track paint |
| `var(--transition-spring)` | thumb travel |

**Do:** label the governed thing ("Email alerts", not "On"); keep effect
instant; expose `role="switch"` semantics.
**Don't:** use for Submit-gated choices; use icon-only without a text label;
animate thumb with anything but the spring token.

**A11y:** `input[type=checkbox]` + `role="switch"` (or native checkbox with
clear label); `Space` toggles; state announced on/off via `aria-checked`;
44px row; reduced-motion snaps thumb (no travel); forced-colors maps on-track
to `Highlight`.

## Slider (`.slider`)

**When to use:** continuous quantity (volume, price cap) or stepped quantity
with visible stops (plan seats 1–10); value benefits from drag + tick labels.
**When not:** 2–4 named options (→ radio/segmented); exact numeric entry
(→ text input, or pair slider + input); binary (→ switch).

**Anatomy:** `input[type=range].slider` (full-width 6px track,
`var(--radius-full)`) + `::-webkit-slider-thumb` / `::-moz-range-thumb` (20px
face, `--border-width-medium` accent ring, `grab`) + `::-moz-range-track` /
`::-moz-range-progress` fill + optional `.slider__ticks` row (flex
space-between, `--font-size-xs`, `--text-muted`).

**Variants:** continuous (default) / discrete (`.slider--discrete`: native
`step` + repeating-gradient tick strip + `.slider__ticks` labels);
`.slider--sm` (16px) / `--lg` (24px) thumbs; `.slider--error`.

**States:** resting → hover (accent-strong ring + `--shadow-md`) →
focus-visible (shared ring on thumb) → dragging/`:active` (`grabbing`,
ring persists) → disabled (opacity, `not-allowed`) → error (danger ring +
danger progress).

**Tokens:**

| Token | Role |
|---|---|
| `var(--bg-interactive)` | track |
| `var(--role-action)` / `--role-action-strong` | progress, thumb ring, hover |
| `var(--bg-surface)` | thumb face |
| `var(--border-strong)` | discrete tick marks |
| `var(--role-danger)` | error ring/progress |
| `var(--text-muted)` | tick labels |
| `var(--shadow-sm)` / `--shadow-md` | thumb rest / hover |
| `var(--focus-ring)` | focus + dragging ring |
| `var(--opacity-disabled)` | disabled |
| `var(--border-width-medium)` | thumb ring width |
| `var(--icon-size-sm/md/lg)` | thumb sizes |
| `var(--font-size-xs)` | tick labels |
| `var(--radius-full)` | track, progress, thumb |
| `var(--transition-fast)` | thumb paint |

**Do:** pair with a live value readout (`output` / `aria-valuetext`); step +
tick count must match; keep tick labels short.
**Don't:** hide the value; use sub-16px thumbs; build discrete steps without
native `step`.

**A11y:** native `input[type=range]` with `min/max/step/value`,
`aria-valuetext` ("75%, high activity"); arrows (1 step), PgUp/PgDn, Home/End;
`aria-invalid` + described error; visible focus ring on thumb; thumb ≥ 16px on
full-width track; reduced-motion kills thumb transition; forced-colors keeps
`ButtonFace` thumb with `Highlight`-safe contrast (disabled keeps `opacity:
1` so system dimming applies instead).

## Cross-control checklist

- One control, one native input; proxies never intercept pointer/keyboard.
- Hover never the only selected cue; pressed always distinct from focus.
- Disabled keeps contrast-readable labels (`--text-muted`, never ghosted text).
- Error always pairs color with text (`aria-invalid` + `aria-describedby`).
- Dark theme free via semantic tokens (no per-theme overrides in these files).
