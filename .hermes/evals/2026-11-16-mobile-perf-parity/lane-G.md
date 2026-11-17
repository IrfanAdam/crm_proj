# Lane G — independent audit of `b97b1de` (mobile-perf-parity build)

**Auditor:** independent verifier. No repo code written; this file is the only artifact.
**Question:** did the landed build actually make the phone smoother, and is anything in it broken or fake?
**Method:** every number below was measured by me on a **frozen copy of the commit**, not read back from a
lane report and not taken from the dirty working tree.

- Subject: `git archive b97b1de | tar -x -C $TMPDIR/verify-b97` (node_modules symlinked). Byte-identical to the
  commit — `diff <(git show b97b1de:index.html) verify-b97/index.html` → identical.
- Baseline for A/B: `git archive 6b6b828` → `$TMPDIR/verify-before`, built with its own `vite.config.js`
  (`dist/` inside the scratch copy, because HEAD's `rawSourceRefsPlugin` hardcodes `dist`).
- Builds: `vite build --outDir $TMPDIR/verify-dist` for the subject; the baseline built in-place into its scratch
  `dist/`. Both served by `python3 -m http.server 5236 --bind 127.0.0.1` (port 5236 only; **identity encoding**,
  see §1.3 for what that does to byte totals).
- Browser: `chromium_headless_shell-1243`, one at a time, own profile, `Emulation.setDeviceMetricsOverride`
  393×852 DPR3, mobile+touch, CDP over raw `ws`.
- Gates run read-only inside the frozen tree.

Environment caveat that governs every fps number below: this machine has **no GPU**; WebGL runs through
SwiftShader. With the gem on screen the page renders at **0.5–0.9 fps**, so absolute frame rates and
"p95 frame" claims are not measurable here. Ratios, counts and per-frame clocks are measurable and those are
what I report.

---

## 0. Verdict table

| # | Claim (as landed / as reported) | Verdict | My number |
|---|---|---|---|
| 1 | `dist/index.html` 26 tags / 25 parser-blocking → **4 tags / 0 blocking** | **PASS** | 4 tags (1 module + 3 `defer`), **0** blocking. Baseline reproduces 26/25 exactly |
| 2 | 22 requests removed; "requests 54 → 32"; 30 → 8 script requests | **PASS on direction, FAIL on the stated count** | 63 → 41 requests (−22, exactly the collapsed scripts); 30 → 8 script requests. I measure 41, not 32 |
| 3 | Vendored three.js loads, `window.THREE` is r160, gem is WebGL not `GEM_FALLBACK` | **PASS** | `/vendor/three.min.js` fetched once, 670,078 B, `THREE.REVISION === "160"`, canvas `webgl2`, `452 tris / 5 calls` |
| 4 | Offscreen gem rAF **10–12/s → 0** | **PASS** | Instrumented gem loop: **21.47 callbacks/s → 0/s**. Page-wide rAF while idle+parked: **85.9/s → 0/s** |
| 5 | Forced reflow **2.6–3.2/s → 0** | **PASS structurally, number UNPROVEN** | Per-frame `getBoundingClientRect` poll is gone from the frame (source + 0 in-frame reads measured). Hover now costs **1.07 gBCR per pointermove, 0 per frame**. The 2.6–3.2/s magnitude did not reproduce in this env |
| 6 | **Falsification — resume must not jump phase** (lane did not run this) | **PASS — no jump** | `t` frozen while parked (drift = 0.05 = one in-flight frame), resumes from the frozen value, max single-frame Δt = **0.05 s = the pre-existing clamp**, `rotation.y` monotone. No accumulation of park time, no reset |
| 7 | Other MPA pages unaffected by the index-only gem-boot scoping | **PASS** | gallery 27 gem tags, pitch 25, cube 2, deck 1 — unchanged, same console errors as baseline (all pre-existing) |
| 8 | Every touched file ≤100 lines, no raw hex outside tokens | **PASS** | 30 touched text files: max `split('\n')` = 100 (content 99); **0** raw hex introduced |
| 9 | Scroll: LayoutDuration **73.8 → 6.1 ms**, long tasks **51 → 7**, LayoutCount 85 → 41 | **PASS on direction, magnitudes NOT reproduced** | LayoutCount **86 → 41** (matches); LayoutDuration **34.2 → 11.2 ms** (3.1×, claimed 12×); long tasks **33 → 16** (claimed 51 → 7) |
| 10 | Zero pixel change | **PASS for the feed** | Byte-identical PNGs at rest and at scrollTop 760 (1179×2556): **0.0000 % differ, maxΔ 0**. Maps hidden + animations frozen by protocol |
| 11 | Repo gates green | **PASS** | `node scripts/lint-tokens.mjs` exit **0** (0 leaks, 0 over-limit, 1702 files); `node scripts/plan-names.mjs` exit **0** (22 plans) |
| 12 | Gem crease fix (`047febc`) present | **PASS** | shader source has `dot(n1,n2) > 0.9935`; `0.974` survives only in a comment |
| 13 | deck3d / cube3d / illusion3d / gooey parking | **PARTIAL — source-verified + still renders; offscreen behaviour not instrumented** | deck/cube/illusion rigs still draw (`frames+9/+5/+4`, tris 2 / 26 944 / 21 538). gooey only source-read |

---

## 1. Load path (claim 1–3)

### 1.1 Structure — reproduced exactly

```
$ cd $TMPDIR/verify-b97 && npx vite build --outDir $TMPDIR/verify-dist
../verify-dist/index.html  8.96 kB │ gzip 2.85 kB
../verify-dist/vendor/gem-boot.js  110.52 kB      (110,673 B raw, matches lane 2)
raw-source-refs — copied 122 raw source files
```

`dist/index.html`, subject build:

| fact | baseline 6b6b828 | b97b1de |
|---|---|---|
| `<script src>` tags | **26** | **4** |
| parser-blocking (classic, no defer/async) | **25** | **0** |
| module tags | 1 | 1 |
| `defer` tags | 0 | 3 |
| `modulepreload` links | 2 | 3 (polyfill, gooey chunk, **hashed entry**) |
| gem script requests on `/` | 23 | **0** |
| `dist/src/` raw copies | 122 files | 122 files (not shrunk — as documented) |

The documented before-state ("26 tags / 25 blocking") reproduces exactly from a build of `6b6b828`.
The after-state matches lane 2's claim. **This claim is real.**

### 1.2 Runtime — three.js and the gem are genuinely WebGL

Cold load of `/index.html?app=fullscreen`, cache disabled:

```json
{ "three": true, "revision": "160", "ctx": "webgl2",
  "threeFetched": [{ "url": "/vendor/three.min.js", "bytes": 670078, "count": 1 }],
  "gemScriptRequests": [], "pageErrors": [] }
```

With the reward sheet open (`renderer.info.render`): **triangles 452, calls 5**, canvas 340×320, `webgl2`.
`GEM_FALLBACK` exists as a namespace object but was **not** used — the rig has a real `THREE.WebGLRenderer`
and a non-zero triangle count, which is the only reliable check (a fallback gem paints plausibly).
`/vendor/gem-boot.js` is fetched exactly once; no `GemReward/*.js` request exists on `/`.

### 1.3 Requests and bytes — one claim does not reproduce

| metric (cold, cache disabled) | baseline | b97b1de |
|---|---|---|
| requests | **63** | **41** (−22) |
| script requests | **30** | **8** (−22) |
| total wire bytes | 1,241 KiB | 1,826 KiB (**+585 KiB**) |
| three.js wire | cdnjs 136,156 B (brotli) | `/vendor` 670,078 B (identity) |

Two honest corrections to lane 2's table:

1. **"requests 54 → 32" is not what I measure.** My counts are 63 → 41. The delta (−22) is identical and is
   exactly the 22 collapsed scripts, but the absolute baseline differs because my load includes 20 avatar
   image requests (10 unique, each fetched twice) and 4 ArcGIS tiles that their run evidently did not count.
   Request count is not a stable metric on this page; **the −22 script requests is the stable, real number.**
2. **Total bytes went UP, not down.** That is the identity-encoding artifact, not a regression: my server sends
   no `Content-Encoding`, so the vendored three.js crosses the wire at 670 KB where cdnjs sent 136 KB brotli.
   My JS total is 1.45 MB uncompressed ≈ 400 KB gzipped — consistent with lane 2's 390,862 → 406,379 B gzip
   claim. **I could not verify the byte table** (needs a compressing origin); I verified the request table.

Boot time: the baseline's first-paint path depends on a third-party CDN and 25 serial round trips. One baseline
run needed **4 navigations (37.5 s)** before the feed mounted; subject runs mounted in **0.5–2.2 s** on the
first attempt. Directionally this is the biggest real user-facing win of the build, but n=1 on the slow outlier —
treat it as illustrative, not as a number.

---

## 2. Parking claims + the falsification the lane skipped (claim 4–6)

### 2.1 Method

Instrumentation injected with `Page.addScriptToEvaluateOnNewDocument` **before any page script**:
wrappers on `requestAnimationFrame` (counting *invoked* callbacks), `Element.prototype.getBoundingClientRect`,
and the `clientWidth/clientHeight/offsetWidth/offsetHeight/offsetParent` getters; a `longtask` observer;
CDP `Performance.getMetrics` deltas.

Because the page-wide rAF counter mixes every caller (map breath, status bar, morph driver…), I also counted
**the gem loop itself**: one counter statement inserted at the top of the loop *in the built artifact*
(`verify-dist/vendor/gem-boot.js` and `verify-before/dist/src/components/GemReward/gem3d.js` — scratch copies,
never the repo). That yields the gem's own callbacks/s.

"Offscreen" = `#reward-layer.style.transform = 'translateY(-2400px)'` → a real IntersectionObserver
non-intersection (the canvas box does not change).

### 2.2 Result — the hot loop is really gone

| metric, 2 s windows, 393×852 DPR3 | baseline | b97b1de |
|---|---|---|
| **gem loop callbacks/s, gem OFFSCREEN** | **21.47** | **0** |
| page-wide rAF/s, gem offscreen | 85.87 | **0** |
| `rig.raf` handle scheduled while offscreen | yes (hot chain) | no |
| gem renders/s, gem offscreen | 0 | 0 |
| gem renders/s, gem onscreen | 0.76 | 0.77 (unchanged) |
| gem renders/s after returning onscreen | 0.71 | 0.76 |
| `getBoundingClientRect`/s while idle | 0 | 0 |
| `clientWidth/Height` + `offset*` reads/s | 0 | 0 |

Lane 4 reported 10–12/s → 0 under a 4× CPU throttle; I measure **21.5/s → 0** unthrottled. Same defect, same
fix, roughly 2× the rate when the CPU is not throttled. **PASS.**

The page-wide number is the stronger one: with the gem parked *and* lane 5's map-breath parked, the idle page
issues **zero rAF callbacks per second** where the baseline issued ~86.

### 2.3 Forced reflow — structural pass, magnitude unproven

`gem3d.js` no longer calls `GEM_RIG.size(rig)` inside the frame, and the 250 ms `canvas.getBoundingClientRect()`
poll inside the loop is gone; the rect read now lives in `GEM_DRAG.track()` on pointer/scroll events.

- Measured during a 14-move pointer drag across the canvas: **1.07 `getBoundingClientRect` per pointermove,
  0 per frame**, identical in both builds (the baseline's per-move read also existed).
- `clientWidth/clientHeight/offset*` reads inside the gem loop: **0 in the baseline too** — because
  `gem-rig.size()` already short-circuited on a resize epoch at `6b6b828`. The per-frame *call* was dead work,
  not a layout read, in this configuration.
- Therefore I could **not reproduce "2.6–3.2 forced reflows/s → 0"**. In this headless env the baseline's
  in-frame 250 ms poll fires at ≈ its frame rate (< 1/s with the gem on screen), so the delta is invisible here.
  The removal is real in source; the magnitude is environment-specific. Marked **UNPROVEN as a number**.

### 2.4 Falsification: does the gem resume at the same phase?

Protocol: open the sheet, read `rig.t`, park the layer offscreen for 2 s, restore, read `rig.t` again and let it
run. Ran on both builds.

| | baseline | b97b1de |
|---|---|---|
| `t` at park | 0.2500 | 0.2054 |
| `t` after 2 s parked | 0.3500 | 0.3054 |
| drift during the whole park | +0.05 (one in-flight frame) | +0.05 (one in-flight frame) |
| `vis` / `raf` while parked | `false` / **still scheduled** | `false` / **0** |
| `t` after resume | 0.6546 → continues | 0.3056 → 0.4556 |
| largest single-frame Δt ever | 0.05 | **0.05 (= the pre-existing clamp)** |
| `rotation.y` across the park | monotone, no backward step | monotone, no backward step |

**No jump.** The clock freezes while parked and resumes from the frozen value; the park duration is never
added to `t` and `t` is never reset. `rotation.y = spin · t · 0.9` is a pure function of `t`, so the pose
resumes exactly where it froze — the gem **freezes offscreen and continues**, which is the intended behaviour,
not a discontinuity.

Two limits I will not paper over:

- `arm()` sets `rig.last = performance.now()` before scheduling (verified in source), so the first frame after
  a re-arm would use dt ≈ 0. I could **not observe that**, because this environment renders the gem at < 1 fps,
  so *every* frame's wall delta exceeds the 50 ms clamp and dt is always 0.05. What I can state is the
  observable invariant: **no frame advances the rig clock by more than the existing clamp, and park time is not
  accumulated.** A 60 Hz observation would be needed to see the finer behaviour.
- The sheet close → reopen path (canvases go to a 0×0 box) does re-arm: `vis true, raf set, tris 452` after
  reopening. There is no dead-lock in the path the user actually exercises.

**Latent risk (not observed, worth knowing):** `gem-rig.size()` sets `rig.dead` but never calls `arm()`, unlike
`deck3d/cube3d`, whose ResizeObserver does `size(); arm(rig)`. The gem relies on the IntersectionObserver to
re-arm after an `dead` park. That works because a zero-area canvas is never "intersecting", so IO re-fires on
reappearance — but it is an asymmetry with the other rigs and the single place this design could freeze a rig.

---

## 3. Silent breakage sweep (claim 7)

Built `dist/` of both commits, 11 pages, identical protocol (mobile metrics, 2.6 s settle).

| page | baseline tags / blocking / gem tags | b97b1de | exceptions baseline → subject |
|---|---|---|---|
| `index.html?app=fullscreen` | 26 / 25 / 23 | **4 / 0 / 0** | 0 → 0 |
| `gallery.html` | 79 / 78 / 27 | 79 / 78 / 27 | 2 → **2** (same two) |
| `pitch.html` | 40 / 40 / 25 | 40 / 40 / 25 | 0 → 0 |
| `changelog.html` | 1 / 0 / 0 | 1 / 0 / 0 | 0 → 0 |
| `preview.html` | 0 / 0 / 0 | 0 / 0 / 0 | 0 → 0 |
| `cube.html` | 9 / 9 / 2 | 9 / 9 / 2 | 1 → **1** (`reading 'shadow'`) |
| `deck.html` | 9 / 9 / 1 | 9 / 9 / 1 | 0 → 0 |
| `cube-spline.html` | 2 / 0 / 0 | 2 / 0 / 0 | 0 → 0 |
| `cube-illusion.html` | 27 / 27 / 0 | 27 / 27 / 0 | 1 → **1** (`reading 'load'`) |
| `app.html` | redirect stub → renders `/` | renders `/` | 0 → 0 |
| `pitch-changelog.html` | **404** | **404** | pre-existing packaging gap |

**Every non-index page keeps its own classic gem stack and its own pre-existing errors.** The gem-boot collapse
did not leak past `index.html`; `gallery.html` still declares 27 gem tags and its `gem-panel`/`gem-bloom` stack.
The four exceptions (`gallery` ×2, `cube`, `cube-illusion`) are **identical in both builds** — pre-existing, not
introduced. `0` 4xx responses on every page except the pre-existing `pitch-changelog.html` 404.

Functional check that parking did not blank the lab canvases:

```
deck.html            DECK3D[1]  vis=true raf=true tris=2       frames+9   box=346x216
cube.html            CUBE3D[1]  vis=true raf=true tris=26944   frames+5   box=322x322
cube-illusion.html   ILLUSION3D[1] vis=true raf=true tris=21538 frames+4   box=393x695
```

All three still render and advance. (`raf=false` on the *baseline* rows is itself confirmation of the mechanism:
the baseline never kept a handle; the subject tracks `rig.raf`.)

### Gates (read-only, inside the frozen tree)

```
$ node scripts/lint-tokens.mjs   → ✓ 0 raw leaks, 0 over-limit            EXIT=0
$ node scripts/plan-names.mjs    → ✓ 22 phased plans named                EXIT=0
```

**Gate defect found while running this.** `scripts/lint-tokens.mjs` enumerates files with
`git ls-files --cached --others --exclude-standard` inside a `try{}catch{ list=[] }`. In any directory without a
`.git` — a `git archive` export, a tarball, a CI checkout with `.git` stripped — the list is empty and the gate
prints **"✓ lint:tokens — 0 raw leaks, 0 over-limit"** having scanned nothing. My first run hit exactly that.
I re-ran it with `git init && git add -A` in the frozen copy (1702 files) to get a meaningful exit code. The
result above is the real one, but the gate can produce a **false green**, including for whoever runs it on a
deploy artifact.

---

## 4. 100-line budget and token law (claim 8)

Computed from git objects (`git show b97b1de:<path>`), not from the working tree.

- 30 touched text files (`.js/.mjs/.css/.html`; the vendored `public/vendor/*` and JSON/manifest files excluded).
- `split('\n')` length: **max 100** (eight files at exactly 100 → 99 content lines): `scripts/vite/gem-boot.mjs`,
  `src/components/Chip/chip.css`, `gem3d.js`, `deck3d.js`, `illusion3d.js`, `cube3d.js`,
  `opportunity-card.css`, `gooey.js`. Everything else lower (`index.html` 94, `vite.config.js` 78 …).
- **No file exceeds 100.** Zero violations of the ≤99-content rule.
- **Raw hex: 0 introduced.** Five touched files contain hex at both commits with unchanged counts
  (`index.html` 1, `illusion3d.js` 3, `cube3d.js` 3, `edge-material.css` 4, `nearby-sheet.css` 2); every other
  touched file has none. I also scanned for hex the linter's `: … #hex` regex would miss — no new literals.
- Gem crease fix present: `dot( n1, n2 ) > 0.9935` in `src/components/GemReward/gem-shader-ext.js:28`;
  `0.974` only in the explanatory comment on line 27.
- `src/os/edge-material.css`: `will-change` count **0** (was 1 on `.device__edge > span`); `contain: layout paint`
  present on both `.device__edge` and the span rule.

---

## 5. Interaction claim (claim 9) and pixel parity (claim 10)

Scripted scroll: 84 rAF steps × 12 px on `#app-content`, 393×852 DPR3, **4× CPU throttle**, 6 s settle on both
builds, CDP `Performance.getMetrics` deltas:

| metric | baseline | b97b1de | lane 5 claimed |
|---|---|---|---|
| `LayoutCount` | **86** | **41** | 85 → 41 ✅ matches |
| `LayoutDuration` | 34.2 ms | **11.2 ms** | 73.8 → 6.1 ms |
| long tasks (count / ms) | 33 / 3,425 | **16 / 1,448** | 51 → 7 |
| `RecalcStyleDuration` | 398.6 ms | 260.1 ms | — |
| `ScriptDuration` | 676 ms | 272.6 ms | — |
| `TaskDuration` | 4,315 ms | 2,494 ms | — |

The mechanism reproduces exactly (`LayoutCount` 86 → 41 is the `p === painted` short-circuit skipping six
inline-style writes at the saturated ends of the morph), and every metric moves the right way. **The headline
magnitudes do not reproduce**: I get a **3.1×** LayoutDuration win where the report claims 12×, and long tasks
halve rather than falling 7×. Their `LayoutDuration` baseline (73.8 ms) is 2× mine and their after (6.1 ms) is
half mine — the claim is directionally true and numerically optimistic. Note the first subject run in this
protocol gave 112.7 ms because the scroll overlapped app mount; the numbers above are from the settled protocol
and repeat within ±10 %.

Pixel parity, `/index.html?app=fullscreen`, `animation/transition: none` injected, `#nearby-map,#sheet-map`
hidden (lane 5's own protocol), 1179×2556 PNG:

| state | pixelDiff | maxΔ | sha256 |
|---|---|---|---|
| rest (scrollTop 0) | **0.0000 %** (0 px) | **0** | `291ca1b0…` identical in both builds |
| scrolled (scrollTop 760) | **0.0000 %** (0 px) | **0** | `4bf9c19c…` identical in both builds |

Byte-identical, and the title-transform strings match exactly
(`translate(132.421px, -10px) scale(0.473684)`, opacity 0). **Zero visual change confirmed for the feed.**
Scope of that confirmation: maps hidden and motion frozen by protocol, gem sheet closed — so this is a
"layout/paint of the feed is untouched" proof, not a proof about the map tiles or the gem.

---

## 6. Answers to the two questions

**Did it make the phone smoother?** Yes, and the parts that are real are real for structural reasons:
- 22 fewer parser-blocking round trips on the critical path (25 → 0), so first paint no longer waits on a
  third-party CDN and 24 serial script fetches. On a high-latency phone link this is the largest win and it is
  not a micro-optimisation.
- The gem rig stops burning a frame callback per frame while it is offscreen: **21.5/s → 0**, and with the map
  breath parked too the idle page is **completely quiet (0 rAF/s)** where it used to tick ~86 times a second.
- Feed scroll layout cost roughly **3× down** with identical pixels.

**Is anything broken or fake?** Nothing broken that I can find; several numbers are overstated.
- Not fake: the load-path collapse, the parking, the phase continuity, the zero-pixel feed, the budgets, the gates.
- Overstated: `requests 54 → 32` (I get 63 → 41), the scroll magnitudes (3.1× not 12×; long tasks 33 → 16, not
  51 → 7), and the byte table (bytes went *up* on an uncompressing origin — artifact, but the table is not
  reproducible as stated).
- Lane 4's own report is honest in a way worth noting: it flags its pixel proof as *not captured*. I ran the
  phase test it skipped and it passes.

---

## 7. Claimed but unverified — be explicit about these

1. **Frame-rate parity / "p95 frame ≤ 20 ms, 0 frames > 33 ms".** Not measurable on this machine: no GPU,
   SwiftShader renders the gem at 0.5–0.9 fps. Any absolute fps claim from this environment is meaningless and
   I did not produce one. The eval's closing metric remains **UNPROVEN**, by geometry of the hardware.
2. **Byte totals / gzip-brotli table** (`412,274 → 403,137` B gzip etc.). Needs a compressing origin; my server
   serves identity. Request counts verified, byte counts not.
3. **deck3d / cube3d / illusion3d offscreen parking.** I verified they still render and that the source has the
   park/arm shape; I did **not** instrument their offscreen callback rate individually.
4. **gooey hidden-tab parking.** Source-read only, not instrumented.
5. **Lane 7's "92 % of DOM duplicated in the dock" finding** and the −62 % frame-time claim — out of scope here,
   not re-verified.
6. **Map/leaflet interaction cost.** My parity and scroll protocols hide the map widgets; the map path was not
   measured.
7. **`pitch-changelog.html` 404** in `dist/` — present in both builds, so pre-existing, but it is a real broken
   link in the deployable output and nobody's lane owns it.

## 8. Defects / risks found by this audit (none blocking)

1. **`scripts/lint-tokens.mjs` can return a false green.** With no `.git` present it enumerates zero files and
   prints success. Any deploy-artifact or tarball check of the token law is vacuous.
2. **Gem `rig.dead` recovery is asymmetric.** `gem-rig.size()` sets `rig.dead` but never calls `arm()`, while
   `deck3d/cube3d/illusion3d` RO callbacks do `size(); arm(rig)`. The gem depends entirely on its
   IntersectionObserver to come back from a dead park. Correct today (zero-area boxes never intersect), fragile
   if that assumption ever changes.
3. **Request count is not a regression metric on this page.** 20 avatar image requests (10 unique fetched twice)
   dominate it; any future before/after that quotes "total requests" is measuring the avatar host.
4. **`src/pitch/pitch-overlay.js` is still served raw from `dist/src/` as a `defer` classic.** It works
   (verified: overlay opens, no error) but it is the last file in `dist/src/` on the app's critical path; the
   collapse did not take it because it is not a gem script.

---

## 9. Commands used (copy-paste, ports 5236 only)

```bash
SRC="/Users/irfan/Documents/Portfolio Redo/crm_proj"; T="/Users/irfan/.hermes/cache/scratch"

# frozen trees
cd "$SRC" && git archive b97b1de | tar -x -C "$T/verify-b97"   && ln -sfn "$SRC/node_modules" "$T/verify-b97/node_modules"
cd "$SRC" && git archive 6b6b828 | tar -x -C "$T/verify-before" && ln -sfn "$SRC/node_modules" "$T/verify-before/node_modules"

# builds (subject into scratch outDir; baseline in place because its rawSourceRefsPlugin hardcodes dist/)
cd "$T/verify-b97"    && npx vite build --outDir "$T/verify-dist"
cd "$T/verify-before" && npx vite build            # → verify-before/dist

# serve exactly one tree on 5236, identity encoding, and VERIFY which tree it is
python3 -m http.server 5236 --bind 127.0.0.1 --directory "$T/verify-dist"
curl -s http://127.0.0.1:5236/index.html | grep -o gem-boot   # present ⇒ subject, absent ⇒ baseline

# probes (each launches one headless shell on 9337, own profile)
node $T/gv/load.mjs   http://127.0.0.1:5236            # tag counts, requests, THREE rev, WebGL assertions
node $T/gv/ab2.mjs    http://127.0.0.1:5236 after      # parking + phase falsification + hover cost
node $T/gv/sweep.mjs  http://127.0.0.1:5236 after      # 11-page console/404 sweep
node $T/gv/rigs.mjs   http://127.0.0.1:5236 after      # lab rigs still render
node $T/gv/scroll.mjs http://127.0.0.1:5236 after 4    # 84-frame scroll metrics at 4× CPU throttle
node $T/gv/shot.mjs   http://127.0.0.1:5236 after      # frozen-state PNGs for the pixel diff

# gates, read-only, inside the frozen tree (needs a real file list — see §3)
cd "$T/verify-b97" && git init -q && git add -A
node scripts/lint-tokens.mjs; echo "EXIT=$?"
node scripts/plan-names.mjs;  echo "EXIT=$?"
```

Harness source lives in `$T/gv/{cdp,load,ab2,sweep,rigs,scroll,shot,serve}.{mjs,sh}`. Probe results for the
baseline and subject were captured with the **same** scripts; the only per-build difference is the one-line
`__gemCb` counter inserted into the *built* `gem3d` in each scratch `dist/` (never in the repo).
