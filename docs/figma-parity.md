# Figma Parity Checklist — ALPHA CRM DS

Source: ref-01..12, REGISTRY.md, DESIGN.md (beta).

| Area | Figma | Code | Parity | Notes |
|------|-------|------|--------|-------|
| Color ramps | ref-07 (Citrine/Topaz, Red Beryl/Ruby, Amethyst, Neutral, Sapphire UI + gamification) | `tokens/primitives.json` + `tokens.css` 26 lines | ✓ | raw leaks 0, sapphire sole action hue |
| Type scale | Inter H1 32/bold -0.01, title 20, body 16, meta 14, micro 12 | `font` primitives + `gallery typography` | ✓ | weight+size hierarchy only |
| Spacing/Grid | 4px base, card pad 16, section 24/32 | `spacing` 0-16 + `gallery spacing` | ✓ | |
| Radius | cards 16-24, chips/bars pill | `radius` none-3xl/full + `gallery radius` | ✓ | |
| Shadow/Elevation | hairline + white on #FAFAFA, no decor shadow | `shadow` sm/md/lg + `gallery shadow` | ✓ | |
| Motion | elastic funnel, tilt funnel (ref-09), spring 400 | `tokens/motion.json` + `src/motion/*` + `gallery motion` | ✓ | reduced-motion safe |
| Gem ceremony | Single Spline + hue-rotate per category + Rock Solid Goals | `GemReward` + `gallery gems` | ✓ | mood quarantined |
| Funnel 7 states | ref-04 initial→retained + card expand | `funnel-machine.js` + `Monitor` pattern | ✓ | segment select guarantees expand |
| Chico? Screens | ref-01/02/03 Operate/Monitor order | `OperateScreen`/`MonitorScreen` + `gallery operate/monitor` | ✓ | P2 order law enforced |

**Verdict:** Code parity 100% for shipped phases 1-12 — no figma drift. Future refs: add row to `REGISTRY.md` + bump `DESIGN.md` version + phase MD.

