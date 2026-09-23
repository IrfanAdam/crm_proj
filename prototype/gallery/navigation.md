# Navigation — Tabs / Breadcrumbs / Pagination / Accordion / TabBar / Toolbar

Material 3 navigation + Carbon patterns. All visuals token-only (`var(--*)`).

## Tabs

- Variants: `.tabs` underline (default) vs `.tabs--contained` (segmented pill on `--bg-interactive`).
- Scrollable: `overflow-x: auto` on the tablist; triggers `white-space: nowrap`.
- Keyboard: roving tabindex — one `tabindex="0"`, rest `-1`; ArrowLeft/Right move, Home/End jump.
- Markup: `role=tablist` / `role=tab` + `aria-selected`; panels `role=tabpanel`, `hidden` when inactive.
- States: selected (`--role-action` underline / `--bg-surface` pill + `--shadow-sm`), hover (`--text-primary`),
  disabled (`--text-dim` + `--opacity-disabled`, removed from roving order), focus (`--focus-ring`).

## Breadcrumbs

- Variants: `.breadcrumbs--collapsed` hides `.breadcrumbs__item--collapsible` behind `.breadcrumbs__collapse`
  (`…` button); expanded shows the full trail.
- Current page: `.breadcrumbs__current` + `aria-current="page"`; never a link.
- Truncation: `.breadcrumbs__item--truncated` ellipsizes long labels (max `--spacing-16`).
- Markup: `nav aria-label="Breadcrumb"` > `ol`; separators (`/` or `·`) `aria-hidden="true"`.

## Pagination

- Full: first / prev / numbered pages / next / last + `.pagination__ellipsis` + `.pagination__status` ("1–20 of 96").
- Compact (`.pagination--compact`): joined prev/next strip, no page numbers, for narrow slots.
- Page sizes: numbered buttons `--icon-size-xl` (32px); nav buttons may carry text labels.
- States: selected page `.pagination__btn--active` (`--role-action` + `aria-current="page"`),
  disabled nav (`--opacity-disabled`, `disabled` attr), hover (`--bg-interactive-hover`).
- Markup: `nav aria-label="Pagination"`; `aria-current="page"` on the current button.

## Accordion

- Modes: single-expand (opening one closes the rest, JS) vs multi-expand (independent items, same CSS).
- Chevron: trailing default; `.accordion--chevron-leading` puts `.accordion__icon` first via `order: -1`.
- Disabled: `disabled` trigger gets `--text-dim` + `--opacity-disabled`; panel stays shut.
- Animation: panel animates `grid-template-rows 0fr ↔ 1fr` (`--motion-duration-md`); chevron rotates 180°.
- Reduced motion: transitions off under `prefers-reduced-motion`; `hidden` still toggles instantly.
- Markup: trigger `aria-expanded` + `aria-controls`; panel `hidden` when closed.

## TabBar

- Law: icon-only mobile dock (Phosphor glyphs, no labels); 44px+ touch targets (`--spacing-10` min).
- Signal-on-selected: single `.tabbar__signal` dot (`--role-action`) on the active item only — never double dots.
- Badge slot: `.tabbar__badge` count pill (`--role-score`) is separate from the selected signal; omit when zero.
- 3-tab supersession: at ≤3 tabs on mobile the dock supersedes Tabs — do not render both.
- Markup: `role=tablist`, `aria-current="page"` mirrors `.tabbar__item--active`.

## Toolbar

- Density: `.toolbar--comfortable` (56px) / default (44px) / `.toolbar--compact` (`--spacing-8`, tight gaps).
- Groups: `.toolbar__group` clusters; adjacent groups split by a `--border-default` divider; `.toolbar__spacer` pushes trailing actions.
- Overflow: excess `.toolbar__action`s collapse into `.toolbar__overflow` (menu button) on narrow widths.
- Title: `.toolbar__title` ellipsizes; never shrinks the action cluster.

## Token table

| Use | Token |
|---|---|
| Surfaces | `--bg-surface`, `--bg-interactive`, `--bg-interactive-hover`, `--bg-surface-glass` |
| Borders | `--border-default`, `--border-width-thin`, `--border-width-medium` |
| Text | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-dim`, `--text-emphasis` |
| Signal | `--role-action` / `--role-action-ink`, `--role-score` / `--role-score-ink` |
| Shape | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-2xl`, `--radius-full` |
| Motion | `--motion-duration-sm`, `--motion-duration-md`, `--motion-easing-standard` |
| Focus / state | `--focus-ring`, `--opacity-disabled`, `--shadow-sm`, `--shadow-md` |
| Type / space | `--font-size-sm`, `--font-size-xs`, `--font-weight-medium`, `--spacing-*`, `--icon-size-*` |

## Dos / Don'ts

- DO use roving tabindex for Tabs/TabBar; DON'T leave every tab in tab order.
- DO mark current page with `aria-current`; DON'T link the current breadcrumb/page.
- DO one signal dot on the active dock item; DON'T pair badge + signal as two dots on one item.
- DO collapse to overflow/ellipsis on narrow widths; DON'T let labels push actions off-screen.
- DO honor `prefers-reduced-motion`; DON'T animate height with raw pixel keyframes.

## A11y per component

- Tabs: tablist semantics, roving focus, visible `--focus-ring`, `aria-selected`, labelled panels.
- Breadcrumbs: landmark nav, `aria-current="page"`, hidden separators, 44px collapsed button.
- Pagination: landmark nav, `aria-current="page"`, disabled (not hidden) nav buttons, announced status text.
- Accordion: `aria-expanded`/`aria-controls`, instant `hidden` toggle, focus ring, disabled triggers skipped.
- TabBar: tablist semantics, `aria-current`, icon `aria-label`s, forced-colors fallback, no motion dependence.
- Toolbar: `role=toolbar` + `aria-label`, grouped `aria-label`s, keyboard-reachable overflow menu.

**Witness:** ref-01 shell (title→KPI→hero→chips→cards→tab), ref-06 reports depth.
