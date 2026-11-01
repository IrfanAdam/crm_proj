# value2 — two-bounce far side + path colour: the pale field is gone at every spin × tilt cell

Verdict: **FAILED on the letter of the gate list, SHIPPED as the better try** (`ad74d419…`, not committed
bytes). The owner's defect — a whole-stone pale field with no facet reflection — is **reproduced and removed**:
committed bytes go to **84.7 % pale-lowinfo** on citrine at tilt −0.55 (stone L50 248.4, 7×7 std 0.32, i.e. one
flat field) and **32–33 %** on sapphire at the same tilt; this build measures **0.0–0.8 %** in every one of the
12 spin × tilt cells. Two gates still miss (per-band 7×7 std in `crown_top`/`lower_pav`, and the +0.55
table-view cell clips), and sapphire's sheet is 2 points down (64 vs 66) while citrine's is up (64 vs 62).
Per the owner's restated priority (colour + structure across tilt/spin beats sheet total) the build ships;
revert is one `cp` from `lanes/value2/gem-shader.committed.js`.

## 1. The defect, reproduced

The owner's two screenshots are **not two spin angles** — they are two **tilts**. Spin is 45°-symmetric on this
cut (measured: spin 0 ≡ 90 to 0.1 L in every band, 35 ≡ 170), so a spin sweep cannot produce a 4× collapse.
Tilt can, and does:

| committed, frozen pose | pale-lowinfo | stone L50 | 7×7 std | mean sat |
|---|---|---|---|---|
| citrine, tilt −0.55 (below / pavilion view) | **84.7 %** | 248.4 | **0.32** | 92 |
| citrine, tilt 0 | 27.7 % | 202.2 | 5.38 | 142 |
| sapphire, tilt −0.55 | 32–33 % | 191.4–191.9 | 4.9–5.6 | 87 |
| sapphire, tilt +0.55 | 18–27 % | 173–186 | 8.5–9.0 | 87–100 |

Mechanism, straight from the code: the far-side proxy did **one** bounce (`refr` → `dir`), then either sampled
the env **or** let the flat stage backdrop win every non-TIR facet (`through = mix(env, win, stageOn*(1-tir)*inUv)`),
and the pale band was `rampMid*1.9` clipping its blue channel. At the below view almost every visible facet
mirrors the studio's near-black floor, so the flat backdrop fill *is* the whole interior — one field, no facets.

## 2. What changed (`src/components/GemReward/gem-shader.js`, 86 lines)

1. **Second bounce at the far facet** (the proxy *is* the far facet, so its own normal is the next surface):
   `e2 = refract(dir, nf, ior)` (stone→air eta, `nf` flipped to face the ray) → TIR or exit, `dir2`. On TIR the
   ray is reflected back into the stone and `dir2` swings per facet — that is the facet-to-facet structure.
2. **Facet mirror term**, `mir = reflect(w,-n)` sampled at mip 0 (sharp). This is the "reflection from top
   facets" the owner asked for; previously nothing sampled a facet mirror except on TIR.
3. **Beer–Lambert path colour inside the proxy**: `trans = exp(-(1-tint) * min(pathA + 1.5*tir2*pathB, 3.6) * 0.10)`
   with `pathA/B = 0.9 / |dot(dir,n)|`. A twice-bounced path is deeper **and** more saturated; sapphire
   absorbs red fastest, citrine blue (correct hue direction for both). Specular is added **after** it, so glints
   stay achromatic.
4. **Backdrop demoted**: the window is now projected from the **exit** ray `dir2`, gated by
   `winHit = smoothstep(-0.05,0.55, dot(dir2,w))` (only rays that actually leave towards the page) and by
   `(1-tir2)`, then scaled 0.85·0.55. The old flat `bounceSrc` fill is gone, replaced by a **folded floor
   bounce** (`mirf = normalize(vec3(mir.x, |mir.y|, mir.z))`) — a below-view facet now mirrors the lit upper
   tent instead of the black floor, which is exactly the cell that was washing out.
5. **Per-facet hash kept OUTSIDE the quantiser** (value-lane handoff #2): `floor(t1r*6)/6` then `+ (hn-0.5)*0.30`.
   **Ramp gain hue-normalised** so no channel clips: `rcg = rampc*1.9; rcg /= max(maxch, 0.98)`.
6. **Key-light specular** on the crown, half-vector with the env sun (3,5,4), `pow(…,240)*0.55`, achromatic.
7. **ACES on the proxy output** (`col = aces(col*0.75)`). The body material is tone-mapped by the renderer; this
   ShaderMaterial never was, so every HDR env sample hard-clipped at 1.0. This is why the same shader blew 32 %
   of the stone white at the table view while the body looked correct.

New uniform `dbg` (0 in production): R = first-bounce TIR, G = second-bounce TIR, for the gate-(d) mask.

## 3. Rotation / tilt lever (documented, as asked)

- **Spin**: `src/components/GemReward/gem3d.js` L51 — `rig.group.rotation.y = rig.cat.spin * rig.t * 0.9`.
  `capture.mjs` freezes it by zeroing `cat.spin` and `t`. My copy (`lanes/value2/capture2.mjs`, shared file
  untouched) freezes an arbitrary yaw by redefining both as accessors: `t` → constant 1 (so `t += dt` no-ops)
  and `cat.spin` → `A/0.9`, giving `rotation.y = A` exactly every frame. Verified in `meta.rotationY`
  (0.6109 for 35°, 1.2217 for 70°).
- **Tilt**: same loop, L52 — `rig.group.rotation.x = rig.tilt`; set `rig.tilt = rig.tiltT = T` (the easing is
  then a fixed point). `--tilt` flag added to the lane copy.
- **Cut symmetry**: 45°, so 0 ≡ 90 ≡ 180 and 35 ≡ 80 ≡ 170 — do not read a "new angle" from those.
- One capture (`base/sapphire/dark_a35_t0.55.png`) landed at 0.0158 rad instead of 0.6109 (the freeze block
  silently failed for that shot); the mask is a silhouette so the band numbers are unaffected, but noted.

## 4. Measured results

Full tables: **`lanes/value2/tables.md`** (A bands per spin angle, B tilt × spin, C gate matrix, D TIR split,
E sheet). Headline deltas, committed → this build:

| metric | sapphire | citrine |
|---|---|---|
| pale-lowinfo, spin 0 / 35 / 70 | 7.2 / 7.8 / 7.6 % → **0.4 / 0.6 / 0.0 %** | 27.7 / 27.8 / 27.5 % → **0.4 / 0.5 / 0.0 %** |
| pale-lowinfo, tilt −0.55 | 32–33 % → **0.0–0.5 %** | **84–85 % → 0.0–0.8 %** |
| pale-lowinfo, tilt +0.55 | 18–33 % → 6.7–11.5 % | 30–37 % → 6.5–9.7 % |
| clip, spin 0 / 35 / 70 | 0.017 / 0.051 / 0.011 → **0.006 / 0.008 / 0.0001** | 0.007 / 0.029 / 0.005 → **0.000 / 0.009 / 0.001** |
| achromatic bright field | 9.4 / 14.1 / 8.4 % → **2.9 / 2.6 / 1.6 %** | 2.2 / 7.3 / 2.2 % → 1.0 / 2.5 / 0.6 % |
| mean interior sat | 135–140 → **201–205** | 131–147 → **178–207** |
| upper-pavilion band L50 / sat | 191 / 86 → **79 / 220** | 246 / 110 → **123 / 211** |
| neon px | 0 → 0 | 0 → 0 |

Sapphire band table at the frozen spin (the pose the sheet scores):

| band | committed L50 / sat / std7 | this build L50 / sat / std7 |
|---|---|---|
| crown_top | 73.1 / 197.1 / 2.83 | 57.9 / 202.1 / **1.30** |
| crown_lower | 152.6 / 122.6 / 18.64 | 76.0 / 195.1 / 16.10 |
| girdle | 139.6 / 141.9 / 15.71 | 69.8 / 228.4 / 9.61 |
| upper_pav | 191.1 / 86.0 / 8.66 | 79.4 / 220.3 / 5.93 |
| lower_pav | 56.8 / 216.0 / 4.26 | 47.2 / 218.1 / **2.36** |
| culet | 56.0 / 225.2 / 6.26 | 40.5 / 232.3 / 3.26 |

## 5. Gates

Pass, both cats, all three spin angles: pale ≤ 12 %; neon 0; clip ≤ 0.02; dark bands L50 ≤ 130;
achromatic-bright ≤ 5 %; mean interior sat ≥ 110; sapphire r(sat,L) ≤ −0.5 (−0.83…−0.89).
Pass at both tilts: pale ≤ 12 % (12/12 cells, committed failed 9/12).
**Miss**: per-band 7×7 std ≥ 3.0 — `crown_top` (1.02–1.30 sap) and `lower_pav` (0.73–2.36 both cats) stay under;
**miss**: clip at tilt +0.55 (13–15 % vs committed 27–38 % — one flat facet going pure white: the *table* facet
whose exit ray aligns with the key, see §7); **miss**: dark-band L50 ≤ 130 and achrom ≤ 5 % in that same +0.55
cell; **miss**: sheet sapphire 64 < 66 (citrine 64 ≥ 62); **miss**: gate (d) below.
**Skipped**: none — every gate in the brief was measured at every captured cell except gate (d)'s
implicit "areas" framing, which is reported as measured-but-inverted (§6).

## 6. Gate (d) — TIR vs non-TIR: measured, FAILS, and why

`dbg` mask, same pose, 5 px-eroded stone:

| cat | TIR px | L p50 TIR | sat TIR | L p50 non-TIR | sat non-TIR | darker | more sat |
|---|---|---|---|---|---|---|---|
| sapphire | 98.8 % | 68.4 | 213.3 | 55.7 | 231.1 | **no** | **no** |
| citrine | 98.2 % | 118.6 | 207.7 | 98.9 | 206.6 | **no** | yes |

The model TIRs on ~98 % of facets at this pose (both bounces), so the "non-TIR" group is 1.2–1.9 % of the stone
and consists of the grazing silhouette facets, which are *dark by construction* — the group medians invert even
though the second segment does darken (Beer–Lambert, `1.5 × pathB`). Making this gate pass needs either a
physically-correct entry eta (so entry never TIRs and the groups separate — a bigger change than this lane's
budget) or a per-pixel path-length map rather than a boolean. Not claimed as passing.

## 7. The one remaining visual defect, with its cause and its lever

At tilt +0.55 (looking down at the table) 13–15 % of the stone is pure white and 20–22 % is achromatic bright.
Cause: the **table is a single flat facet**, so when its mirror/exit direction meets the key it flashes *whole* —
a 15 %-of-stone area of exactly 1.0. Committed does the same thing at 27–38 %, so this is a pre-existing
model limit, not a regression. Lever (one constant, no code): the white mix
`clamp((glint+kspec)*mix(0.5,0.85,tir))` in the last line caps at 0.47 → the table becomes an L≈200
highlight and clip → ~0; the cost is `crit5` (L ≥ 215 area) which is already what sapphire lost.

## 8. Sheet (rubric /110, frozen pose)

- sapphire **66 → 64**: crit1 6→8, crit2 6→8, crit9 8→10, but crit5 8→2 (bright-area: the stone is now deep
  navy end-to-end, L95 151 vs 237), crit4 3→2, crit6 3→2.
- citrine **62 → 64**: crit1 6→8, crit9 8→10, crit7 10→8, crit5 0→2.
- Motion re-measured on this rig (`motion.json`, 180 frames, CoV 0.28, monotonic) and reused for both builds so
  crit10 is comparable; crit10 = 4 both sides.

## 9. Honesty notes

- **Loops used: 8 capture-measure rounds, not 2.** Rounds 1–6 were brightness-anchor failures (the proxy's
  primary sample moved from the sharp mirror to the second-bounce direction, which is 2.2× darker — each round
  re-anchored one constant). Rounds 7 (try7, shipped) and 8 (try8, +0.75→1.0 mirror weight, 2.30→2.60 gain)
  differ by two constants and score identically (64/64); try8 is kept at `lanes/value2/gem-shader.try8.js`
  (`ef0dd71…`) if the parent prefers the slightly brighter variant.
- The owner's **49.1 %** figure was not reproduced on a spin angle; the reproducible collapse is the **tilt−0.55
  below view** (citrine 84.7 %, sapphire 32–33 %). Their own +0.55 row (dark, L50 78.5) matches my −0.55 row, so
  their tilt sign is probably inverted relative to `group.rotation.x`; both of my tilt cells are reported.
- citrine's `r(sat,L)` is **+0.32…+0.56** (gate wants ≤ −0.5): its interior is saturated everywhere (mean 180–207)
  so brighter facets are still saturated; the metric only separates when there is a wide value range. Reported as
  a miss rather than re-optimised, per the owner's "do not optimise r at the expense of structure".
- Committed reference restored and md5-checked three times; `.hermes/tmp/round6/gem-shader.{before,after}.js` were
  never used (stale generation, value-lane §5).

## 10. Files

| path | md5 |
|---|---|
| `src/components/GemReward/gem-shader.js` (shipped) | `ad74d41976447c38df55ced0249e3a1a` |
| `lanes/value2/gem-shader.try7.js` (= shipped) | `ad74d41976447c38df55ced0249e3a1a` |
| `lanes/value2/gem-shader.try8.js` (brighter variant) | `ef0dd71659954e4fa834b4033d0bb579` |
| `lanes/value2/gem-shader.committed.js` (revert) | `f854e086501c9213109339fcd5d33229` |
| `lanes/value2/capture2.mjs` (angle+tilt capture, unique token check per shot) | `4a5651afe6c8e9fc80ae9d7af9ab4205` |
| `lanes/value2/measure.py` (bands + colour/TIR gates) | `40c6845ed0916585aa42218d143671a9` |
| `lanes/value2/report.py` → `tables.md` | `73fc4987f22b4144f80e5caf7f353a79` |
| `lanes/value2/mk_try.py` / `mk_try3.py` / `mk_try4.py` (generators) | `ed6d4fd6…` / `ec87cabc…` / `24c2e870…` |

Captures: `lanes/value2/{sapphire,citrine}/` = this build (front, dark, tirmask at 0/35/70°, the seven sheet
roles at 0°, front+dark at ±0.55 × 0/35/70°); `lanes/value2/base/{sapphire,citrine}/` = committed bytes, same
grid + `motion.json` + `score.json`; `lanes/value2/probe*/` = the loop rounds 2–8 probes used to re-anchor.
`runs_baseline_00/`, the shared `capture.mjs` and every string-named edge/value lane were not touched.
