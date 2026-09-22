# Foundations — Contract (Evo 50–900)

**Usage:** Color: sapphire is sole action hue (10-step 50–900) + signal swap-slot; gems never chrome. Typography: Inter weight+size hierarchy, never color. Spacing 4px grid, radius pills for filters, hairline for UI cards. Every value via `var(--token)`.

**Do:** Use `var(--signal)` (→ `--primitive-sapphire-ui-500` default, `→ --signal-amber/teal` on swap) for primary actions; use `var(--bg-surface)` + `var(--border-thin)` for cards; use `var(--font-size-*)` + `var(--font-leading-*)` for type; prefer aliases `--primitive-gray-*` / `--primitive-sapphire-*` / `--primitive-topaz/ruby`.

**Don't:** Don't tint buttons with citrine/red-beryl/amethyst directly; don't hard-code `#hex` or `rgba()` outside `tokens.css`; don't add decorative shadows to UI cards; don't use color alone for status.

**Witnesses:** ref-07 ramps (color 50–900), ref-01/02/03 light screens (semantic), ref-11 dark cards, ref-10-12 mood quarantined (brand only).

**A11y:** All text ≥4.5:1 (contrast.test.mjs 10 pairs, AA-large 4.14 exempt goal-bar `a54cff` on white large/bold only). Focus: `--focus-ring` 2px sapphire 4px offset. `forced-colors:active` maps `border-thin` + `text-primary` to `CanvasText`. `prefers-reduced-motion` disables spring.

**Tokens:** Tier1 `tokens/primitives.json` (50–900 + `signal`/`signal-amber`/`signal-teal`) + `tokens/motion.json` → `design-system/tokens.css` (27 lines) → Tier2 `semantic-light/dark` (`--color-accent-brand:var(--signal)`) + `themes/dark` + `themes/high-contrast` (`forced-colors`).

**Language:** `language.html` — paper / glass / ceremony before the atoms (principles, role swatches, Operate order beside ref-01).

## Color demo — 10-step ramps

| Ramp | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | Alias |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Neutral light | #ffffff | rgba(255,255,255,.88) | #fafafa | #f5f5f5 | #e0e0e0 | #cccccc | #b8b8b8 | #a3a3a3 | #8a8a8a | #737373 | `--primitive-gray-50→900` |
| Neutral dark | #a3a3a3 | #8f8f8f | #7a7a7a | #666666 | #525252 | #3d3d3d | #292929 | #141414 | #0f0f0f | #080808 | `--primitive-gray-700→900` |
| Sapphire UI | #f5f9ff | #ebf5fe | #c1e0fd | #7cbefb | #218aea | #1666af | #0b4377 | #032443 | #021a30 | #011020 | `--primitive-sapphire-*` + `--signal` |
| Citrine | #fff8e6 | #fff1d6 | #ffe0a3 | #ffc752 | #ffb01e | #9d6a00 | #704a00 | #452c00 | #2e1e00 | #1a1100 | `--primitive-citrine-*` → topaz |
| Red Beryl | #fff0f4 | #ffe2eb | #ffaac5 | #ff85ab | #ea005e | #a80035 | #6b0022 | #330010 | #1f000a | #0f0005 | `--primitive-red-beryl-*` → ruby |
| Amethyst | #fcf5ff | #f7eeff | #debeff | #c48aff | #a54cff | #6e00db | #490091 | #27004d | #190033 | #0f001f | `--primitive-amethyst-*` |
| Orange/Red/Green | #fef0e6 | #fac69e | #f8ac72 | #f69246 | #f57f26 | … | #a30000 | #18d824 | — | — | messaging |

Gallery `Color` tab renders each ramp live as `background:var(--primitive-*-50→900)` 28px swatches + `signal` swap (default→amber→teal) updating `--signal` and previewing computed hex via `getComputedStyle`.

## Typography / Spacing / Radius / Shadow / Motion / Iconography

- **Type:** Inter sans, `xs 12` → `3xl 32`, `regular 400`/`medium 500`/`semibold 600`/`bold 700`, `leading-tight 1.15`/`snug 1.25`/`normal 1.4`/`relaxed 1.5`, `tracking-tight -0.01`/`wide 0.04`.
- **Spacing:** `0 0` / `1 4` / `2 8` / `3 12` / `4 16` / `5 20` / `6 24` / `8 32` / `10 40` / `12 48` / `16 64` — card `spacing-4`, section `12/16`.
- **Radius:** `none 0`/`xs 4`/`sm 8`/`md 12`/`lg 16`/`xl 20`/`2xl 24`/`3xl 32`/`full 9999` — chips `full`, cards `lg→2xl`.
- **Shadow/Border/Z:** `shadow-sm/md/lg` (hairline carries UI, shadow only for depth viz) + `border hairline 1px/thin/medium/thick` + `z base 0→toast 1050` + `opacity disabled .5`.
- **Motion/Icon:** `duration xs 100→xl 600` + `easing standard/spring/elastic` + `spring 300/20/1` + `elastic-overshoot 12px/tilt-max 12deg` + `icon 12→32`.

**Verify:** `npm run build` byte-identical, `grep primitive-.*-50` hits 10 ramps, `npx @google/design.md lint DESIGN.md` 0 errors, gallery Color tab shows 10 swatches per ramp + signal chip toggles live.
