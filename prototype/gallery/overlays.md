# Overlays — Modal / Drawer / Menu / Tooltip / Popover / Toast

**Engine:** `src/components/Overlay/overlay.js` — one focus-trap, Esc-to-close,
return-focus, `data-overlay-target` / `data-overlay-close` delegation serving all six.
CSS split token-only, one declaration per line:
`overlay-base.css` (scrim) · `overlay-dialog.css` (modal + drawer) ·
`overlay-menu.css` (menu + popover + tooltip) · `overlay-toast.css` (toast).
`overlay.css` is the `@import` barrel. Guardrail: no overlay decorates
Operate/Monitor screens beyond the modal.

## Stacking (single source of truth)

| Layer | Token | Used by |
|---|---|---|
| Page-anchored floats | `var(--z-index-dropdown)` | `.menu`, `.popover` |
| In-dialog floats | `var(--z-index-modal)` | `.menu--in-dialog`, `.popover--in-dialog` |
| Scrim | `var(--z-index-overlay)` | `.overlay` |
| Dialogs | `var(--z-index-modal)` | `.overlay__content`, `.drawer` |
| Pointer-only | `var(--z-index-modal)` | `.tooltip` (never focusable) |
| Always topmost | `var(--z-index-toast)` | `.toast-region`, `.toast` |

Stacked dialogs re-use the same tokens — the engine appends instances after
earlier ones so DOM order paints later dialogs on top; never invent raw
`z-index` numbers. Toasts always win. Tooltips never trap focus.

## 1. Modal

**When to use:** confirm a destructive act, complete a short blocking task
(achievement gem, create record), show content that needs full attention.
**Use X instead:** Drawer for filters / long forms / side detail; inline
expand for non-blocking detail; Toast + undo for low-risk confirmations.

**Anatomy:** `.overlay` (scrim) > `.overlay__content` >
`.overlay__header` (`.overlay__title` + `aria-describedby` `.overlay__desc` +
`.overlay__close`) + `.overlay__body` + `.overlay__footer` (actions, right-aligned).

**Variants:** sizes `.overlay__content--sm/md/lg/full`; placement
`.overlay--top` (anchored sheet) / default center / `.overlay--bottom`;
persistent `.overlay--persistent` (ignores scrim click + Esc — destructive flows
only, always offers an explicit close button) vs default dismissible.

**States:** `.overlay--open` (fade + rise via `var(--transition-fast)`);
`.is-closing` (exit to opacity 0, unmount after `var(--motion-duration-sm)`);
`prefers-reduced-motion` disables both; focus-trap active while open;
scrim click closes unless persistent; disabled backdrop `.overlay--no-scrim`
(transparent, pointer-events kept on content only).

**Tokens:**

| Slot | Token |
|---|---|
| Scrim | `var(--achievement-overlay-bg)` |
| Surface / border / radius | `var(--bg-surface)` / `var(--border-thin)` / `var(--radius-lg)` |
| Elevation | `var(--shadow-lg)` |
| Title / desc / close | `var(--text-primary)` / `var(--text-muted)` / `var(--text-muted)` |
| Close hover / focus | `var(--bg-interactive)` / `var(--focus-ring)` |
| Enter / exit | `var(--transition-fast)` / `var(--motion-duration-sm)` |
| Footer gap / padding | `var(--spacing-3)` / `var(--spacing-6)` |

**Dos:** one primary action, label close buttons accessibly, return focus.
**Don'ts:** no modal-on-modal (restack, don't nest), no auto-open on load,
no full-screen except `--full`, no form longer than 5 fields (use Drawer).

**A11y:** `role="dialog"` (`alertdialog` for destructive confirm),
`aria-modal="true"`, `aria-labelledby` → title id, `aria-describedby` → desc id;
focus moves to first control on open, traps with Tab wrap, Esc closes
(non-persistent), focus returns to opener; background `inert`; forced-colors
adds `CanvasText` border.

## 2. Drawer

**When to use:** filters panel, long/edit forms, side detail that keeps page
context visible. **Use X instead:** Modal for short blocking confirms;
Popover for tiny anchored hints; full page for deep workflows.

**Anatomy:** `.drawer` > `.overlay__header` + `.overlay__body` (scrolls) +
optional `.overlay__footer` (sticky actions). No scrim requirement —
page stays visible.

**Variants:** placement `.drawer--right` (default) / `--left` / `--top` /
`--bottom`; widths `--narrow` / default / `--wide`; persistent
`.drawer--persistent` (stays open beside content, no trap) vs dismissible
(scrim-less but Esc + close button).

**States:** `.drawer--open` (slide via `var(--transition-spring)`);
`.is-closing` (slides back); reduced-motion snaps with no transition;
dismissible traps focus like a modal, persistent does not; Esc closes
dismissible only.

**Tokens:**

| Slot | Token |
|---|---|
| Surface / edge / radius | `var(--bg-surface)` / `var(--border-thin)` / `var(--radius-lg)` |
| Elevation | `var(--shadow-lg)` |
| Width | `calc(var(--spacing-16) * N)` capped at `85vw` / `100%` |
| Slide | `var(--transition-spring)` / `var(--motion-easing-entrance)` |

**Dos:** sticky footer for primary action, scroll body not whole drawer.
**Don'ts:** no drawer wider than `--wide`, no drawer inside a modal,
no drawer for error/confirm messaging (use Modal/Toast).

**A11y:** `role="dialog"`, `aria-modal="true"` only when dismissible
(`false`/omitted + no trap when persistent), labelledby/describedby as Modal,
Esc + focus return as Modal.

## 3. Menu

**When to use:** action list from a button (⋯, sort, overflow). **Use X
instead:** segmented control / tabs for ≤3 always-visible actions; Popover
for rich non-action content; Tooltip never holds actions.

**Anatomy:** trigger (`aria-haspopup="menu"`, `aria-expanded`) + `.menu`
(`role="menu"`) > `.menu__item` (`role="menuitem"`, optional
`menuitemcheckbox/radio` + `aria-checked`) + `.menu__separator`.

**Variants:** anchored by engine (no placement classes — flips against
viewport); `.menu--in-dialog` re-layers to `var(--z-index-modal)`;
persistent (stays open during async, `aria-busy`) vs dismissible (default:
closes on select, Esc, outside click).

**States:** open (fade/scale `var(--transition-fast)`); item hover/focus
`var(--bg-interactive)`; selected check; disabled item
`var(--opacity-disabled)`, skipped in arrow-key nav; type-ahead supported.

**Tokens:**

| Slot | Token |
|---|---|
| Surface / border / radius | `var(--bg-surface)` / `var(--border-thin)` / `var(--radius-md)` |
| Elevation | `var(--shadow-md)` |
| Item text / hover / focus | `var(--text-primary)` / `var(--bg-interactive)` / `var(--focus-ring)` |
| Item padding / gap | `var(--spacing-2)` `var(--spacing-3)` |
| Disabled | `var(--opacity-disabled)` |

**Dos:** 4–10 short verb-led items, checkmarks for state, arrow-key nav.
**Don'ts:** no nested submenus beyond one level, no icons-only items,
no menu as a dialog replacement.

**A11y:** `role="menu"`/`menuitem`, trigger `aria-haspopup/expanded/controls`;
Roving tabindex + ArrowUp/Down/Home/End, Esc closes + refocuses trigger;
forced-colors shows `CanvasText` separator.

## 4. Tooltip

**When to use:** one-line label for an icon-only control or truncated text.
**Use X instead:** Popover for rich/interactive content; inline help text for
always-visible guidance; never for errors (use field error + `aria-describedby`).

**Anatomy:** trigger (keeps its accessible name — tooltip supplements, never
provides it) + `.tooltip` (`role="tooltip"`, id referenced by trigger's
`aria-describedby`), pointer-events none.

**Variants:** placement `[data-placement=top/bottom/left/right]`, auto-flip at
viewport edge; single-line only (wraps only via `--wrap` for touch long-press).

**States:** visible on hover/focus after short delay (`.tooltip--visible`,
`var(--transition-fast)`); hides on blur/unhover/Esc; reduced-motion removes
fade; never traps focus, never blocks pointer.

**Tokens:**

| Slot | Token |
|---|---|
| Surface / text | `var(--primitive-neutral-dark-700)` / `var(--primitive-gray-white)` |
| Radius / text size | `var(--radius-sm)` / `var(--font-size-xs)` |
| Padding | `var(--spacing-2)` |
| Fade | `var(--transition-fast)` |

**Dos:** ≤12 words, mirror the accessible name, delay before show.
**Don'ts:** no interactive content, no tooltip as the only accessible name,
no tooltip on disabled controls (describe the why inline instead).

**A11y:** `role="tooltip"`, trigger `aria-describedby` → tooltip id;
Esc dismisses; not focusable itself; forced-colors uses `Canvas`/`CanvasText`.

## 5. Popover

**When to use:** small rich panel anchored to a control (re-center, filter
summary, help card) that needs links/buttons but not a dialog.
**Use X instead:** Tooltip for plain one-liners; Menu for pure action lists;
Modal/Drawer when focus must trap.

**Anatomy:** trigger (`aria-haspopup="dialog"`, `aria-expanded`) +
`.popover` (`role="dialog"`, labelledby) > `.overlay__header`-lite title +
`.popover__body` (rich content ok).

**Variants:** placement `[data-placement=top/bottom/left/right]`, engine
re-centers on scroll/resize; `.popover--in-dialog` re-layers to
`var(--z-index-modal)`; persistent (form inside, explicit close) vs
dismissible (light-dismiss on outside/Esc).

**States:** open fade/scale `var(--transition-fast)`; `.is-closing` exit;
reduced-motion snaps; does NOT trap focus (single Tab-stop in, Esc returns);
disabled backdrop only (never a full scrim).

**Tokens:**

| Slot | Token |
|---|---|
| Surface / border / radius | `var(--bg-surface)` / `var(--border-thin)` / `var(--radius-md)` |
| Elevation | `var(--shadow-md)` |
| Title / body | `var(--text-primary)` / `var(--text-secondary)` |
| Padding | `var(--spacing-3)` |

**Dos:** max ~32ch wide, one focusable group, return focus on close.
**Don'ts:** no popover chains, no critical/destructive content, no hover-only
open for interactive popovers.

**A11y:** `role="dialog"` (non-modal, no `aria-modal`), labelledby title;
Esc closes + refocuses trigger; focus may move inside on open, returns on close.

## 6. Toast (snackbar)

**When to use:** transient confirm of a completed act ("Saved", "Deal moved"),
optionally with one action (Undo). **Use X instead:** Modal/alertdialog for
blocking errors; inline banner for persistent status; Tooltip never for status.

**Anatomy:** `.toast-region` (fixed stack container, placement modifier) >
`.toast` (`role="status"`) > message + optional `.toast__action` + optional
`.toast__close`. Queues, never overlaps dialogs.

**Variants:** region placement `--bottom-center` (default) / `--top-center` /
`--bottom-left` / `--bottom-right` / `--top-right`; tone `--success` /
`--danger` / `--warning` / default; persistent (has action, waits ~8s or
dismiss) vs auto (4s, `var(--motion-duration-xl)`-scale timing).

**States:** `.toast--visible` (rise `var(--transition-spring)`); `.is-closing`
(sink/fade); reduced-motion fades only; hover pauses the timer; action click
resolves + dismisses.

**Tokens:**

| Slot | Token |
|---|---|
| Surface / text | `var(--primitive-neutral-dark-700)` / `var(--primitive-gray-white)` |
| Radius / elevation | `var(--radius-full)` / `var(--shadow-md)` |
| Tone bar / icon | `var(--role-success-strong)` / `var(--role-danger-strong)` / `var(--role-warning-strong)` |
| Action text | `var(--primitive-citrine-300)` on dark pill |
| Enter / dwell | `var(--transition-spring)` / `~4s auto, ~8s with action` |

**Dos:** one line, past-tense verb, at most one action, queue multiples.
**Don'ts:** no stacking >3, no critical errors only in toast, no links that
need discovery time (use banner), no toast on Operate/Monitor beyond modal rule.

**A11y:** `role="status"` (`alert` for danger tone), container
`aria-live="polite"` (`assertive` for danger), auto-remove announced via live
region (no focus steal — Toast never takes focus); action reachable by Tab
while visible; forced-colors uses `Canvas`/`CanvasText`.
