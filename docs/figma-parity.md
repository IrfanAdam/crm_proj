# Figma Parity Checklist — ALPHA CRM DS (Evo 50–900 + signal)

Source: ref-01..12, REGISTRY.md, DESIGN.md (beta, 56 colors 50–900 + signal), `tokens/primitives.json` (10-step) + `tokens.css` 27 lines.

| Area | Figma | Code | Parity | Notes |
|------|-------|------|--------|-------|
| Color ramps 50–900 | ref-07: Citrine `#fff8e6→#1a1100`, Red Beryl `#fff0f4→#0f0005`, Amethyst `#fcf5ff→#0f001f`, Neutral 50–900, Sapphire UI 50–900 + gamification (distinct keys) | `tokens/primitives.json` 10 steps each + `aliases-gray/sapphire/gem` + `gallery Color` 10×28px swatches `var(--primitive-*-50→900)` | ✓ | raw leaks 0, sapphire sole action via `--signal` |
| Signal swap-slot | — | `--signal var(--primitive-sapphire-ui-500)` + `--signal-amber var(--primitive-citrine-500)` + `--signal-teal var(--primitive-green-500)` → `--color-accent-brand:var(--signal)`; Gallery chips toggle live | ✓ | re-theme without rename |
| Type scale | Inter H1 32/bold -0.01, title 20, body 16, meta 14, micro 12 | `font` primitives + `gallery typography` live | ✓ | weight+size hierarchy only |
| Spacing/Grid | 4px base, card pad 16, section 24/32 | `spacing` 0–16 + `gallery spacing` bars | ✓ |  |
| Radius | cards 16–24, chips/bars pill 9999 | `radius` none→3xl/full + `gallery radius` | ✓ |  |
| Shadow/Elevation | hairline + white on #FAFAFA, no decor shadow | `shadow` sm/md/lg + `border hairline` + `gallery shadow` | ✓ | depth only for funnel/gems |
| Motion | elastic funnel, tilt funnel ref-09, spring 400 | `tokens/motion.json` + `src/motion/*` + `gallery motion` (prefers-reduced-motion instant) | ✓ | |
| Gem ceremony | Single Spline `my.spline.design/gem-embed` + hue-rotate per category + Rock Solid Goals | `GemReward` 4 variants + `gallery gems` | ✓ | mood quarantined |
| Navigation | Bottom tab 5 glyphs single dot | `TabBar` + `Tabs/Breadcrumbs/Pagination/Accordion` + `gallery nav` (roving tabindex) | ✓ | |
| Overlays | Modal/Drawer/Popover/Tooltip/Menu/Toast | `Overlay` engine 25 lines `focus-trap/esc/return-focus` + `gallery overlays` | ✓ | |
| Data & Cards | Table/ListRow/KpiStat/Timeline + Opportunity/Funnel/Profile cards + GoalBar/Glyph/Sparkline | `src/components/*` + `gallery data/cards` | ✓ | |
| Patterns | 7 funnel states + blob vs Goals D/W/M/Q/Y + transient/temporal | `funnel-machine.js` (7) + `Operate/Monitor/ReportsMatrix` + `gallery operate/monitor/reports` | ✓ | segment select guarantees expand |
| Foundations docs | ref-07 + ref-01/02/03 + ref-11 dark | `design-system/docs/phase-1` 39 lines 10-step table + `prototype/gallery/foundations.md` 37 lines live | ✓ | Evo table + live |

**Catalog parity:** ✓ atoms, ramps, contrast — still true for `gallery.html` (`DESIGN.md` lint 0 errors, `npm test` green, 88 lines). Shipped ramps + signal + Evo foundations remain ✓.

**Prototype parity:** — not claimed. Opps follows ref-01 order and card anatomy. Nav (3-tab glass dock), glass chrome, title size (24 → 32), chip fork (`opps__chip` → `chip`), and empty tabs are tracked by `design-system/docs/visual-language.md` (2026-09-22), not marked ✓. Do not mark those gaps ✓.

Future refs: add row to `REGISTRY.md` + dated polish pass + `DESIGN.md` version bump + re-lint.
