#!/usr/bin/env python3
"""Dark-cap zone detectors (verify_darkcaps lane — own code, read-only vs runs/).

Reads <run-dir>/front.png + <run-dir>/txoff.png and reports:

(a) dark-cap zones: interior pixels with L<90 & local-7x7-std<8, split into
    top/middle/bottom row-thirds of the silhouette bbox. Per zone: darkflat
    fraction, L p5, L std. Plus connected-component count/sizes of the
    dark-flat mask (8-connectivity).
(b) slab frac: dark-flat interior pixels / interior pixels; plus the largest
    single connected dark-flat component as a fraction of interior.
(c) straight segments: Hough-line peak count on |grad L|>=20 edge pixels
    inside the dilated dark-flat region, plus a shuffle null (L values
    permuted inside the silhouette bbox, same pipeline) which must collapse.
(d) neon in-mask: count of mask pixels with S>170 & L>180 (bright saturated
    fringe — must be 0).

Also reports interior L p1 (gate: p1 >= 15).

Conventions match prototype/gems/score.py (never modified):
  L = 0.2126R + 0.7152G + 0.0722B ; S = HSV saturation on 0..255 scale
  mask = txoff.png S>18, largest 8-connected component, holes filled
  interior = mask eroded 2 px
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

EIGHT = np.ones((3, 3), dtype=bool)


def load_rgb(path: str) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.float64)


def luma(rgb: np.ndarray) -> np.ndarray:
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def saturation255(rgb: np.ndarray) -> np.ndarray:
    mx = rgb.max(axis=-1)
    mn = rgb.min(axis=-1)
    return np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6) * 255.0, 0.0)


def hue_deg(rgb: np.ndarray) -> np.ndarray:
    """HSV hue in degrees (same math as score.py)."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(axis=-1)
    mn = rgb.min(axis=-1)
    d = mx - mn
    safe = np.where(d > 1e-6, d, 1.0)
    hr = ((g - b) / safe) % 6.0
    hg = 2.0 + (b - r) / safe
    hb = 4.0 + (r - g) / safe
    h = np.where(mx == r, hr, np.where(mx == g, hg, hb)) * 60.0
    return h % 360.0


# category token hues, same table as score.py (read-only reference values)
TOKEN_HUES = {"sapphire": 208.7, "citrine": 38.9}


def silhouette(txoff_rgb: np.ndarray) -> np.ndarray:
    s = saturation255(txoff_rgb)
    seed = s > 18.0
    lab, n = ndi.label(seed, structure=EIGHT)
    if n == 0:
        raise ValueError("empty silhouette seed (S>18)")
    sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
    biggest = int(np.argmax(sizes)) + 1
    mask = lab == biggest
    return ndi.binary_fill_holes(mask)


def local_std7(L: np.ndarray) -> np.ndarray:
    m = ndi.uniform_filter(L, size=7, mode="nearest")
    m2 = ndi.uniform_filter(L * L, size=7, mode="nearest")
    return np.sqrt(np.maximum(m2 - m * m, 0.0))


def hough_peaks(ys: np.ndarray, xs: np.ndarray, h: int, w: int) -> int:
    """Count straight-line peaks: votes>=max(12, 5% of edges), 5x5 NMS."""
    n = len(xs)
    if n < 12:
        return 0
    thetas = np.deg2rad(np.arange(0, 180, 1.0))
    cos_t, sin_t = np.cos(thetas), np.sin(thetas)
    rmax = float(np.hypot(h, w))
    nbins = int(2 * rmax) + 1
    acc = np.zeros((180, nbins), dtype=np.int32)
    rhos = np.outer(xs, cos_t) + np.outer(ys, sin_t)  # (n, 180)
    idx = np.clip((rhos + rmax).astype(np.int32), 0, nbins - 1)
    t_idx = np.broadcast_to(np.arange(180, dtype=np.int32)[None, :], (n, 180))
    np.add.at(acc, (t_idx.ravel(), idx.ravel()), 1)
    thr = max(12, int(0.05 * n))
    cand = np.argwhere(acc >= thr)
    if len(cand) == 0:
        return 0
    order = np.argsort(-acc[cand[:, 0], cand[:, 1]])
    taken = np.zeros_like(acc, dtype=bool)
    count = 0
    for t, r in cand[order]:
        if taken[t, r]:
            continue
        count += 1
        t0, t1 = max(0, t - 2), min(180, t + 3)
        r0, r1 = max(0, r - 2), min(nbins, r + 3)
        taken[t0:t1, r0:r1] = True
    return count


def edge_pixels(L: np.ndarray, region: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    gy, gx = np.gradient(L)
    emag = np.hypot(gy, gx)
    ys, xs = np.nonzero(region & (emag >= 20.0))
    return ys, xs


def analyze(run_dir: str, color: str = "sapphire") -> dict:
    front = load_rgb(os.path.join(run_dir, "front.png"))
    txoff = load_rgb(os.path.join(run_dir, "txoff.png"))
    L = luma(front)
    S = saturation255(front)
    mask = silhouette(txoff)
    interior = ndi.binary_erosion(mask, structure=EIGHT, iterations=2)
    if interior.sum() == 0:
        raise ValueError("empty interior")

    std7 = local_std7(L)
    darkflat = interior & (L < 90.0) & (std7 < 8.0)

    ys, xs = np.nonzero(mask)
    y0, y1 = int(ys.min()), int(ys.max())
    third = (y1 - y0 + 1) / 3.0
    bands = {
        "top": (y0, y0 + third),
        "mid": (y0 + third, y0 + 2 * third),
        "bot": (y0 + 2 * third, y1 + 1),
    }
    yy, _ = np.nonzero(interior)
    zones = {}
    for name, (lo, hi) in bands.items():
        r = np.arange(L.shape[0])[:, None]
        inband = (r >= lo) & (r < hi)
        zone_px = interior & np.broadcast_to(inband, interior.shape)
        zl = L[zone_px]
        zdf = darkflat[zone_px]
        zones[name] = {
            "n_interior": int(zone_px.sum()),
            "darkflat_frac": float(zdf.mean()) if zone_px.sum() else 0.0,
            "L_p5": float(np.percentile(zl, 5)) if zl.size else None,
            "L_std": float(zl.std()) if zl.size else None,
        }

    n_interior = int(interior.sum())
    n_df = int(darkflat.sum())
    slab_frac = float(n_df / n_interior)
    lab, ncc = ndi.label(darkflat, structure=EIGHT)
    cc_sizes = sorted(
        (int((lab == i).sum()) for i in range(1, ncc + 1)), reverse=True
    )
    slab_maxcc_frac = float(cc_sizes[0] / n_interior) if cc_sizes else 0.0

    dil = ndi.binary_dilation(darkflat, structure=EIGHT, iterations=3)
    ey, ex = edge_pixels(L, dil & interior)
    n_straight = hough_peaks(ey, ex, L.shape[0], L.shape[1])

    rng = np.random.default_rng(7)
    box = np.zeros_like(interior, dtype=bool)
    box[y0 : y1 + 1, int(xs.min()) : int(xs.max()) + 1] = True
    box_interior = box & interior
    Ls = L.copy()
    vals = Ls[box_interior]
    Ls[box_interior] = rng.permutation(vals)
    ny, nx = edge_pixels(Ls, dil & interior)
    null_straight = hough_peaks(ny, nx, L.shape[0], L.shape[1])

    token = TOKEN_HUES.get(color.lower())
    H = hue_deg(front)
    if token is None:
        neon = 0
    else:
        hdist = np.abs((H - token + 180.0) % 360.0 - 180.0)
        neon = int((mask & (S > 120.0) & (hdist > 60.0)).sum())
    p1 = float(np.percentile(L[interior], 1))

    return {
        "interior_px": n_interior,
        "zones": zones,
        "slab_frac": slab_frac,
        "slab_maxcc_frac": slab_maxcc_frac,
        "darkflat_cc_count": int(ncc),
        "darkflat_cc_top5": cc_sizes[:5],
        "straight_segments": int(n_straight),
        "straight_edge_px": int(len(ex)),
        "shuffle_null_segments": int(null_straight),
        "shuffle_null_edge_px": int(len(nx)),
        "neon_inmask": neon,
        "interior_L_p1": p1,
        "interior_L_p5": float(np.percentile(L[interior], 5)),
        "interior_L_std": float(L[interior].std()),
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("run_dir")
    ap.add_argument("--color", default="sapphire")
    ap.add_argument("--out", default=None)
    args = ap.parse_args(argv)
    res = analyze(args.run_dir, args.color)
    res["color"] = args.color.lower()
    res["run_dir"] = os.path.abspath(args.run_dir)
    body = json.dumps(res, indent=2)
    if args.out:
        with open(args.out, "w") as fh:
            fh.write(body + "\n")
    else:
        print(body)
    return 0


if __name__ == "__main__":
    sys.exit(main())
