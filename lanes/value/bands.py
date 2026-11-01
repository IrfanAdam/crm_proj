#!/usr/bin/env python3
"""bands.py — frozen band meter (variant of the round-6 instrument, read-only).

mask: <cat>/dark.png, HSV S > 20, largest 8-connected component, holes filled.
bands: fractions of mask bbox height (crown top 0-.22, crown lower .22-.38,
girdle .38-.46, upper pavilion .46-.68, lower pavilion .68-.86, culet .86-1.0)
stats: %stone, L p50/p5/p95, sat median, 7x7 local std median.
usage: python3 lanes/value/bands.py <run-dir> [--cat sapphire] [--img front]
"""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

BANDS = [("crown_top", 0.00, 0.22), ("crown_lower", 0.22, 0.38), ("girdle", 0.38, 0.46),
         ("upper_pav", 0.46, 0.68), ("lower_pav", 0.68, 0.86), ("culet", 0.86, 1.00)]

def lum(a):
    return 0.2126 * a[:, :, 0] + 0.7152 * a[:, :, 1] + 0.0722 * a[:, :, 2]

def hsv(a):
    r, g, b = a[:, :, 0] / 255.0, a[:, :, 1] / 255.0, a[:, :, 2] / 255.0
    mx = np.max(a, axis=2) / 255.0
    mn = np.min(a, axis=2) / 255.0
    d = mx - mn
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0.0) * 255.0
    return s

def mask_from(path, thr=20.0, mode="sat"):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float64)
    s = hsv(a)
    seed = s > thr
    lab, n = ndi.label(seed, structure=np.ones((3, 3), bool))
    if n == 0:
        raise SystemExit("empty mask in " + path)
    sizes = ndi.sum(seed, lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    m = ndi.binary_fill_holes(lab == k)
    return m, a

def boxstd(L, k=7):
    r = k // 2
    p = np.pad(L, r, mode="edge")
    m = np.zeros_like(L); m2 = np.zeros_like(L)
    for dy in range(k):
        for dx in range(k):
            v = p[dy:dy + L.shape[0], dx:dx + L.shape[1]]
            m += v; m2 += v * v
    n = float(k * k)
    var = np.maximum(m2 / n - (m / n) ** 2, 0.0)
    return np.sqrt(var)

def measure(run, cat, img):
    dmask_path = f"{run}/{cat}/dark.png"
    m, _ = mask_from(dmask_path)
    a = np.asarray(Image.open(f"{run}/{cat}/{img}.png").convert("RGB")).astype(np.float64)
    L = lum(a); S = hsv(a); SD = boxstd(L)
    ys, xs = np.where(m)
    y0, y1 = ys.min(), ys.max() + 1
    h = y1 - y0
    tot = max(len(ys), 1)
    out = {"run": run, "cat": cat, "img": img, "bbox": [int(y0), int(y1), int(xs.min()), int(xs.max())], "bands": {}}
    for name, f0, f1 in BANDS:
        b0 = int(y0 + f0 * h); b1 = int(y0 + f1 * h)
        band = np.zeros_like(m); band[max(b0, 0):min(b1, m.shape[0]), :] = True
        sel = band & m
        n = int(sel.sum())
        if n == 0:
            out["bands"][name] = None; continue
        out["bands"][name] = {
            "pct_stone": round(100.0 * n / tot, 2),
            "L50": round(float(np.percentile(L[sel], 50)), 1),
            "L5": round(float(np.percentile(L[sel], 5)), 1),
            "L95": round(float(np.percentile(L[sel], 95)), 1),
            "sat": round(float(np.percentile(S[sel], 50)), 1),
            "std7": round(float(np.percentile(SD[sel], 50)), 2),
        }
    LI = L[m]
    out["global"] = {"L5": round(float(np.percentile(LI, 5)), 1), "L95": round(float(np.percentile(LI, 95)), 1),
                     "clip_frac": round(float(((LI >= 254.5) | (LI <= 0.5)).mean()), 4)}
    # empty-pale fraction: L>185 & std<6
    out["pale_empty_frac"] = round(float((L[m] > 185).mean() and 0.0), 4)
    pe = (L > 185) & (SD < 6) & m
    out["pale_empty_frac"] = round(float(pe.sum()) / tot, 4)
    # G5 gap
    ct = out["bands"]["crown_top"]["L50"]; lp = out["bands"]["lower_pav"]["L50"]; up = out["bands"]["upper_pav"]["L50"]
    out["gap_G5"] = round(abs(0.5 * (ct + lp) - up), 1)
    return out

if __name__ == "__main__":
    run = sys.argv[1]
    cat = sys.argv[sys.argv.index("--cat") + 1] if "--cat" in sys.argv else "sapphire"
    img = sys.argv[sys.argv.index("--img") + 1] if "--img" in sys.argv else "front"
    r = measure(run, cat, img)
    for name, b in r["bands"].items():
        print(f"{name:12s} {b['pct_stone']:5.1f}%  L50 {b['L50']:5.1f} [{b['L5']:.0f}-{b['L95']:.0f}]  sat {b['sat']:5.1f}  std7 {b['std7']:5.2f}")
    print("global", r["global"], "paleEmpty", r["pale_empty_frac"], "G5gap", r["gap_G5"])
