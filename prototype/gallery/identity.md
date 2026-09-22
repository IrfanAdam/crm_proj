# Identity — Chip / Badge / StatusPill / Avatar / Icon

**Chip** (`chip.css` 9 lines): filter chip, full-pill, toggle `chip--active` (black). **Badge** (6 lines): 5 variants (sapphire tint etc). **StatusPill** (8 lines): ACCEPTED green Ink, IN PROGRESS sapphire white, REVIEW tint, NEW dark, Caution orange — status never color-alone (label + variant).

**Avatar** (12 lines): 24/32/48/64 + stack + online dot. **Icon** — Phosphor Regular → Fill (`Icon.jsx` + web CDN, regular 1.5px unselected, fill + signal on selected); legacy `sprite.svg` (13 lines, 8 symbols) deprecated, fallback only — new work never uses `<use href="sprite.svg">`.

**Do/Don’t:** DO use pill for countable/filterable; DON’T use gem hue for UI chrome.

**Witness:** ref-01 chips/pills, ref-02 status, ref-01 avatar stack.

**A11y:** Chip `role=button` + `aria-pressed`, badge `aria-label` count, pill text visible, icon `aria-hidden` or `aria-label` if solo, avatar `alt=""`.

**Tokens:** `--radius-full`, `--primitive-sapphire-ui-*`, `--primitive-green-*`, `--primitive-orange-*`.