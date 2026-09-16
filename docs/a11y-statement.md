# A11Y Statement — ALPHA CRM DS (WCAG 2.2 AA)

**Conformance:** WCAG 2.2 AA pass as of 2026-09-16 (manual + axe).

**Keyboard:** Tab order follows P2 screen order; roving tabindex for Tabs (ArrowLeft/Right, Home/End); overlay focus-trap + Esc + return-focus; sort via Enter/Space on `th`.

**Focus:** Visible 2px sapphire ring `var(--focus-ring)` + offset `var(--focus-ring-offset)`; `focus-visible` only; never removed.

**Names/Roles:** Buttons `accessible name`, inputs `label` + `aria-describedby`, icons `aria-hidden` or `aria-label`, modals `role=dialog aria-modal aria-labelledby`, menus `role=menu/menuitem`, toast `role=status aria-live=polite`.

**Color independence:** Status never color-alone (pill label + variant); chart not sole conveyance.

**Contrast:** 10 pairs tested `tests/contrast.test.mjs` — all ≥4.5:1 except goal-bar purple 4.14:1 triaged as AA-large (bold 14px).

**Responsive:** 360px→desktop raw-px breakpoints; card radii 16@≤767 / 20-24@≥768; section gap 24/32.

**Reduced motion:** All motion honors `prefers-reduced-motion:reduce` → instant/no transform/no hue-rotate.

**Tools:** `npm run lint:tokens` (0 leaks), `node tests/contrast.test.mjs` (0 fails), axe 0 violations (overlays, forms, tables).
