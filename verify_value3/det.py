#!/usr/bin/env python3
"""verify_value3/det.py — independent stone detectors for round 6 / value3 verification.

Written from scratch for this lane (no reuse of other lanes' modules).

MASK (per shot, per brief):
    HSV-style saturation S = (max-min)/max*255 ; mask0 = S > 20
    keep largest 8-connected connected component, then binary_fill_holes.
    Saturation is used (not luma) because the stone is the only strongly
    chromatic object in BOTH the light and the dark scheme, while the card
    background is desaturated in both.

PER SHOT REPORTED:
    stone L p50 / p95 (Rec.709 luma, 0..255)
    stone sat median
    7x7 local-std median (std of L in a 7x7 window, sampled on mask)
    pale-lowinfo  fraction: L > 185 AND 7x7std < 6
    clip          fraction: L >= 250
    achro-bright  fraction: sat < 60 AND L > 150
    neon-in-mask  fraction + counts:
        magenta r>120 & b>120 & r>g+50 & b>g+50
        green   g>140 & g>r+60 & g>b+40

BANDS (vertical, fractions of the mask bbox height) — needed for
"band std" and "dark bands L p50":
    0.00-0.18 crown_top | 0.18-0.32 crown_lower | 0.32-0.38 girdle
    0.38-0.62 upper_pavilion | 0.62-0.82 mid_pavilion | 0.82-1.00 culet
    per band: share of stone px, L p50, sat median, 7x7 std median

CLI:
    python3 verify_value3/det.py <png-or-dir> [--glob 'front*.png'] [--json out.json]
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SAT_THR = 20.0
PALE_L = 185.0
PALE_STD = 6.0
CLIP_L = 250.0
ACHRO_SAT = 60.0
ACHRO_L = 150.0
WIN = 7

BANDS = [
    ("crown_top", 0.00, 0.18),
    ("crown_lower", 0.18, 0.32),
    ("girdle", 0.32, 0.38),
    ("upper_pavilion", 0.38, 0.62),
    ("mid_pavilion", 0.62, 0.82),
    ("culet", 0.82, 1.00),
]


def load_rgb(path):
    with Image.open(path) as im:
        return np.asarray(im.convert("RGB"), dtype=np.float32)


def luma(rgb):
    return 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]


def saturation(rgb):
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    out = np.zeros_like(mx)
    nz = mx > 1e-6
    out[nz] = (mx[nz] - mn[nz]) / mx[nz] * 255.0
    return out


def local_std(L, k=WIN):
    """7x7 population-corrected std of L, same grid as L."""
    mean = ndi.uniform_filter(L, size=k, mode="nearest")
    mean_sq = ndi.uniform_filter(L * L, size=k, mode="nearest")
    var = np.maximum(mean_sq - mean * mean, 0.0)
    return np.sqrt(var * (k * k) / (k * k - 1.0))


EIGHT = np.ones((3, 3), dtype=int)


def stone_mask(sat_img):
    raw = sat_img > SAT_THR
    lab, n = ndi.label(raw, structure=EIGHT)
    if n == 0:
        return np.zeros_like(raw), 0, 0
    sizes = ndi.sum(raw, lab, index=np.arange(1, n + 1))
    keep = int(np.argmax(sizes)) + 1
    m = lab == keep
    m = ndi.binary_fill_holes(m)
    return m, n, int(sizes[keep - 1])


def pct(mask_sel, mask_all):
    tot = int(mask_all.sum())
    return float(100.0 * mask_sel.sum() / tot) if tot else 0.0


def measure(path):
    rgb = load_rgb(path)
    L = luma(rgb)
    S = saturation(rgb)
    mask, ncc, cc_px = stone_mask(S)
    if not mask.any():
        return {"file": path, "error": "empty mask", "h": rgb.shape[0], "w": rgb.shape[1]}

    std = local_std(L)
    Lm = L[mask]
    Sm = S[mask]
    STm = std[mask]

    pale = (Lm > PALE_L) & (STm < PALE_STD)
    clip = Lm >= CLIP_L
    achro = (Sm < ACHRO_SAT) & (Lm > ACHRO_L)

    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mag = (r > 120) & (b > 120) & (r > g + 50) & (b > g + 50) & mask
    grn = (g > 140) & (g > r + 60) & (g > b + 40) & mask
    neon = mag | grn

    ys, xs = np.nonzero(mask)
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    h = max(y1 - y0, 1)

    bands = {}
    for name, f0, f1 in BANDS:
        ya = y0 + int(round(f0 * h))
        yb = y0 + int(round(f1 * h))
        yb = min(max(yb, ya + 1), y1)
        sel = mask[ya:yb, x0:x1]
        selc = mask[ya:yb, :]
        if not sel.any():
            bands[name] = {"share": 0.0, "L_p50": None, "sat_med": None, "std_med": None}
            continue
        bl = L[ya:yb, :][selc]
        bs = S[ya:yb, :][selc]
        bt = std[ya:yb, :][selc]
        bands[name] = {
            "share": float(100.0 * selc.sum() / mask.sum()),
            "L_p50": float(np.percentile(bl, 50)),
            "L_p95": float(np.percentile(bl, 95)),
            "sat_med": float(np.median(bs)),
            "std_med": float(np.median(bt)),
        }

    band_p50 = [v["L_p50"] for v in bands.values() if v["L_p50"] is not None]
    band_std_med = [v["std_med"] for v in bands.values() if v["std_med"] is not None]

    return {
        "file": os.path.basename(path),
        "path": path,
        "h": int(rgb.shape[0]),
        "w": int(rgb.shape[1]),
        "mask_px": int(mask.sum()),
        "mask_frac_of_frame": float(100.0 * mask.sum() / mask.size),
        "mask_components": ncc,
        "mask_largest_cc_px": cc_px,
        "mask_bbox": [x0, y0, x1, y1],
        "L_p50": float(np.percentile(Lm, 50)),
        "L_p95": float(np.percentile(Lm, 95)),
        "L_p05": float(np.percentile(Lm, 5)),
        "L_mean": float(Lm.mean()),
        "sat_med": float(np.median(Sm)),
        "std7_med": float(np.median(STm)),
        "pale_lowinfo_pct": float(100.0 * pale.mean()),
        "clip_pct": float(100.0 * clip.mean()),
        "achro_bright_pct": float(100.0 * achro.mean()),
        "neon_pct": float(100.0 * neon.sum() / mask.sum()),
        "neon_magenta_px": int(mag.sum()),
        "neon_green_px": int(grn.sum()),
        "band_std_of_p50": float(np.std(band_p50)) if band_p50 else None,
        "band_std7_med_median": float(np.median(band_std_med)) if band_std_med else None,
        "band_std7_med_min": float(np.min(band_std_med)) if band_std_med else None,
        "bands": bands,
    }


def collect(target, pattern=None):
    if os.path.isdir(target):
        pats = pattern.split(",") if pattern else ["*.png"]
        out = []
        for p in pats:
            for name in sorted(os.listdir(target)):
                import fnmatch
                if fnmatch.fnmatch(name, p):
                    out.append(os.path.join(target, name))
        return out
    return [target]


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("target")
    ap.add_argument("--glob", default=None, help="comma separated fnmatch, default *.png")
    ap.add_argument("--json", default=None)
    args = ap.parse_args(argv)
    files = collect(args.target, args.glob)
    res = [measure(f) for f in files]
    body = {"target": args.target, "n": len(res), "shots": res}
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(body, fh, indent=2)
        print(f"wrote {args.json} ({len(res)} shots)")
    else:
        print(json.dumps(body, indent=2)[:4000])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
