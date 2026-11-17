# Lane E — paint budget: audit of the landed containment rules + transition narrowing

Repo `/Users/irfan/Documents/Portfolio Redo/crm_proj` @ `b97b1de` (+ my working-tree edits below; the tree is
shared with other lanes, so files outside my ownership were changing while I measured).
Write ownership: `src/components/**/*.css`, `src/patterns/**/*.css`. Port **5234**.
No `.jsx/.js`, `src/os`, `src/device`, `src/glass`, tokens, or build/test/ds-track/generate commands were touched.
Nothing committed.

**Outcome in one line:** all 10 containment declarations already at HEAD survive the audit (0 px where the page
is deterministic, geometry byte-identical everywhere); 25 over-broad transition shorthands in 18 files are now
explicit property lists with a proof that no state-changing property was dropped; the two remaining categories
(layout-property animations, shadow stacks) are **reports, not edits** — each candidate was measured and failed
the identity bar, so they are listed as proposals with `file:line`.

---

## 0. Method (and what it can and cannot prove)

Harness: `.hermes/cache/scratch/lane-e/harness.mjs` (puppeteer-core already in `node_modules`, headless Chrome,
one browser serially, `--force-color-profile=srgb`, `--hide-scrollbars`). App entry:
`http://127.0.0.1:5234/?app=fullscreen` at **393×852, DPR 3**.

Freeze protocol (applied identically to every arm):

1. stop the rAF loops (`window.requestAnimationFrame = () => 0`, after load),
2. inject `*,*::before,*::after{animation:none!important;transition:none!important}` (deterministic, unlike
   `animation-play-state:paused`, which freezes at a random progress),
3. freeze the clock text, settle 2.5–3.5 s,
4. **repeat gate**: two consecutive captures must be byte-identical (0 px / Δ0) before any A/B is trusted.

No whole-page diff is used. Every number below is a diff of a named region (CSS px clip), reported as
`diffPx / maxChannelDelta` with the region's device-pixel total.

Non-determinism found and handled (measured, not assumed):

| region | behaviour | handling |
|---|---|---|
| feed, strip, empty state, sheets' cards/lists/rows, panel edges | repeat capture 0 px / Δ0 | byte-identical gate |
| `.map-sheet__header` band (backdrop blur) and `.reward-sheet__layer` | flip between **two** raster states by themselves: intra-A/A diffs up to **4 527 px Δ1** (header) and **5 186 px Δ1** (layer, bbox `0.7,764 → 381,851` = skeleton/card strip) | A/B **interleaved** 4×4 trials; verdict only if the inter (rule-off) distribution stays inside the intra distribution |
| live leaflet tiles/pins `.map-sheet__view` | re-render noise | hidden for the two sheet tests; the map **host** still paints edge-to-edge and still bleeds 18 px past the panel, so the clip evidence is unchanged |
| page-level | 1 px Δ1 flicker in the map box (`194,342 → 228,421`) | outside every measured region |

---

## 1. Audit of the containment rules already at HEAD

Verdicts are `keep` / `reject`. `necessary` = does it buy containment that the element did not already have;
`sufficient` = is it as strong as the element can safely take; `clip risk` = can it hide something that paints
outside the box. Geometry was measured **with the rule and with `contain:none!important`** on the same live page.

| # | file:line | declaration | necessary | sufficient | clip risk (measured) | frozen diff (rule on vs off) | verdict |
|---|---|---|---|---|---|---|---|
| 1 | `src/components/OpportunityCard/opportunity-card.css:9` | `.opp-card{contain:layout}` | yes — 4 repeated cards in one scroll container | `layout` only is correct: the card has `overflow:visible` and a focus-ring child (`.opp-card__actions button:focus-visible`), so `paint` would add a clip for no gain | none — layout containment never clips; **0 descendant overhang** (measured), the only `box-shadow` in the file is the button focus ring, which sits 16 px inside the padding | cards region `0,545 393×150`: gate **0/0** (530 550 px), off **0/0**, restored **0/0** | **keep** |
| 2 | `src/patterns/EmptyState/empty-state.css:8` | `.empty-state{contain:layout paint}` | yes — a static block that would otherwise join the feed's paint invalidation set | yes — no interactive children, no shadow, no negative margin | none — content box 361×114, children 327×23 and 327×17 both fully inside, measured in both arms | region `16,88` ±4: gate **0/0** (405 162 px), off **0/0** | **keep** |
| 3 | `src/patterns/ActivityStrip/activity-strip.css:11` | `.activity-strip{contain:layout paint}` | yes — 250 descendants (56 bars × gem/bar/dot), repainted on every feed scroll | yes — see the bleed check below | **none new.** The paint box is `x=0 w=393` at a 393 viewport: the `margin:0 -16px` bleed sits *inside* the element's own box (parent padding 16 px), so the box covers the bleed exactly. Vertical child overhang is **0.00 above / 0.00 below**; the 161 descendants the overhang probe flags are all horizontal **scroll content** (up to 737 px to the right), which `overflow:auto` clips at HEAD independently of `paint` — the rule cannot clip anything the scroller does not already clip | strip region `0,131 393×102`: gate **0/0** (360 774 px), off **0/0**, restored **0/0** | **keep** (no downgrade needed) |
| 4 | `src/patterns/OppsHome/nearby-sheet.css:6` | `.map-sheet__panel{…overflow:hidden;contain:layout paint}` | yes — isolates the whole live map | yes — the panel is `inset:0`, so `paint` and `overflow:hidden` clip at the same padding box | none — the 18 px tile-layer bleed is clipped by both, identically; left and right edge strips `0..12 / 381..393 × 480` diff **0/0** (51 840 px each) | card region `12,624 369×216`: gate **0/0** (717 336 px), panel-off **0/0**, restored **0/0**; 20 interleaved A/B pairs: intra 0, inter 0 | **keep** |
| 5 | `src/patterns/OppsHome/nearby-sheet.css:22` | `.map-sheet__header{…overflow:hidden;contain:layout paint}` | marginal — it is a 74 px band, but it carries the only `backdrop-filter` over the map | yes | none — `::before` bleeds `-1px` on top (`inset:-1px 0 0`) and that is **already** clipped by the existing `overflow:hidden`; geometry of header/title/sub/close identical on/off | band `0,0 393×74`: deterministic gate impossible (self-flip, see §0); interleaved 4×4 → intra max **4 527 px Δ1**, inter max **4 527 px Δ1**, medians 0 / 3 840 → the rule's differential never leaves the band's own raster flip | **keep** |
| 6 | `src/patterns/OppsHome/nearby-sheet.css:27` | `.map-sheet__list{…overflow-y:auto;contain:layout paint}` | yes — scroll container inside a painted card | yes | none — the scroller's own clip is the same box; row buttons carry no custom ring (`outline` is UA default and already clipped by `overflow-y:auto`) | list region `25,645 343×182`: gate **0/0** (561 834 px), off **0/0**, restored **0/0** | **keep** |
| 7 | `src/patterns/OppsHome/nearby-sheet.css:28` | `.map-sheet__row{contain:layout}` | **weak** — 3 rows, each a flex line; no measurable win | `layout` only, correct (rows have an ellipsised name and a 44 px button; `paint` would clip the UA focus outline) | none — 3 rows at `y=645/705/766`, heights 60/61/61 px, identical rects on/off; no overhang | rows region: gate **0/0**, off **0/0** | **keep, low value** (inert; removing it is also inert, so leaving it costs nothing) |
| 8 | `src/patterns/OppsHome/reward-sheet.css:7` | `.reward-sheet__panel{…overflow:hidden;contain:layout paint}` | yes — same contract as #4 | yes | none — same padding-box clip as its own `overflow:hidden` | card region `0..393 × 69` band: gate **0/0**, off **0/0**, restored **0/0** | **keep** |
| 9 | `src/patterns/OppsHome/reward-sheet.css:10` | `.reward-sheet__layer{…overflow:hidden;contain:layout}` | yes — the layer is the flex centre that holds the WebGL gem; layout containment keeps gem resizes out of the feed's relayout | `layout` is the right ceiling: `.gem-stage` scales/translates inside and the skeleton sits at the bottom edge — `paint` would clip the stage's `scale(0.88)→1` overshoot | none (no `paint`) | layer `429×888 at (−18,−18)`: interleaved 4×4 → intra max **5 186 px Δ1**, inter max **5 186 px Δ1**, median 0 → inside the layer's own flip; geometry (layer/stage/text/card/close) identical on/off | **keep** |

### Geometry ledger (rule on = rule off, else noted)

| element | rect (CSS px) | scroll/client |
|---|---|---|
| `.activity-strip` | `0,131 393×100` | scrollW 1146 / clientW 393 |
| `.opp-card` (first) | `16,552 361×232` | 359 / 230 |
| `.opps__list` | `16,552 361×964` | 361 / 964 |
| `.empty-state` (+ title, body) | `16,88 361×114` · `33,121 327×23` · `33,152 327×17` | identical on/off |
| `.map-sheet__panel` / `__map` | `0,0 393×852` / `−18,−18 429×888` | docScrollH 852 both arms |
| `.map-sheet__header` (+ title, sub, close) | `0,0 393×74` | identical on/off |
| `.map-sheet__list` / `__row` ×3 | `25,645 343×182` · `y=645/705/766, h=60/61/61` | identical on/off |
| `.reward-sheet__layer` / `.gem-stage` / `.gem-reward__text` | `−18,−18 429×888` · `26.5,184.5 340×320` · `52.39,516.5 288.2×87` | identical on/off |

### Post-edit parity (transition narrowing changed nothing at rest)

Captured after all edits and compared byte-for-byte with the pre-edit captures of the same frozen regions:

| region | vs pre-edit capture |
|---|---|
| activity strip `0,131 393×102` | **0/0** |
| feed cards `0,545 393×150` | **0/0** |
| empty state `16,88 361×114` ±4 | **0/0** |

**Why this is not a frame-time claim.** Headless Chrome exposes no `LayerTree` (lane 7 verified twice) and
`LayoutDuration`/`RecalcStyleCount` do not move for paint containment — there is no main-thread metric in this
environment that a paint-containment edit can shift. The win is structural (each box leaves the ancestor's
paint-invalidation set) and I deliberately quote no number for it.

---

## 2. (a) Transitions/animations on layout properties — all five are proposals

Full sweep of my files for `transition`/`@keyframes` on `width|height|top|left|right|margin|padding|box-shadow|filter|background-position`.
Four hits, all still at HEAD; each was checked against the "identical rendering" bar.

| file:line | declaration | why it cannot become transform/opacity | status |
|---|---|---|---|
| `src/components/GoalBar/goal-bar.css:27` | `transition: width var(--transition-spring)` | the fill carries `.goal-bar__label` / `.goal-bar__value` **inside** the animated box; a `scaleX` fill would stretch the text and the 3 px end padding. Identical-only equivalent needs a two-layer fill (outer `width` fixed, inner `transform:scaleX` with counter-scaled text) = markup change, not mine | proposal P2 |
| `src/components/Sparkline/sparkline.css:22` | `transition: height var(--transition-fast)` | bars are `flex:1` with `border-radius: var(--radius-xs)` caps and a `--stroke` variant that is a 2 px **border** box; `scaleY` distorts both the cap radius and the stroke weight | proposal P3 |
| `src/components/Accordion/accordion.css:57` | `transition: grid-template-rows var(--motion-duration-md) …` | `0fr→1fr` *is* the mechanism (auto-height panel). A composited version needs a measured fixed height — different mechanism, different failure modes | proposal P4 |
| `src/components/Table/table.css:84` + `@keyframes table-shimmer` `:86` | `animation: table-shimmer …` animating `background-position: -200% 0` with `background-size:200% 100%` | a paint-per-frame shimmer. A `transform` overlay is the standard fix but the gradient's tile seam is not provably identical at the 200 % wrap | proposal P5 (no `.table` node exists in the app DOM — gallery only) |
| `src/patterns/OppsHome/opps-home.css:24` | `.opps__map{transition:filter .16s ease-out}` (`[data-pressed="true"]{filter:brightness(.96)}`) | **measured, not identical.** I built the composited equivalent (`.opps__map::after` = `--primitive-gray-black` at `opacity:.04` above the nearby pill at `z-index:1200`, `filter` removed): at the pressed state **35 716 of 682 290 device px differ, maxΔ 9 (5.2 %)** — pure-black-at-4 % is `0.96×` per channel, but Chrome's filter path and alpha compositing round differently, and the map's own dither survives one and not the other. Rest state with the overlay present is 0/0 | proposal P1 |

The selector also carries `will-change`-free `transform` press feedback deliberately (see its comment), and
`.reward-sheet.css:34` already transitions `transform` only. No `transition: all` remains anywhere in
`src/components` or `src/patterns` (`0` matches).

---

## 3. (b) `transition: all` / over-broad lists → explicit property lists — LANDED

`transition: var(--transition-fast)` was the worst offender in this codebase: the token is
`150ms cubic-bezier(.4,0,.2,1)` — duration + easing only, so the shorthand expands to **`all 150ms …`**.
Every style mutation on those elements was animated, including the ones that force layout.

**25 declarations in 18 files** replaced (all inside my ownership, all files still ≤ 99 content lines, 0 raw hex):

| file:line | new list |
|---|---|
| `src/components/Avatar/avatar.css:85` | `background-color, border-color, opacity, outline` |
| `src/components/Button/button-base.css:18` | `background-color, border-color, color, box-shadow, opacity, outline` |
| `src/components/Checkbox/checkbox.css:31` | `background-color, border-color, box-shadow, opacity` |
| `src/components/Checkbox/checkbox.css:63` | `opacity, transform` |
| `src/components/Chip/chip.css:16` | `background-color, border-color, color, box-shadow, opacity, outline` |
| `src/components/ListRow/list-row.css:16` | `background-color, border-color, opacity, outline` |
| `src/components/Radio/radio.css:41` | `background-color, border-color, box-shadow, opacity` |
| `src/components/Radio/radio.css:52` | `opacity, transform` |
| `src/components/Search/search.css:15` | `color, background-color, border-color, border-style, box-shadow, opacity, outline` |
| `src/components/Search/search.css:60` | `color, background-color` |
| `src/components/Select/select.css:17` | `background-color, border-color, box-shadow, opacity, outline` |
| `src/components/Select/select.css:52` | `color, transform` |
| `src/components/Slider/slider.css:23` | `border-color, box-shadow` |
| `src/components/StatusPill/status-pill.css:64` | `background-color, border-color, color, opacity, outline` |
| `src/components/Switch/switch.css:28` | `background-color, border-color, box-shadow, opacity` |
| `src/components/Switch/switch.css:45` | `transform` |
| `src/components/Switch/switch.css:51` | `opacity` |
| `src/components/TextInput/text-input.css:26` | `color, background-color, border-color, border-style, box-shadow, opacity, outline` |
| `src/components/Overlay/overlay-base.css:13` | `opacity, visibility` (visibility must stay: it is what holds the fade-out; without it the overlay disappears on frame 0) |
| `src/components/Overlay/overlay-dialog.css:14` | `transform` |
| `src/components/Overlay/overlay-drawer.css:15` | `transform` |
| `src/components/Overlay/overlay-menu.css:14` | `opacity, transform` |
| `src/components/Overlay/overlay-menu.css:61` | `opacity, transform` |
| `src/components/Overlay/overlay-toast.css:44` | `opacity, transform` |
| `src/components/Overlay/overlay-tooltip.css:13` | `opacity, transform` |

### Three audit catches inside this work

1. **Lane 6 had already narrowed `.chip` but dropped `box-shadow`** (`chip.css:16` at HEAD listed
   `background-color, border-color, color, opacity`). `.chip--dragging` sets `box-shadow: var(--shadow-md)`,
   so the drag shadow was snapping in instead of fading — a real (if small) regression from the interrupted
   lane. Restored; `outline` added for the same reason.
2. **`outline` was missing everywhere.** `:focus-visible` rules in these files declare `outline`
   (`button-base:70`, `avatar:91`, `status-pill:70`, `list-row:28`, `chip:50`, and the error/success focus
   outlines in `text-input`, `search`, `select`). Under `all` the ring's width/colour animated; without the
   property it would pop. Re-added — it is cheap (no layout) and keeps the transition faithful.
3. **`border-style` must stay on the two inputs** (`text-input:26`, `search:15`): `:read-only` swaps the
   border to `dashed`, and a disabled input is also `:read-only`, so disabling changes `border-*-style`.
   Measured below; without it the dash would flip instantly instead of at the original 50 % step.

### Proof that no state-changing property was dropped

Two independent checks, both automated.

**(i) Deterministic, from the files** (`.hermes/cache/scratch/lane-e/coverage2.mjs`): for each component, take
the union of the declarations in its **own** `:hover/:active/:focus/:checked/:disabled/:read-only/:indeterminate`
and variant-class rules (media queries with `forced-colors`/`prefers-*` excluded), apply them to a fixture via a
throwaway class, and diff the full computed style rest vs state. Shorthands in the transition list are expanded
to their longhands before the check (`border-color`→4 sides, `outline`→3, `border-style`→4). Result:

| component | changed properties | uncovered |
|---|---|---|
| `.chip` | background-color, opacity, outline-{color,width,style} | — |
| `.btn` | 4 border-*-color, box-shadow, opacity, outline-* | — |
| `.avatar--clickable` | 4 border-*-color | — |
| `.status-pill--clickable` | opacity | — |
| `.field__input` | color, background-color, 4 border-*-color, 4 border-*-style, box-shadow, opacity, outline-{color,width} | — |
| `.search__input` | color, 4 border-*-color, 4 border-*-style, box-shadow, opacity, outline-{color,width} | — |
| `.select__input` | 4 border-*-color, box-shadow, opacity, outline-* | — |
| `.list-row` | outline-* | — |
| `.overlay` / `.overlay__content` / `.drawer` / `.menu` / `.toast` / `.tooltip` | border/shadow/colour declarations only from the excluded forced-colors media block → none at runtime | — |

**components with uncovered properties: 0.**

**(ii) Empirical, with real input** (`.hermes/cache/scratch/lane-e/states.mjs` and the small probes): fixtures +
the component's own stylesheet, `:hover`/`:active` from a real pointer, `:focus-visible` forced through
`CSS.forcePseudoState`, class states by class toggle, `transition-duration:0s!important` so the read values are
end-states. 31 state reads across 17 components; every changed property was in the list. Three of them
(`.chip` hover, `.list-row` hover, `.avatar` hover) read "no change" because headless Chrome did not stick the
pointer `:hover` on that fixture — those are covered by check (i) instead, and their `:active`/`:focus` reads
(both on the same property set) did register. Two by-products worth recording:

- `text-decoration-color` shows up as "changed" whenever `color` changes (it computes from `currentColor`).
  No element in these components sets `text-decoration-line`, so nothing paints — deliberately **not** listed.
- Width/height/font-size *variant* classes (`.avatar--lg`, `.switch--sm`, `.select__input--lg`, …) are **not**
  in the lists. That is the point of the exercise: those are render-time variants, and animating them was the
  layout-transition cost `all` was paying. No component in `src/` toggles a size-variant class at runtime
  (`grep -rn 'classList\.\(add\|toggle\|remove\)' src | grep -E '--(xs|sm|md|lg|xl|screen|full|wide|narrow)'`
  returns nothing).

Known limit: `getComputedStyle(el,'::-webkit-slider-thumb')` returns the host's style in headless Chrome, so
`slider.css:23` was verified by CSSOM instead — `rule.style.getPropertyValue('transition')` returns
`border-color var(--transition-fast), box-shadow var(--transition-fast)`, i.e. the declaration parsed, and
`border-color`/`box-shadow` are the only two properties any `.slider` state rule changes
(`:hover`→`border-color`+`--shadow-md`, `:active`→`--focus-ring`, `:focus-visible`→`--focus-ring`).

Rest-state parity after the whole edit (see §1): strip **0/0**, cards **0/0**, empty state **0/0**.

---

## 4. (c) Shadow stacks — measured, nothing safe to collapse

Census first, because the premise matters:

- **No repeated card type declares a shadow at all.** `funnel-card.css`, `profile-card.css`, `list-row.css`,
  `timeline.css`, `kpi.css` contain **0** `box-shadow` declarations; `opportunity-card.css` has exactly one, the
  button focus ring. All of them are hairline-border cards by "card law", and `.opp-card` computes
  `box-shadow: none` in the live feed. There is no shadow stack on a repeated card to collapse.
- The only multi-layer stacks in my files are **5 single-instance elements**: the two glass close buttons
  (3 layers each: `nearby-sheet.css:16`, `reward-sheet.css:27`) and the two morph windows
  (`nearby-sheet.css:10`, `reward-sheet.css:9` — 2 layers with `var(--win-ring/--win-sh)` alpha, i.e. dynamic
  by construction), plus `.opps__nearby`'s single `--shadow-md`.

I measured each layer's actual contribution on `.map-sheet__close` (region `72×78` CSS px = 50 544 device px,
focus ring removed, gate **0/0**, stack verified as
`0 8px 28px rgba(15,16,21,.08), 0 1px 2px rgba(15,16,21,.05), inset 0 1px 0 rgba(255,255,255,.42)`) by
replacing the stack with the stack minus one layer:

| removed layer | pixels changed | maxΔ | verdict |
|---|---|---|---|
| `0 1px 2px rgba(15,16,21,.05)` | 2 189 | 8 | visible — not collapsible |
| `inset 0 1px 0 rgba(255,255,255,.42)` | 1 632 | 3 | visible — not collapsible |
| `0 8px 28px rgba(15,16,21,.08)` | 36 113 | 9 | the main cast shadow |
| keep only the cast shadow (drop both others) | 2 683 | 8 | visible |

**Verdict: reject.** No layer is provably invisible, and no two layers are geometrically equal, so there is no
single equivalent value that does not weaken the shadow. No edit made.

---

## 5. Proposals (measured, not landed — each changes pixels or feel)

| # | file:line | proposal | measured status |
|---|---|---|---|
| P1 | `src/patterns/OppsHome/opps-home.css:24` | replace `transition: filter` + `filter:brightness(.96)` with a `::after` black overlay at `opacity:.04` (composited; kills a full 361×210 re-raster of the map at DPR 3 for 160 ms on every touch-down) | pressed state differs on **35 716/682 290 px, maxΔ 9 (5.2 %)** from the filter arm; rest state 0/0. Needs an owner decision (or accept "instant dent": keep `filter`, drop only the transition — zero pixel change, one raster instead of ~10, but no fade) |
| P2 | `src/components/GoalBar/goal-bar.css:27` | `transition: width` → two-layer fill with `transform:scaleX` + counter-scaled label | text lives inside the animated box → not identical as-is; needs markup |
| P3 | `src/components/Sparkline/sparkline.css:22` | `transition: height` → `scaleY` with `transform-origin:bottom` | distorts `radius-xs` caps and the `--stroke` variant's 2 px border |
| P4 | `src/components/Accordion/accordion.css:57` | `transition: grid-template-rows` → measured-height + transform mechanism | different mechanism; the current one is the better a11y/no-JS trade |
| P5 | `src/components/Table/table.css:84,86` | `background-position` shimmer → transform overlay | gradient seam not provably identical at the 200 % wrap; gallery-only surface |
| P6 | `src/patterns/OppsHome/reward-sheet.css:37` | **dead CSS found:** `.activity-strip__bar[role="button"]:focus-visible{outline:var(--focus-ring)}` — `--focus-ring` is a *box-shadow* token (`0 0 0 2px …`), so the shorthand is invalid and is dropped: measured computed `outline: 3px none`, `outline-offset:2px`, `box-shadow:none` on the focused peak bar. The bar is a real `role="button" tabindex="0"` that the reward sheet focuses on close → **it has no visible keyboard focus ring.** Fix is `outline: var(--border-width-medium) solid var(--primitive-sapphire-ui-400)` (what every other focus rule in the DS uses) — changes pixels, so owner call | a11y gap, pre-existing |
| P7 | `src/patterns/ActivityStrip/activity-strip.css` (`contain: paint`) | once P6 is fixed, re-check the ring against the strip's clip box: the bar's bottom edge sits 2 px above the padding-box clip (`lastBar` bottom 229 vs clip 231) and a 2 px outline + 2 px offset needs 4 px, so a *future* real ring would be clipped 2 px at the bottom. Today it is moot (no ring renders) | blocked on P6 |
| P8 | `src/patterns/OppsHome/nearby-sheet.css:28` | drop `.map-sheet__row{contain:layout}` as low value | inert either way (geometry identical, 0/0); listed only so the next audit does not re-derive it |
| P9 | `src/components/OpportunityCard/opportunity-card.css:9` | `content-visibility:auto` + `contain-intrinsic-size:auto 232px` on feed cards — **not attempted**: the dock lens clones the feed 15× (lane 7), so a skipped offscreen card would also be skipped inside the mirrored copy, and `scrollHeight` identity would have to hold for both. Out of scope for a zero-pixel lane | untested by design |
| P10 | `src/components/OpportunityCard/opportunity-card.css:9` | upgrade to `contain:layout paint` on the repeated card (4 instances, no shadow, zero child overhang) | plausible but a *new* rule, outside this lane's brief; not landed, not measured |

---

## 6. Observations outside my ownership (not touched)

- `?app=fullscreen` logs a standing page error: `TypeError: map.setBearing is not a function` at
  `src/patterns/OppsHome/live-map.js:32` (`applyBearing`). It fires on load and does not stop the map from
  painting, but it is a live defect on the app path (lane 5's file).
- The dock lens (`.docklens`, 92 % of the DOM) still mirrors the feed; every measurement here was taken on the
  unmodified dock.

## 7. Repro

```
cd "/Users/irfan/Documents/Portfolio Redo/crm_proj"
npx vite --port 5234 --host 127.0.0.1 --strictPort      # dev server
node .hermes/cache/scratch/lane-e/probe3.mjs            # freeze + repeat-gate + noise bbox
node .hermes/cache/scratch/lane-e/audit1.mjs            # strip / cards / empty: gate, rule-off, geometry
node .hermes/cache/scratch/lane-e/audit3.mjs            # nearby + reward sheets (A/B/A per rule)
node .hermes/cache/scratch/lane-e/audit4.mjs            # interleaved 4×4 A/B for the two non-deterministic bands
node .hermes/cache/scratch/lane-e/mapfilter2.mjs        # P1 filter→overlay measurement
node .hermes/cache/scratch/lane-e/coverage2.mjs         # (b) property-coverage proof
node .hermes/cache/scratch/lane-e/shadow.mjs            # (c) per-layer shadow contribution
node .hermes/cache/scratch/lane-e/final.mjs             # post-edit rest-state parity vs pre-edit captures
```
Harness lives in the scratch dir, not the repo; no fixture page was added.
