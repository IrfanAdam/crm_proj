#!/usr/bin/env python3
"""bands2.py — frozen band meter for verify_value2 (independent implementation).

FROZEN MEASUREMENT (from brief, implemented here from scratch):
  mask   = <run>/dark.png, HSV S > 20, largest 8-connected CC, holes filled
  bands  = fractions of mask bbox HEIGHT:
             crown_top 0.00-0.18, crown_lower 0.18-0.32, girdle 0.32-0.38,
             upper_pavilion 0.38-0.62, mid_pavilion 0.62-0.82, culet 0.82-1.00
  per band: %stone (share of all stone px), L p50, sat median, 7x7 std median
  globals : pale-lowinfo frac (L>185 & 7x7std<6), L p5/p95/p50,
            clip frac (L>=250), neon frac (in-mask)
  neon    : magenta r>120 & b>120 & r>g+50 & b>g+50
            green   g>140 & g>r+60 & g>b+40

usage: python3 verify_value2/bands2.py <run-dir> --cat sapphire [--img front]
       python3 verify_value2/bands2.py <run-dir> --cat sapphire --json out.json
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

BANDS = [
    ("crown_top", 0.00, 0.18),
    ("crown_lower", 0.18, 0.32),
    ("girdle", 0.32, 0.38),
    ("upper_pavilion", 0.38, 0.62),
    ("mid_pavilion", 0.62, 0.82),
    ("culet", 0.82, 1.00),
]

SAT_MASK_THR = 20.0
PALE_L = 185.0
PALE_STD = 6.0
CLIP_L = 250.0


def lum(rgb):
    return 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]


def sat(rgb):
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    d = mx - mn
    return np.where(mx > 1e-6, d / np.maximum(mx.astype(np.float64), 1e-6), 0.0) * 255.0


def local_std(L, k=7):
    """std of L in a k x k window (uniform filter moments), same grid as L."""
    r = k // 2
    m = ndi.uniform_filter(L, size=k, mode="nearest")
    m2 = ndi.uniform_filter(L * L, size=k, mode="nearest")
    var = np.maximum(m2 - m * m, 0.0) * (k * k) / max(k * k - 1, 1)
    return np.sqrt(var)


def mask_from_dark(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float64)
    s = sat(a)
    seed = s > SAT_MASK_THR
    lab, n = ndi.label(seed, structure=np.ones((3, 3), bool))
    if n == 0:
        return None, None, a
    sizes = ndi.sum(seed, lab, index=np.arange(1, n + 1))
    big = lab == (int(np.argmax(sizes)) + 1)
    filled = ndi.binary_fill_holes(big)
    return filled, lab, a


def stats(name, run_dir, img_role="front", mask_role="dark"):
    dark_path = os.path.join(run_dir, f"{mask_role}.png")
    if not os.path.exists(dark_path):
        raise SystemExit(f"error: no {mask_role}.png in {run_dir}")
    img_path = os.path.join(run_dir, f"{img_role}.png")
    if not os.path.exists(img_path):
        raise SystemExit(f"error: no {img_role}.png in {run_dir}")
    return measure(name, dark_path, img_path, run_dir=run_dir, img_role=img_role)


def measure(name, mask_png, img_png, run_dir="", img_role="front"):
    mask, lab, _ = mask_from_dark(mask_png)
    if mask is None or mask.sum() == 0:
        raise SystemExit(f"error: empty mask from {mask_png}")

    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    h = y1 - y0
    w = x1 - x0

    rgb = np.asarray(Image.open(img_png).convert("RGB")).astype(np.float64)
    L = lum(rgb)
    S = sat(rgb)
    SD = local_std(L, 7)

    n_stone = int(mask.sum())
    out = {
        "run_dir": run_dir,
        "cat": name,
        "img": img_role,
        "mask_px": n_stone,
        "bbox": [int(x0), int(y0), int(x1), int(y1)],
        "bbox_h": int(h),
        "bands": {},
        "globals": {},
    }

    for bname, f0, f1 in BANDS:
        r0 = int(round(y0 + f0 * h))
        r1 = int(round(y0 + f1 * h))
        band = np.zeros_like(mask)
        band[r0:r1, :] = True
        sel = mask & band
        n = int(sel.sum())
        d = {"y0": r0, "y1": r1, "px": n, "frac_stone": n / n_stone if n_stone else 0.0}
        if n:
            lv = L[sel]
            d.update({
                "L_p50": float(np.percentile(lv, 50)),
                "L_p05": float(np.percentile(lv, 5)),
                "L_p95": float(np.percentile(lv, 95)),
                "S_med": float(np.median(S[sel])),
                "std7_med": float(np.median(SD[sel])),
                "std7_p10": float(np.percentile(SD[sel], 10)),
                "pale_frac": float(np.mean((lv > PALE_L) & (SD[sel] < PALE_STD))),
            })
        out["bands"][bname] = d

    lv = L[mask]
    sd = SD[mask]
    # interior = mask eroded 2 px (same convention as score.py's interior stats)
    interior = ndi.binary_erosion(mask, np.ones((5, 5), bool), iterations=1)
    ilv = L[interior]
    isv = S[interior]
    pale = (lv > PALE_L) & (sd < PALE_STD)
    r_, g_, b_ = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    magenta = (r_ > 120) & (b_ > 120) & (r_ > g_ + 50) & (b_ > g_ + 50)
    green = (g_ > 140) & (g_ > r_ + 60) & (g_ > b_ + 40)
    neon = (magenta | green) & mask
    # (a) interior saturation-vs-luminance coupling
    if lv.size > 2 and lv.std() > 1e-9 and S[mask].std() > 1e-9:
        corr = float(np.corrcoef(S[mask], lv)[0, 1])
    else:
        corr = 0.0
    # (b) achromatic bright field
    achro = (S < 60) & (L > 150) & mask
    out["globals"] = {
        "L_p05": float(np.percentile(lv, 5)),
        "L_p50": float(np.percentile(lv, 50)),
        "L_p95": float(np.percentile(lv, 95)),
        "clip_frac": float(np.mean(lv >= CLIP_L)),
        "pale_lowinfo_frac": float(pale.mean()),
        "pale_lowinfo_px": int(pale.sum()),
        "neon_frac": float(neon.sum() / n_stone),
        "neon_px": int(neon.sum()),
        "std7_med": float(np.median(sd)),
        # new gates (a)-(c)
        "sat_L_pearson_r": corr,
        "achro_bright_frac": float(achro.sum() / n_stone),
        "achro_bright_px": int(achro.sum()),
        "interior_px": int(interior.sum()),
        "interior_sat_mean": float(isv.mean()) if isv.size else 0.0,
        "interior_sat_med": float(np.median(isv)) if isv.size else 0.0,
        "interior_L_med": float(np.median(ilv)) if ilv.size else 0.0,
        "tir": {"status": "NOT MEASURED", "rule": None},
    }
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run_dir")
    ap.add_argument("--cat", default="sapphire")
    ap.add_argument("--img", default="front")
    ap.add_argument("--json", default=None)
    a = ap.parse_args()
    o = stats(a.cat, a.run_dir, a.img)
    txt = json.dumps(o, indent=2)
    if a.json:
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        with open(a.json, "w") as fh:
            fh.write(txt + "\n")
    print(txt)
    return 0


if __name__ == "__main__":
    sys.exit(main())
