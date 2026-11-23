# Lane F — C0 + C5 implemented, gated, measured

Repo `/Users/irfan/Documents/Portfolio Redo/crm_proj` @ `f350e75` (+1 line, uncommitted).
Method: `.hermes/evals/2026-11-23-gem-render-audit/lane-D-method.md` §3 rows C0, C5.
Probe: `/Users/irfan/.hermes/cache/scratch/gem-c0c5/probe.mjs` (headless Chrome, CDP, `--use-angle=metal`, ANGLE/Metal M1 Max, `EXT_disjoint_timer_query_webgl2`, CPU 6×).
Raw evidence: `.../gem-c0c5/out/{cap-base,gate-c0,gate-c0final,gate-c0c5,timer-*}.json` + the `.bin` frames.

## Verdict

| row | implemented | pixel gate | kept? |
|---|---|---|---|
| **C0** `autoClearColor = false` | yes, 1 line | **0.000 % > 0/255, sha identical** on all 4 shots | **shipped** |
| **C5** canvas `antialias:false` | yes, 1 line | ceremony identical, **reward-sheet surface differs** (0.30 % of pixels, max Δ 115/255) | **reverted — blocking gate** |

The gain the design predicted for both rows together (50.0 → 43.5 ms) **does not reproduce** at the buffers this harness can reach; the honest measured delta is −0.9 ms (−2.4 %) at 1020×1440 and it is not attributable to the pass that owns the clear. Detail in §3.

---

## 1. Gate table

Baseline = raw drawing buffer, same-task render + `readPixels`, rAF parked (`rig.vis=false`, `t=tilt=0`), floor pools (`shadow contact caustic ground base`) hidden, camera and buffer pinned canonically (below).

**Control first — the harness is bit-reproducible:** two independent processes, identical source, identical loads → identical sha for all 4 shots (`cap-base.json` captured twice: ceremony `8e562714…`/`d51a620e…`, sheet `2436047b…`/`60bc841b…`). Without this the gate below would be meaningless.

| surface | pose | buffer | C0 diff % >0/255 | C0 sha equal | C0+C5 diff % >0/255 | C0+C5 sha equal |
|---|---|---|---|---|---|---|
| gallery `#gem-screen` ceremony (bloom on) | P1 (−0.15, 0.0, 0) | 680×960 @2 | **0.000** (0 ch) | **yes** | 0.000 (0 ch) | yes |
| gallery `#gem-screen` ceremony | P2 (0.22, 0.9, +0.015) | 680×960 @2 | **0.000** (0 ch) | **yes** | 0.000 (0 ch) | yes |
| `index.html?app=fullscreen` reward sheet | P1 | 598×564 @2 | **0.000** (0 ch) | **yes** | **0.300 %** (1013 px, 3006 ch, max Δ 115) | **no** |
| `index.html?app=fullscreen` reward sheet | P2 | 598×564 @2 | **0.000** (0 ch) | **yes** | **0.284 %** (956 px, 2846 ch, max Δ 119) | **no** |

C0 re-gated after each text change to the shipped line (`gate-c0final.json`, then `gate-final.json` on the final file) — all four shots sha-identical every time.

**Why C5 fails on one surface only.** `index.html` does not load `gem-bloom.js` (it is in `gallery.html`'s script list, not the app shell's); the reward sheet therefore renders the scene **straight into the canvas** (`calls=2`, `GEM_BLOOM` undefined, no target A). There is no full-screen composite quad to cover the samples, so MSAA-4 on the canvas is doing real silhouette AA and removing it is visible: 0.28–0.30 % of pixels move, up to 115–119/255 on the gem's edge. The design's C5 premise — "a full-screen composite quad covers every sample" — is true on the ceremony surface (measured: 0 diff) and false on the app surface. Per the task's blocking gate it was reverted, not rationalised.

---

## 2. Backdrop coverage (the premise C0 rests on)

Probe: hide the stone (`group.visible=false`) and the floors, ping the whole colour target magenta with a raw `gl.clear`, render with `autoClearColor=false`, count surviving magenta pixels. Zero holes = every pixel is overwritten.

| surface / viewport | buffer | aspect | holes |
|---|---|---|---|
| ceremony 393×852@3 | 680×960 | 0.7083 | 0 / 652 800 |
| ceremony 1026×1434@1 | 680×960 | 0.7083 | 0 / 652 800 |
| ceremony 390×844@3 | 680×960 | 0.7083 | 0 / 652 800 |
| ceremony 360×800@3 | 620×928 | 0.6681 | 0 / 575 360 |
| ceremony 430×932@3 | 642×960 | 0.6687 | 0 / 616 320 |
| ceremony 320×568@2 | 440×658 | 0.6687 | 0 / 289 520 |
| ceremony 768×1024@2 | 642×960 | 0.6687 | 0 / 616 320 |
| ceremony 1440×900@2 | 642×960 | 0.6687 | 0 / 616 320 |
| ceremony 900×1440@2 | 642×960 | 0.6687 | 0 / 616 320 |

**0 holes at every aspect checked (0.6681, 0.6687, 0.7083 — the full range the overlay box reaches, landscape through tall portrait).** The covering surface is `scene.background` (a full-screen background plane, `gem-scene.js:48` / `gem-rig.js:46`), not the 80×80 quad: **no page in the repo sets `canvas.dataset.gemStage === "off"`, so the bare-mode 80-unit `PlaneGeometry` in `gem-bare.js:52` is dead code on both gated surfaces** and the design's "the 80×80 backdrop quad is opaque and full-screen" names the wrong object (harmlessly — coverage is still complete). The reward sheet has no bloom target at all (`cover` returns `no-bloom-target`), so there is nothing to clear there beyond the canvas, which the gate covers.

Depth still clears (`autoClearDepth` untouched), so the depth-gated bloom sample gate and the `renderOrder 1` backdrop ordering are unchanged.

---

## 3. Measurement — `?gemtimer=1`, 3 runs/config, medians of the run p50s

Ceremony surface, `gemdpr=2` and `gemdpr=3` (pinned so the perf controller cannot re-ratio mid-run). Before = HEAD, after = HEAD + C0.

| ratio | buffer | pass | before p50 / p95 | after p50 / p95 | Δ p50 |
|---|---|---|---|---|---|
| 2 | 680×960 → 678×956 | gem | 11.23 / 47.39 | 8.38 / 32.38 | −2.85 |
| 2 | | bloom | 7.78 / 16.19 | 6.28 / 13.11 | −1.50 |
| 2 | | comp | 7.34 / 15.85 | 5.67 / 11.69 | −1.67 |
| 2 | | **sum** | **26.35** | **20.33** | **−6.02** |
| 3 | 1017×1440 → 1020×1440 | gem | 14.86 / 38.67 | 14.91 / 34.99 | **+0.05** |
| 3 | | bloom | 11.11 / 17.04 | 10.72 / 14.46 | −0.39 |
| 3 | | comp | 10.63 / 17.29 | 10.10 / 13.49 | −0.53 |
| 3 | | **sum** | **36.60** | **35.73** | **−0.87 (−2.4 %)** |

Read the ratio-3 row, not the ratio-2 row:

- **The one pass C0 actually changes is `gem`** (it owns the `setRenderTarget(A)` + clear). It is **flat, +0.3 %** — and flat is the correct answer if the clear was already free on this driver (ANGLE/Metal discards a freshly-allocated tile store; nothing is read back). The −0.39 / −0.53 on bloom/comp is where the clear is *not* issued, so it is cross-session noise: the same config spanned 35.7–36.6 ms across sessions and single-run spreads reach 4 ms at this size.
- Ratio 2's −6.0 ms is **not** a C0 effect: the untouched `gem` pass fell 25 % between the two sessions (11.23 → 8.38), which is the noise scale of a 680×960 session on this host.
- Frame p50 from the same probe is rAF-quantised in headless (16.7 / 33.3) and is not a usable frame number; the pass sum is the frame proxy, as in Lane B.

**So: C0 is bit-exact and unmeasurable here.** The design's −2.4 ms is a 24 MB clear on a 1.48 Mpx MSAA-4 RGBA16F target; this harness can only reach that size through `gemdpr=3`, where the clear appears to cost nothing. Treat the −2.4 ms as unverified, not disproved — it needs a device (Mali) trace, where an explicit clear is a real store and a tile store is not.

### What the reachable buffers actually are (premise correction)

- `gem3d.js:20` caps `setPixelRatio(min(dpr, 2))`, so a dpr-3 phone renders at **×2** unless `?gemdpr=3`. The "393×852 dpr 3" premise gives **680×960**, not 1179×2556.
- The ceremony overlay canvas is **340×480 CSS** (`.gem-screen__canvas`), not the viewport: 680×960 at ×2, 1020×1440 at `gemdpr=3`. 1020×1440 is the closest proxy to the owner's 1026×1434.
- The reward sheet canvas is **299×282 CSS** → 598×564 at ×2.

---

## 4. Repo gate

| gate | result |
|---|---|
| `npm run lint:tokens` on HEAD + this edit (clean worktree of `f350e75`) | **exit 0** — `✓ 0 raw leaks, 0 over-limit (1870 files)` |
| `npm run lint:tokens` in the live working tree | **exit 1** — `src/patterns/OppsHome/opps-home.js 104 >100`. Not this lane: that file is `91` lines at HEAD and `+12` uncommitted lines from a concurrent lane (`git diff --stat` = 12 insertions). `gem3d.js` is **99** lines (edit folded onto the existing exposure line to stay under the 100-line budget) |
| `npx vite build --mode production` | **exit 0**, `✓ built in 1.67s` |
| repo's own gem probe suite `.hermes/evals/2026-11-20-gem-mobile-perf/tools/device-probe/harness/smoke.mjs` (BASE retargeted to :5426) | passes — HUD appears, `GEM_TIMER.json()` populated (`gem 10.48 / 30.42 ms n91`, `1020x1440 @3.00`), inert without the param (`hud:false, timerGlobal:false`) |
| commits | none |

## 5. Files

- `src/components/GemReward/gem3d.js` — **+1 line, folded into line 22**: `renderer.toneMappingExposure = 0.95; renderer.autoClearColor = false;   // C0 …`. Nothing else changed (`git diff --stat` = 1 insertion, 1 deletion — one line rewritten, file stays at 99 lines).
- `C5` (`antialias:false` at `gem3d.js:17`) applied, gated, **reverted** — the working tree carries `antialias: true`, byte-identical to HEAD.

## 6. What the next lane should know

1. **C5 is not free on the app surface**: `index.html` never loads `gem-bloom.js`, so the reward sheet is a direct MSAA render. Either add the bloom chain there (then C5 becomes 0-diff, as measured on the ceremony) or scope C5 to `gallery.html` only. Do not ship it unconditionally.
2. **C0's saving is a device question**, not a desktop-ANGLE question. Gate it on a Mali trace (`clear` → `tile store` becomes a load), where the 24 MB is real.
3. The ceremony buffer is 340×480 CSS — any future "50 ms / 20 fps" claim should state the buffer it was measured at (`gemdpr`), because a 680×960 session and a 1020×1440 session differ by 2.3× in fill and by 25 % between sessions even when unchanged.
