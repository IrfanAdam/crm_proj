# E5 device probe — `?gemtimer=1`

A one-tap, phone-friendly GPU pass timer for the gem, built to answer the E5 falsification questions in
`../../README.md` (§ *E5 — device falsification*). It runs **inside the app's existing perf path**: `gem-perf.js`
arms it, `gem-perf-timer-ext.js` implements it, and the HUD follows the `?gemperf=1` panel's conventions.

**Nothing on this page is a device measurement.** No Adreno/Mali/PowerVR GPU is reachable from the machine that
built this probe, so every number in `../lane-E5.md` is headless (Apple M1 Max via ANGLE/Metal). The probe exists
so a phone can produce the numbers; it has not produced them yet.

---

## 1. Run it

From the repo root (a **separate** Vite server — never the owner's 5173):

```bash
npx vite --port 5413 --strictPort --host 0.0.0.0
```

`--host 0.0.0.0` is required for a phone; drop it for a desktop-only check. No scripts or deps are added by this
lane (`package.json` is untouched) — this is plain `vite` with flags.

Find the LAN address of the Mac (`ipconfig getifaddr en0`), then open **on the phone**:

```
http://<mac-lan-ip>:5413/gallery.html?gemtimer=1&gemphone=1.5&gemdpr=1.5
```

- `gallery.html` → the gems tab → tap the sapphire card → the fullscreen ceremony gem. The probe re-targets itself
  from the card rig to the ceremony rig automatically (it prefers any canvas inside `#gem-screen`).
- `?gemtimer=1` is the only required parameter. It is inert otherwise — see §5.
- `?gemdpr=N` pins the drawing-buffer ratio (the controller's adaptation is off). **Always pin it** for a
  comparable run: unpinned, the adaptive controller moves the ratio mid-run.
- `?gemphone=1|1.5|2` is the existing phone ceiling (dpr cap + thinner bloom). It caps a pinned `?gemdpr` too.
- Probe-only knobs, for the arm comparisons: `?gemtaps=1..3`, `?gembounce=1..5`, `?gembloom=0|1`.

The HUD sits bottom-right (the `?gemperf` panel is bottom-left, so they can run together). It shows the mode line,
GPU strings, buffer, the arm state and one line per pass, then a **copy JSON** button.

### Copying the JSON off the phone

`navigator.clipboard.writeText` needs a **secure context**. Over plain `http://<lan-ip>` the button cannot copy:
it falls back to **selecting** the HUD text, so long-press → *Copy* works. On `https` or `localhost` it copies
directly and the button flips to `copied` for 1.2 s. Either way the JSON is the same object described in §3.

### Phone settings that change the numbers

| setting | why it matters |
|---|---|
| **Battery saver / adaptive battery OFF**, charge ≥50% (ideally plugged) | Android throttles CPU/GPU clocks under saver; that alone can double the frame |
| **Thermal soak**: 60 s warm-up, then 3 runs | a cold Adreno 610 is faster than a warm one; the first run after idle is not the steady state |
| **Chrome "Lite mode"/Data Saver OFF** | it may reduce raster quality and `devicePixelRatio` |
| **Desktop site OFF** | desktop site flips `pointer:fine`, so the `?gemphone` gating and the CSS box both change |
| **Page zoom 100 %** | page zoom changes `window.devicePixelRatio`; the HUD prints the value it saw |
| **Screen stays awake, page stays foreground** | the rig parks when hidden or offscreen — a parked rig renders nothing |
| **Check the mode line says `gpu timer`** | if it says `rAF FALLBACK`, the driver/Chrome build does not expose the timer extension and the per-pass numbers are *unavailable*, not slow |

Do not compare a run taken at 40 % battery with one on the charger, and do not compare across devices: the
model's ms figures are per-GPU-class.

---

## 2. What it measures

The gem is **one** fragment shader pass (`GEM_SHADER.core`), so "entry vs trace" cannot be split by a timer —
the whole gem pass is reported and named `gem`. Bloom adds two more draws, and the existing `gem-bloom.js` wrapper
already crosses render-target boundaries, so the probe hangs its queries on those boundaries:

| pass in the JSON | what it covers | target |
|---|---|---|
| `gem` | the scene draw: backdrop, the stone's trace shader, floor pools (if visible) | full-size target (bloom on) or the canvas (bloom off) |
| `bloom` | the 9-tap gaussian | half (or quarter, phone policy) target |
| `comp` | `A + B*intensity` composite | canvas |

Mechanics:

- `EXT_disjoint_timer_query_webgl2` (`gl.createQuery` + `gl.beginQuery/endQuery`, `TIME_ELAPSED_EXT`).
  WebGL1 contexts use the `EXT_disjoint_timer_query` functions instead.
- The query **opens at the first draw call** of a segment and **closes at the next render-target switch**, so the
  CPU-side JS between passes (uniform setup, material bookkeeping) is not billed to the GPU.
- One query may be open at a time, so passes are measured **sequentially, never nested** — there is no
  frame-total query. The frame number is the HUD's own rAF ring, and it is always labelled `rAF`.
- `disjoint` is read **before** results are accepted: a disjoint sweep drops that sweep's queries and increments
  `dropped`. A run with a non-zero `dropped` is suspect; discard it.
- Per-pass p50/p95 come from a 240-sample ring per label. `pct` is `sorted[floor(n*f)]`, the same convention as the
  `?gemperf` HUD.

### What the numbers are *not*

- **Not frame time.** `frame` is wall-clock rAF; the sum of the pass p50s is the GPU busy time of one render call.
- **Not comparable across devices or with the model's ms.** They are for **A/B on one device** (taps 3 vs 1, bloom
  on vs off, dpr 1.5 vs 3).
- On a **CPU-bound** page (headless Chrome, or a desktop with a throttled tab) the GPU idles between draws, and that
  idle lands inside a segment — the pass numbers inflate and arm deltas get diluted. On a GPU-bound phone
  (34–136 ms/frame by the model) the idle is small and the pass number tracks the pass. This is precisely why E5
  needs a device; the headless numbers in `../lane-E5.md` are plumbing evidence only.

---

## 3. The JSON

```json
{
  "probe": "gemtimer/1",
  "at": "2026-11-22T16:02:11.000Z",
  "url": "http://192.168.1.24:5413/gallery.html?gemtimer=1&gemphone=1.5&gemdpr=1.5",
  "ua": "Mozilla/5.0 (Linux; Android 13; SM-A505F) ...",
  "gl": { "renderer": "Adreno (TM) 610", "vendor": "Qualcomm", "api": "webgl2",
          "timerExt": "EXT_disjoint_timer_query_webgl2" },
  "canvas": { "w": 510, "h": 720, "css": [340, 480], "ratio": 1.5 },
  "dpr": 2.75,
  "taps": 3, "bounce": 5, "bloom": "on",
  "programs": 8, "calls": 4, "triangles": 640,
  "timer": {
    "mode": "gpu", "note": "", "disjoint": false, "dropped": 0, "frames": 320,
    "passes": { "gem": { "p50": 31.2, "p95": 38.9, "n": 240 },
                "bloom": { "p50": 1.4, "p95": 1.9, "n": 240 },
                "comp": { "p50": 0.9, "p95": 1.2, "n": 240 } }
  },
  "frame": { "p50": 33.9, "p95": 41.0, "n": 240, "src": "raf" }
}
```

| field | meaning |
|---|---|
| `gl.renderer` / `gl.vendor` | `WEBGL_debug_renderer_info` unmasked strings — **record this verbatim**; it is the device identity |
| `gl.timerExt` | which timer extension was used, or `null` |
| `canvas.w/h` | the raw drawing buffer (`canvas.width/height`) |
| `canvas.css` / `canvas.ratio` | the CSS box and the ratio the controller actually applied |
| `dpr` | `window.devicePixelRatio` as the page saw it |
| `taps` / `bounce` | the **live uniform values** on the stone's material, not the URL |
| `bloom` | the live `GEM_BLOOM.on()` state, `"on"` / `"off"` / `"-"` |
| `timer.mode` | `"gpu"` = timer queries; `"raf"` = fallback, per-pass values are zeroed and meaningless |
| `timer.note` | why the fallback is active, in words (empty on the GPU path) |
| `timer.disjoint` / `dropped` | whether any query result was discarded for a GPU disjoint, and how many |
| `timer.frames` | renders that carried queries (a liveness check: it must keep climbing) |
| `timer.passes.*.p50/p95/n` | per-pass GPU ms percentiles and sample count |
| `frame.p50/p95/n/src` | rAF wall-clock frame period, `src` is always `"raf"` |

---

## 4. The E5 runs and their thresholds

One device, one pose (open the ceremony gem, don't drag), 60 s warm-up, 15 s capture per arm, 3 repetitions,
median of the three. Discard any repetition whose `dropped` is non-zero or whose `frame` p50 drifts >20 % from
the others (shared machine / thermal).

| # | arm URLs (same device) | field to read | model says | falsified if |
|---|---|---|---|---|
| 1 | `?gemtimer=1&gemphone=1.5&gemdpr=1.5` | `timer.passes.gem.p50` (taps 3, bounce 5, bloom on) | Adreno 610 ≈ **34 ms** | p50 **outside 17–68 ms** (2× band) — record the real number either way |
| 2 | same, plus `&gemdpr=3` | `timer.passes.gem.p50` ratio dpr3 : dpr1.5 (fill area ratio is **4.0×**) | ≈ **4×** (pure fill) | ratio **1.5–2×** ⇒ not fill-bound; the cost model's first assumption is wrong |
| 3 | `&gemdpr=3` vs `&gemdpr=3&gemtaps=1` | `gem` p50 delta, `1 − taps1/taps3` | ≈ **−67 %** of the gem pass | outside **−50 % … −80 %** ⇒ the taps term is not what the model thinks it is |
| 4 | `&gemdpr=3` vs `&gemdpr=3&gembloom=0` | bloom share: `(frame_on − frame_off) / frame_on`, or `(bloom+comp)/frame` | **15–25 %** of frame time | outside **10–30 %** ⇒ the bloom bandwidth estimate (138 MB/frame at dpr 3) is wrong |

Notes on reading them:

- Run 2 needs the **same** `gemphone` in both arms, otherwise the ceiling, not the dpr, sets the buffer.
- Run 3 compares **`gem`**, not `frame`: bloom and composite do not change between the arms, so they only dilute
  the delta.
- Run 4 compares **`frame`** (or the two extra pass rows), because with bloom on the gem work moves into a
  full-size target and the composite becomes the last segment.
- If the HUD says `rAF FALLBACK`, runs 1–4 cannot be answered on that device with this probe: record the fallback
  and stop. Do not substitute rAF frame ms for a pass time.

---

## 5. Inertness (why this is safe to keep in the tree)

Without `?gemtimer=1` the probe does **nothing**:

- `gem-perf-timer-ext.js` defines one global (`window.GEM_PERF_TIMER_EXT = { arm }`) and returns. No DOM, no rAF,
  no context call, no query.
- `gem-perf.js` runs one `?gemtimer` string test at boot and one property test; both are already spent on
  `?gemphone` / `?gemdpr`.
- The HUD element (`#gem-timer-hud`) and `window.GEM_TIMER` exist **only** after `arm()`.

Pixels: default-path captures are **byte-identical** with the probe code present — 0.000000 % of pixels >2/255,
maxΔ 0, equal sha256 at dpr 3 and dpr 2, `renderer.info.programs` 8 → 8, A-vs-A control 0. Full numbers and the
harness: `../lane-E5.md` and `harness/README.md`.

---

## 6. Files

| file | role |
|---|---|
| `src/components/GemReward/gem-perf-timer-ext.js` | the probe (timer queries, rings, HUD, copy, knobs) — 99 lines |
| `src/components/GemReward/gem-perf.js` | one 2-line hook at boot: `if (param('gemtimer') === '1' && window.GEM_PERF_TIMER_EXT) …arm(GEM_PERF)` |
| `gallery.html`, `index.html` | one `<script>` tag each, before `gem-perf.js` (`index.html`'s gem-boot count comment 31 → 32) |
| `harness/` | the capture / compare / smoke scripts this lane used (scratch copies, kept for reproduction) |

`pitch.html` does not load `gem-perf.js` at all, so the probe does not exist there.
