# verify_darkcaps — baseline (current runs/, 66/110 sapphire, 62/110 citrine)

Source: `.hermes/tmp/round6/runs/{sapphire,citrine}/` + `score.json` totals 66 / 62.
Detectors: `verify_darkcaps/detect.py` (own code; score.py never modified).
Raw: `baseline_sapphire.json`, `baseline_citrine.json`. md5s in `baseline_md5.txt`.

## (a) cap-zone stats (interior px, L<90 & 7x7std<8 dark-flat frac; zone L p5/std)

| cat | zone | n_interior | darkflat_frac | L_p5 | L_std |
|-----|------|-----------:|--------------:|-----:|------:|
| sapphire | top | 2588 | 0.000 | 127.1 | 24.48 |
| sapphire | mid | 11936 | 0.006 | 117.6 | 37.38 |
| sapphire | bot | 3860 | 0.819 | 45.4 | 18.55 |
| citrine | top | 3615 | 0.000 | 158.7 | 29.69 |
| citrine | mid | 3637 | 0.268 | 71.2 | 76.27 |
| citrine | bot | 1134 | 0.869 | 62.3 | 6.93 |

Dark-flat mask = 1 connected component per cat (sapphire 3232 px, citrine 1960 px).

## (b) slab frac (dark-flat / interior; max single CC / interior)

- sapphire: slab 0.176, maxCC 0.176 (gate: new <= 0.25)
- citrine: slab 0.234, maxCC 0.234 (gate: new <= 0.28)

## (c) straight segments (Hough peaks on |grad L|>=20 edges in dilated dark-flat zone) + shuffle null

- sapphire: straight 29 (137 edge px) vs null 0 (3472 edge px)
- citrine: straight 14 (62 edge px) vs null 1 (1943 edge px)
- Null collapses → segments are real structure, not noise.

## (d) neon in-mask (S>120 & hue-dist-from-token>60°)

- sapphire: 0, citrine: 0

## interior L p1 (gate: new p1 >= 15)

- sapphire p1 45.4 (p5 49.0); citrine p1 62.8 (p5 69.6)
