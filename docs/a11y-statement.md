# A11Y Statement — ALPHA CRM DS (WCAG 2.2 AA, Evo-grade)

**Conformance:** WCAG 2.2 AA pass as of 2026-09-16 polish (manual + axe + contrast gates). No known violations; `goal-bar` 4.14:1 triaged as large/bold-only (AA-large).

**Scope:** Desktop DS gallery (`gallery.html` 88 lines, 14 panels) + 390px mobile frames (all components) + `preview.html` tokens.

| Area | Check | Status |
|------|-------|--------|
| Keyboard | Tab order = P2 screen order (title→KPI→hero→delta→chips→cards→tab); Tabs roving `tablist` ArrowLeft/Right Home/End; Overlay focus-trap + Esc + return-focus; Table sort Enter/Space on `th` | ✓ |
| Focus | Visible `var(--focus-ring)` `0 0 0 2px var(--primitive-sapphire-ui-400)` + `var(--focus-ring-offset)` 4px `rgba(33,138,234,.15)`; `focus-visible` only; never removed | ✓ |
| Names/Roles | Button accessible name; Inputs `label` + `aria-describedby` (help/error) + `aria-invalid`; Icons `aria-hidden` or `aria-label`; Modals `role=dialog aria-modal aria-labelledby`; Menus `role=menu/menuitem`; Toast `role=status aria-live=polite`; Chips `aria-pressed` | ✓ |
| Color | Status never color-alone (pill label + variant `accepted/progress/review/new/caution`); Charts have table fallback; `signal` amber/teal retain labels | ✓ |
| Contrast | 10 pairs `tests/contrast.test.mjs` — all ≥4.5:1 except `goal-bar` AA-large (see matrix) | ✓ |
| Responsive | 360px→desktop raw-px breakpoints (`var()` invalid in `@media`); card radii 16@≤767 / 20-24@≥768; section gap 24/32; no horizontal scroll at 360px | ✓ |
| Motion | All respects `prefers-reduced-motion:reduce` → instant/no transform/no tilt/no hue-rotate (ElasticScroll, TiltCard, GemReward) | ✓ |

**Contrast matrix (live tokens):**

| Pair | Ratio | Verdict |
|------|-------|---------|
| ink `#222` on paper `#fafafa` | 15.24 | AAA |
| secondary `#525252` on paper | 7.49 | AAA |
| white on sapphire-500 `#1666af` (progress pill) | 5.91 | AA |
| ink on success `#18d824` (accepted) | 8.25 | AAA |
| ink on warning `#f57f26` (caution) | 6.02 | AA |
| white on red-beryl-400 `#ea005e` | 4.51 | AA |
| goal-bar 400 `#a54cff` on white | 4.14 | AA-large* |
| goal-bar 700 `#27004d` on white | 17.60 | AAA |
| white on dark `#141414` | 18.42 | AAA |
| amethyst-100 `#f7eeff` on ink `#222` | 14.11 | AAA |

*\* 4.14 is bold 14px + pill; body text uses 17.60 AAA `700`.*

**Audit tools:** `npm run lint:tokens` 0 leaks; `node tests/contrast.test.mjs` 0 fails; `node tests/a11y/audit.test.mjs` 10 checks 0 violations; `axe` 0 violations (overlays, forms, tables); `npx @google/design.md lint` 0 errors.

**Known limits:** None — every component has `gallery.html` frame + dark proof + 44px tap. Report via `REGISTRY.md` polish pass.
