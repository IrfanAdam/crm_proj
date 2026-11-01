# value — compress the dark/pale extremes with structure preserved

Verdict: **FAILED — fix reverted to committed bytes.** Structure is decisively recovered at both
ends (7x7 std up 2.4–3.0x in every band of both stones, pale "empty" slab 0.073→0.012 /
0.271→0.049), but three band gates and the sheet gate miss. The tree is back to committed:
`src/components/GemReward/gem-shader.js` md5 **f854e086501c9213109339fcd5d33229** (re-render
verified: mean|d| 0.012 / 0.124 vs `runs_baseline_00`, bands reproduce to 0.1 L).

## 1. Attribution (uniform-only probes, 9 fresh Chrome loads, `probe.mjs`, no src edit)

Instrument: `bands.py` (frozen: mask = `<cat>/dark.png` sat>20 → largest CC → fill; bands =
fractions of mask bbox height; 7x7 local std). Sapphire, upper-pavilion band (the pale "empty"):

| probe | L50 | sat | std7 | reading |
|---|---|---|---|---|
| ctrl (committed render) | 191.1 | 86.0 | 8.87 | pale, blue-white, mean RGB 165/192/250 (B clipping) |
| `pxy0` proxy `gain=0` | 42.7 | 113.3 | **0.28** | the **far-side proxy owns ~97% of the pale band's light** |
| ramp uniforms all black | 138.6 | 136.7 | 2.36 | the `rampc` gate controls only **27%** of it — 73% is un-gated residual (`mix(...,0.62)`) |
| ramp all = `rampDeep` (0e54c8) | 158.3 | **121.1** | 6.52 | forcing the blue end on pale facets: −33 L, +35 sat, std 6.5 → the direction that works |
| `rampDeep` only, red | 139.6 | 134.0 | 2.36 | deep bucket nearly absent here (+R 10) |
| `rampMid` only, red | 169.8 | 93.5 | 4.32 | **`rampMid` (218aea) owns the pale band (+R 130)** |
| `rampLite` only, red | 147.8 | 100.4 | 5.85 | lite secondary (+R 35) |
| proxy `gain` x0.5 | 142.7 | 140.4 | 8.60 | pale band is a pure gain scale of the proxy |

Dark end: the same ramp-black probe moves lower-pavilion by only **3.6 L** (56.7→53.1, std
4.09→1.79) — the dark end is ~94% un-gated `through`, so no ramp/colour change can lift it
("*lift only, no redistribution available*"). And the existing per-facet hash jitter is
**destroyed by the quantiser**: `t1r = floor(t1r*6.0)/6.0` has 0.167-wide bins against a
±0.14 `hn` jitter, so every deep facet lands in bin 0 with an identical `rampDeep` → the
1.5–4 std flattening the owner sees inside the navy.

Conclusion: (a) the pale wash is proxy `env` (warm-white tent + broad `vN` term) passing
un-gated because `rampc` at the mid/lite end is 218aea→**cfdcf7** (near white) times 1.9, i.e.
the gate *whitens* rather than colours; (b) the navy is flat because the hash never survives
quantisation and because multiplying a near-zero `through` cannot lift it.

## 2. The one fix (reverted) — `lanes/value/gem-shader.loop2.js`

One mechanism at both ends: let the facet hash survive the quantiser, then (dark end) pull
`through` up to a hash-gated, token-tinted **floor**, (pale end) raise the ramp gate and attenuate
bright facets only where the hash allows. +0 JS lines (99 → 99).

```glsl
// in: after the quantiser (line 58)
t1r = floor( t1r * 6.0 ) / 6.0;
t1r = clamp( t1r + ( hn - 0.5 ) * 0.30, 0.0, 1.0 );
// replaces 'through *= mix( vec3(1.0), rampc*1.9, 0.62 );' (line 62)
float envL = ( env.r + env.g + env.b ) * 0.3333;
float hA = clamp( hn * 1.5 - 0.35, 0.0, 1.0 );
float hB = clamp( hn * 1.35 - 0.18, 0.0, 1.0 );
through *= mix( vec3( 1.0 ), min( rampc * 1.9, vec3( 1.4 ) ), 0.62 + 0.34 * smoothstep( 0.04, 0.26, envL ) * hA );
through *= 1.0 - 0.50 * smoothstep( 0.05, 0.28, envL ) * ( 1.0 - hB );
vec3 fl = mix( vec3( 0.62, 0.68, 0.92 ), rampc, 0.5 );
fl *= 0.066 / max( dot( fl, vec3( 0.2126, 0.7152, 0.0722 ) ), 0.04 );
through = max( through, fl * ( step( 0.26, hn ) * ( 0.78 + 0.22 * hn ) * ( 1.0 - smoothstep( 0.02, 0.45, t1r ) ) ) );
```

No global lift: the floor is `max()`-applied only below it and only on 74% of facets (26% of the
hash keeps its committed value, which is what preserves global p5 and crit-2's shadow); the pale
attenuation never touches the 18%-top hash group, which is what preserves p95.

## 3. Band table (frozen instrument, `front`, both stones)

| cat | band | committed L50 / std7 / sat | loop-2 L50 / std7 / sat | delta L / std |
|---|---|---|---|---|
| sapphire | crown top | **73.1** / **2.67** / 197.1 | 86.4 / 6.07 / 187.6 | +13.3 / **+3.40** |
| sapphire | crown lower | 158.7 / 20.18 / 115.3 | 143.5 / 22.55 / 138.2 | −15.2 / +2.37 |
| sapphire | girdle | 138.1 / 15.73 / 144.4 | 131.2 / 21.52 / 154.5 | −6.9 / +5.79 |
| sapphire | **upper pav** | 191.1 / 8.88 / **86.0** | 179.2 / **20.17** / **102.0** | **−11.9 / +11.29** |
| sapphire | **lower pav** | **56.7** / **4.08** / 216.0 | **71.8** / **6.54** / 200.0 | **+15.1 / +2.46** |
| sapphire | culet | 56.0 / 5.98 / 225.2 | 71.7 / 9.03 / 201.6 | +15.7 / +3.05 |
| sapphire | global | L5 55.6 / L95 237.8 / clip 0.0182 | L5 66.3 / L95 229.4 / clip 0.0126 | pale-slab 0.073→**0.012** |
| citrine | crown top | 90.5 / 7.24 / 156.3 | 106.8 / 10.64 / 176.7 | +16.3 / +3.40 |
| citrine | crown lower | 213.1 / 20.12 / 134.0 | 183.1 / 24.02 / 167.3 | −30.0 / +3.90 |
| citrine | girdle | 248.4 / 2.87 / 92.0 | 201.3 / 14.03 / 160.0 | −47.1 / +11.16 |
| citrine | **upper pav** | 245.6 / 3.23 / 111.0 | 206.9 / 14.20 / 153.0 | **−38.7 / +10.97** |
| citrine | **lower pav** | 73.2 / 2.00 / 168.8 | 91.4 / 6.09 / 190.6 | **+18.2 / +4.09** |
| citrine | culet | 73.0 / 5.95 / 176.7 | 91.0 / 9.98 / 199.3 | +18.0 / +4.03 |
| citrine | global | L5 68.0 / L95 250.1 / clip 0.0101 | L5 79.7 / L95 248.6 / clip 0.0062 | pale-slab 0.271→**0.049** |

## 4. Gates

| gate | requirement | sapphire | citrine | verdict |
|---|---|---|---|---|
| G1 crown-top **and** lower-pav | std ≥ 4.0, L50 80..130 | top 86.4 / 6.07 **PASS**; lower 71.8 (L50 < 80) / 6.54 | top 106.8 / 10.64 **PASS**; lower 91.4 / 6.09 **PASS** | **FAIL** (sap lower L50) |
| G2 upper pavilion | sat ≥ 110, L50 ≤ 185, std ≥ 6 | sat **102.0** (<110), L50 179.2, std 20.17 | sat 153.0, L50 **206.9** (>185), std 14.20 | **FAIL** (both) |
| G3 global extremes | L5 ≤ 75 **and** L95 ≥ 235 | L5 66.3 ✓, L95 **229.4** (<235) | L5 **79.7** (>75), L95 248.6 ✓ | **FAIL** (both) |
| G4 neon / sheet / clip / slab | neon 0, sheet ≥ 66/62, clip ≤ 0.02, slab not worse | neon 0 ✓, sheet **64** (<66), clip 0.0126 ✓, slab 0.012 (dark-flat 0.225) ✓ | neon 0 ✓, sheet **58** (<62), clip 0.0062 ✓, slab 0.049 (dark-flat 0.050) ✓ | **FAIL** (sheet) |
| G5 dark↔pale gap | ≤ 105 | 100.1 ✓ | **107.8** | **FAIL** (cit) |

Sheet deltas vs committed (66/62 → 64/58): sapphire crit2 6→4 (p1 56.3, DR 198.7, stops 1.92),
crit4 3→1, crit6 3→1, crit7 8→**10**, crit9 8→**10**; citrine crit1 6→4 (edge_frac 0.165),
crit4 3→1, crit6 3→1, crit9 8→**10**. The losses are the floor's cost on the shadow/fire axes
(same failure mode the darkcaps lane hit); the gains are colour-tell and clipping.

## 5. Trap found (important for the next lane)

`.hermes/tmp/round6/gem-shader.before.js` (8ccae6…) and `.after.js` (eb450…) are **stale**: their
body-dispersion chunk is an older generation (`getIBLVolumeRefraction(… material.roughness …)`,
additive `+= vec3(0.05)*tzdark`). Copying `.before.js` over src /silently replaces the shipped
body with the old pale-wash version/ — the stone goes flat pale (crown-top L50 73→151, lower-pav
57→119, mean|d| 1.30 vs baseline). Committed bytes are **f854e08…**, reconstructible as
`gem-shader.loop2.js` minus the two hunks in §2 (kept as `lanes/value/gem-shader.committed.js`);
verified by re-render: mean|d| 0.012 (sap) / 0.124 (cit) against `runs_baseline_00` with bands
reproducing to 0.1 L.

## 6. Files

- `lanes/value/{sapphire,citrine}/` — full loop-2 variant sets (front, repeat, txoff, dispoff,
  chart, dark, nogem, proxy, noproxy) + `meta.json` + `score.json` (**64** / **58**)
- `lanes/value/probes/{sapphire,citrine}/` — probe renders: `ctrl, pxy0, ramp0, rampR, rampHalf,
  pxyhalf, deepR, midR, liteR, verify` + `meta_<cat>.json` (uniform state recorded per probe)
- `lanes/value/baseline_runs/` — committed reference captures copied out before the loop
- `lanes/value/gem-shader.loop2.js` (the fix), `gem-shader.committed.js` (restore), `probe.mjs`, `bands.py`
- `lanes/value/committed_on_tree/` — the washed renders produced while the stale `.before.js` was
  in place (evidence for §5: `sapphire_front_committedcode{,_b}.png`, crown-top L50 151)
- `runs/` restored byte-identical to `runs_baseline_00` (md5-checked); `runs_baseline_00/` untouched
