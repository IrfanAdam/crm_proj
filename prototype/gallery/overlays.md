# Overlays — Modal / Drawer / Popover / Tooltip / Menu / Toast

**Engine:** `src/components/Overlay/overlay.js` (25 lines) — one focus-trap, Esc, return-focus, layering (`--z-index-overlay/modal/toast`) serving all six. `overlay.css` 19 lines.

**Variants:** Modal (achievement gem, hue-rotate, mood quarantined), Drawer (filters), Popover (re-center), Tooltip (accessible name required), Menu (`role=menu`/`menuitem`), Toast (`role=status aria-live=polite`).

**A11y:** `role=dialog aria-modal=true aria-labelledby`, focus trap + `inert` background, Esc closes, focus returns to opener, never ships without accessible name.

**Tokens:** `--z-index-overlay/modal/toast`, `--shadow-lg`, `--achievement-overlay-bg`, `var(--focus-ring)`.

**Guardrail:** No overlay decorates Operate/Monitor screens beyond the modal.