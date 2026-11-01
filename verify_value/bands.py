#!/usr/bin/env python3
"""Value-band detectors (verify_value lane — own code; score.py never modified).

Implements the FROZEN band measurement spec verbatim:

  mask   = <run-dir>/dark.png, S > 20, largest 8-connected component, holes filled
  bands  = fractions of the mask bbox HEIGHT
           crown_top      0.00 - 0.22
           crown_lower    0.22 - 0.38
           girdle         0.38 - 0.46
           upper_pavilion 0.46 - 0.68
           lower_pavilion 0.68 - 0.86
           culet          0.86 - 1.00
  per band: %stone (mask coverage of the band rectangle), L p50/p5/p95,
            S median, 7x7 local-std median
  global  : L p5 / p95, clip frac (L >= 250), pale-lowinfo frac
            (L > 185 & 7x7std < 6), neon in-mask, slab frac
            (interior L in 40..80 & 7x7std < 6)

Pixel statistics are taken on front.png (the graded look) with the dark.png
mask applied to the same pixel grid — same camera/pose, silhouettes align.
A parallel pass on dark.png itself is emitted under "alt_dark" so the reading
is auditable either way. Gates are judged on "front".

Conventions copied from prototype/gems/score.py (read-only reference):
  L = 0.2126R + 0.7152G + 0.0722B ; HSV S on 0..255 ; H in degrees
  interior = mask eroded 2 px
"""

from __future__ import annotations

import argparse
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

EIGHT = np.ones((3, 3), dtype=bool)

BANDS = (
    ("crown_top", 0.00, 0.22),
    ("crown_lower", 0.22, 0.38),
    ("girdle", 0.38, 0.46),
    ("upper_pavilion", 0.46, 0.68),
    ("lower_pavilion", 0.68, 0.86),
    ("culet", 0.86, 1.00),
)

TOKEN_HUES = {"sapphire": 208.7, "citrine": 38.9}

PALE_L = 185.0
PALE_STD = 6.0
SLAB_L0, SLAB_L1 = 40.0, 80.0
SLAB_STD = 6.0
CLIP_L = 250.0


def load_rgb(path):
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.float64)


def luma(rgb):
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def sat255(rgb):
    mx = rgb.max(axis=-1)
    mn = rgb.min(axis=-1)
    return np.where(mx > 0.0, (mx - mn) / np.where(mx > 0.0, mx, 1.0) * 255.0, 0.0)


def hue_deg(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(axis=-1)
    d = mx - rgb.min(axis=-1)
    safe = np.where(d > 1e-6, d, 1.0)
    hr = ((g - b) / safe) % 6.0
    hg = 2.0 + (b - r) / safe
    hb = 4.0 + (r - g) / safe
    h = np.where(mx == r, hr, np.where(mx == g, hg, hb)) * 60.0
    return h % 360.0


def std7(L):
    m = ndi.uniform_filter(L, size=7, mode="nearest")
    m2 = ndi.uniform_filter(L * L, size=7, mode="nearest")
    return np.sqrt(np.maximum(m2 - m * m, 0.0))


def mask_from_dark(dark_rgb):
    seed = sat255(dark_rgb) > 20.0
    lab, n = ndi.label(seed, structure=EIGHT)
    if n == 0:
        raise ValueError("empty silhouette seed (dark.png S>20)")
    sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
    mask = lab == (int(np.argmax(sizes)) + 1)
    return ndi.binary_fill_holes(mask)


def band_stats(L, S, SD7, mask, r0, r1, y0, y1):
    """Stats over stone px inside rows [y0,y1) of the bbox."""
    sub_m = mask[y0:y1]
    n_stone = int(sub_m.sum())
    band_px = (y1 - y0) * mask.shape[1]
    out = {
        "rows": [int(y0), int(y1)],
        "stone_frac": round(n_stone / band_px, 4) if band_px else 0.0,
        "n_stone": n_stone,
    }
    if n_stone == 0:
        out.update({k: None for k in ("L_p50", "L_p5", "L_p95", "S_med", "std7_med")})
        return out
    lv = L[y0:y1][sub_m]
    sv = S[y0:y1][sub_m]
    dv = SD7[y0:y1][sub_m]
    out.update(
        L_p50=round(float(np.percentile(lv, 50)), 2),
        L_p5=round(float(np.percentile(lv, 5)), 2),
        L_p95=round(float(np.percentile(lv, 95)), 2),
        S_med=round(float(np.median(sv)), 2),
        std7_med=round(float(np.median(dv)), 3),
    )
    return out


def global_stats(L, S, H, SD7, mask, color):
    interior = ndi.binary_erosion(mask, EIGHT, iterations=2)
    lv = L[mask]
    sv = S[mask]
    dv = SD7[mask]
    token = TOKEN_HUES.get(color)
    if token is None:
        neon = None
    else:
        hd = np.abs((H - token + 180.0) % 360.0 - 180.0)
        neon = int((mask & (S > 120.0) & (hd > 60.0)).sum())
    iL = L[interior]
    iSD = SD7[interior]
    slab = int(((iL >= SLAB_L0) & (iL <= SLAB_L1) & (iSD < SLAB_STD)).sum())
    n_int = int(interior.sum())
    return {
        "L_p5": round(float(np.percentile(lv, 5)), 2),
        "L_p95": round(float(np.percentile(lv, 95)), 2),
        "L_p50": round(float(np.percentile(lv, 50)), 2),
        "clip_frac": round(float((lv >= CLIP_L).mean()), 5),
        "pale_lowinfo_frac": round(float(((lv > PALE_L) & (dv < PALE_STD)).mean()), 5),
        "neon_inmask": neon,
        "slab_frac": round(slab / n_int, 4) if n_int else None,
        "n_mask": int(mask.sum()),
        "n_interior": n_int,
        "n_pale_lowinfo": int(((lv > PALE_L) & (dv < PALE_STD)).sum()),
        "n_slab": slab,
    }


def bands_for(rgb, mask, color, S, H, L, SD7):
    ys, xs = np.where(mask)
    by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    Hh = by1 - by0
    out = {"bbox": [int(bx0), int(by0), int(bx1), int(by1)], "bbox_h": int(Hh)}
    for name, f0, f1 in BANDS:
        y0 = int(round(by0 + f0 * Hh))
        y1 = int(round(by0 + f1 * Hh))
        out[name] = band_stats(L, S, SD7, mask, f0, f1, y0, y1)
    return out


def measure(run_dir, color):
    dark = load_rgb(os.path.join(run_dir, "dark.png"))
    front = load_rgb(os.path.join(run_dir, "front.png"))
    if dark.shape != front.shape:
        raise ValueError("dark/front shape mismatch %s vs %s" % (dark.shape, front.shape))
    mask = mask_from_dark(dark)

    res = {"run_dir": run_dir, "color": color,
           "front": None, "alt_dark": None}

    for tag, rgb in (("front", front), ("alt_dark", dark)):
        L, S, H, SD = luma(rgb), sat255(rgb), hue_deg(rgb), std7(luma(rgb))
        res[tag] = {
            "bands": bands_for(rgb, mask, color, S, H, L, SD),
            "global": global_stats(L, S, H, SD, mask, color),
        }
    return res


def gates(res):
    """The PASS gates from the brief, evaluated on the front pass."""
    f = res["front"]
    b, g = f["bands"], f["global"]
    ct, lp, up = b["crown_top"], b["lower_pavilion"], b["upper_pavilion"]

    def ok(v, lo=None, hi=None):
        if v is None:
            return False
        return (lo is None or v >= lo) and (hi is None or v <= hi)

    return {
        "crown_top_dark": {
            "std7_med": ct["std7_med"], "L_p50": ct["L_p50"],
            "pass": bool(ok(ct["std7_med"], 4.0) and ok(ct["L_p50"], 80.0, 130.0)),
        },
        "lower_pavilion_dark": {
            "std7_med": lp["std7_med"], "L_p50": lp["L_p50"],
            "pass": bool(ok(lp["std7_med"], 4.0) and ok(lp["L_p50"], 80.0, 130.0)),
        },
        "upper_pavilion_chroma": {
            "S_med": up["S_med"], "L_p50": up["L_p50"], "std7_med": up["std7_med"],
            "pass": bool(ok(up["S_med"], 110.0) and ok(up["L_p50"], None, 185.0)
                         and ok(up["std7_med"], 6.0)),
        },
        "global_range": {
            "L_p5": g["L_p5"], "L_p95": g["L_p95"],
            "pass": bool(ok(g["L_p5"], None, 75.0) and ok(g["L_p95"], 235.0)),
        },
        "neon": {"neon_inmask": g["neon_inmask"], "pass": g["neon_inmask"] == 0},
        "clip": {"clip_frac": g["clip_frac"], "pass": bool(ok(g["clip_frac"], None, 0.02))},
        "slab": {"slab_frac": g["slab_frac"],
                 "limit": 0.25 if res["color"] == "sapphire" else 0.28,
                 "pass": bool(ok(g["slab_frac"], None,
                                 0.25 if res["color"] == "sapphire" else 0.28))},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run_dir")
    ap.add_argument("--color", required=True)
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    res = measure(a.run_dir, a.color)
    res["gates"] = gates(res)
    txt = json.dumps(res, indent=1)
    if a.out:
        with open(a.out, "w") as fh:
            fh.write(txt + "\n")
    else:
        print(txt)


if __name__ == "__main__":
    main()
