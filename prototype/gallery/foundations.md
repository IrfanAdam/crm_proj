# Foundations — Contract

**Usage:** Color: sapphire is sole action hue; gems never chrome. Typography: Inter weight+size hierarchy, never color. Spacing 4px grid, radius pills for filters, hairline for UI cards.

**Do:** Use `var(--primitive-sapphire-ui-500)` for primary actions; use `var(--bg-surface)` + `var(--border-thin)` for cards; use `var(--font-size-*)` + `var(--font-leading-*)` for type.

**Don't:** Don't tint buttons with citrine/red-beryl/amethyst; don't add decorative shadows to UI cards; don't use color alone for status.

**Witnesses:** ref-07 ramps (color), ref-01/02/03 light screens (semantic), ref-11 dark cards, ref-10-12 mood quarantined.

**A11y:** All text ≥4.5:1 (contrast.test.mjs 10 pairs, AA-large 4.14 exempt goal-bar). Focus: `--focus-ring` 2px sapphire. `forced-colors:active` maps `border-thin` + `text-primary` to `CanvasText`.

**Tokens:** Tier1 `tokens/primitives.json` + `tokens/motion.json` → `design-system/tokens.css` (27 lines) → Tier2 `semantic-light/dark` + themes.

## Color demo
- Primitives: sapphire-ui 100-700, citrine, red-beryl, amethyst, neutral-light/dark, orange/red/green.
- Semantic: `--bg-primary/surface`, `--text-primary/secondary/muted`, `--border-thin`, `--color-accent-*`, `--shadow-*`, `--focus-ring`.

## Typography demo
- Inter sans, xs 12 → 3xl 32, regular 400/medium 500/semibold 600/bold 700, leading 1.15/1.25/1.4/1.5, tracking -0.01/0/0.04.

## Spacing/Radius/Shadow/Motion/Iconography
- Spacing 0→16 (0/4/8/12/16/24/32/48/64), radius none/xs-3xl/pill, shadow sm/md/lg, motion duration xs-xl + easing standard/spring/elastic + spring stiffness/damping/mass, icon 12-32 + z 0-1050 + opacity disabled/overlay/glass.
