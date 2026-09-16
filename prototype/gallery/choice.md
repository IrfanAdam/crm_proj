# Choice — Checkbox / Radio / Switch / Slider

**Shared:** 2px sapphire focus-ring + `var(--transition-spring)`, `prefers-reduced-motion` disables animation. Checkbox (tick SVG), radio dot, switch track/thumb, slider (segmented timeline variant from P4).

**A11y:** Native `input` hidden but focusable, `label` wraps control, `aria-checked` if custom, keyboard Space/Arrow, axe form rules.

**Tokens:** `--focus-ring`, `--transition-spring`, `--primitive-sapphire-ui-400`.