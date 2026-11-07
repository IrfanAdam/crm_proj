#!/usr/bin/env python3
"""caustic_probe.py — independent E2 (caustics) detector for the gem rig.

    /Users/irfan/.hermes/hermes-agent/venv/bin/python3 prototype/gems/caustic_probe.py \
        CAPTUREDIR [--out report.json] [--compare OTHERDIR]
    /Users/irfan/.hermes/hermes-agent/venv/bin/python3 prototype/gems/caustic_probe.py --selftest

CAPTUREDIR is one capture (a directory holding clip-0.png and/or full.png) or a parent
directory holding several such captures — every sub-directory with a PNG is scored.
--compare proves a second capture is byte-identical (md5, else mean|Δ| and frac>8).
--selftest builds synthetic captures in memory and checks the detector's own verdicts.

What it measures (E2, round 15 "The seven evals"):
  (a) connected components of the pool at HALF ITS PEAK — gate: exactly 1 (one continuous glow)
  (b) pool peak / floor baseline ratio                              — gate >= 4
  (c) fringe Delta|R-B| across the pool's streak edges (grey levels) — gate >= 6
  (d) pool centroid vs stone centroid offset, in stone radii        — gate <= 0.15
  (e) rebuild time, read from a sidecar JSON when one is present    — reported only

POPULATIONS — every one of these is a choice, stated so a lane can reproduce it:

 P1  stone mask. sat = (max-min)/max*255 > 55 (the convention already used by
     optics_sweep.py: the studio stage is neutral so the stone owns the saturated
     pixels). Largest 8-connected component, holes filled. This excludes the card's
     blue-tinted shadow and any UI chip.
 P2  stone centroid = mean row/col of P1. Stone radius R = sqrt(area/pi) — the
     equivalent-disc radius, so "stone radii" is a property of the stone's own area,
     not of its bounding box (a tilted stone keeps one scale).
 P3  floor band. Rows: from the culet (lowest row of P1) + 1 down to the row where the
     stage's own row-median profile steps by more than `panel_step` levels — that is
     the panel's bottom edge, and below it is page background, not floor; capped at
     `band_reach_r` * R. Columns: stone centroid +- `band_half_width_r` * R.
     The band is therefore "the floor under the stone, inside the stage".
 P4  floor field. The stage is NOT a flat grey: it is a soft ramp (~226-241 levels on
     the light scheme, with a vignette at the panel edge), so raw half-max on luminance
     would call the whole panel "pool" and raw peak/baseline could never exceed ~1.1.
     The field F is built ROW BY ROW inside the band: for each row, a degree
     `field_deg` polynomial in x is fitted to that row's floor pixels and evaluated
     across the full row — i.e. the floor is inpainted under the pool from both sides
     at the same rows, which is what "the floor would have been without the caustic"
     means. Two passes: pass 1 fits every band pixel, pass 2 re-fits with the first
     pass's pool (dilated) excluded, with a `field_clip`-sigma rejection per row.
     The POOL SIGNAL is S = L - F. Half-max, peak, edge and centroid all use S.
     A row with too few usable samples to fit falls back to the pass-0 fit rather than
     extrapolating. This is a normalisation of the measurement, not of the gate:
     (b) is still evaluated as luminance peak / luminance baseline, exactly as the
     plan states, and the un-normalised pair is printed next to it.
 P5  baseline. Band pixels at horizontal distance > `baseline_min_dist_r` * R from the
     stone centroid, minus the pool dilated by 2 px. Median of L there = the floor's
     luminance "far from the pool" but still under the same lighting ramp.
 P6  streak edge. Pool pixels whose |grad S| is at or above the `edge_grad_pct`
     percentile of the pool's own |grad S|. Fringe = median |R-B| over the edge minus
     median |R-B| over the P5 baseline pixels. (Edge minus floor, i.e. the *Delta* the
     eval names; a pool that merely sits on a tinted floor scores 0.)
 P7  centroid offset. GATED quantity is the LATERAL component |pool_x - stone_x| / R.
     The pool is light landing on a floor plane that is screen-below the stone, so the
     vertical term is the light direction (that is the shadow-azimuth eval's job, gated
     separately at 53.13 deg) and it is ~0.7 R for any build, including a perfect one.
     The full 2D distance is printed as offset_2d_r and it is NOT the gate; if you
     disagree with this population, that number is right here to overrule it.
 P8  sidecar. Any *.json in the capture directory (then its parent) whose keys name a
     rebuild time (`json_keys` below) — reported, never gated.

Every gate number lives in DEFAULTS below; nothing numeric about a gate is inline.
"""
from __future__ import annotations

import argparse
import glob
import hashlib
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

DEFAULTS = {
    # gate thresholds — the plan's numbers, verbatim
    "peak_baseline_min": 4.0,     # (b) pool peak / floor baseline
    "components_max": 1,          # (a) half-max connected components
    "fringe_min": 6.0,            # (c) Delta|R-B| across streak edges, grey levels
    "centroid_max_r": 0.15,       # (d) lateral centroid offset, stone radii
    # detector populations — see P1..P8 in the docstring
    "mask_sat": 55.0,             # P1
    "band_reach_r": 1.6,          # P3 row cap below the culet
    "band_half_width_r": 1.8,     # P3 column half-width
    "panel_step": 6.0,            # P3 stage bottom-edge step, grey levels
    "band_min_rows": 12,          # P3 fallback trigger
    "field_deg": 2,               # P4 polynomial degree (per row, in x)
    "field_clip": 2.5,            # P4 per-row sigma-clip width
    "field_outer_r": 1.0,         # P4 floor sampled at |dx| >= this * R (outside the pool)
    "half_max": 0.5,              # (a) half of the pool signal's peak
    "min_cc_px": 12,              # (a) components smaller than this are noise
    "baseline_min_dist_r": 1.1,   # P5
    "edge_grad_pct": 85.0,        # P6
    "min_stone_px": 500,          # a capture with less stone than this is not a stone
    "min_pool_px": 30,            # below this the pool is absent, not small
    "min_pool_signal": 4.0,       # grey levels over the inpainted floor: the instrument's
                                  # detection floor. A capture with no pool still leaves a
                                  # ~1-2 level residual from the floor model; below 4 the
                                  # probe reports NO MEASURE rather than inventing a pool.
                                  # It can only reject, never rescue a failing gate.
    "json_keys": ["lastMs", "rebuild_ms", "rebuildMs", "caustic_ms", "trace_ms"],
}

W = np.array([0.2126, 0.7152, 0.0722])
FILES = ("clip-0.png", "full.png")


# ------------------------------------------------------------------ image maths
def load(path):
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.float64)


def luminance(a):
    return a @ W


def saturation(a):
    mx, mn = a.max(axis=2), a.min(axis=2)
    return np.where(mx > 1.0, (mx - mn) / np.maximum(mx, 1.0) * 255.0, 0.0)


def stone_mask(a, n):
    """P1: saturated largest blob, holes filled."""
    m = saturation(a) > n["mask_sat"]
    if m.sum() < n["min_stone_px"]:
        return None
    lab, cnt = ndi.label(m, np.ones((3, 3)))
    sizes = ndi.sum(m, lab, range(1, cnt + 1))
    m = ndi.binary_fill_holes(lab == (int(np.argmax(sizes)) + 1))
    return m if m.sum() >= n["min_stone_px"] else None


def floor_band(L, mask, n):
    """P3: rows culet+1 .. stage bottom edge, columns centred on the stone."""
    ys, xs = np.nonzero(mask)
    cy, cx = float(ys.mean()), float(xs.mean())
    R = float(np.sqrt(mask.sum() / np.pi))
    culet = int(ys.max())
    h, w = L.shape
    half = int(round(n["band_half_width_r"] * R))
    x0, x1 = max(0, int(cx) - half), min(w, int(cx) + half + 1)
    if x1 - x0 < 8:
        return None
    # p10, not median: the pool is the bright part of the row, so a median can jump by
    # more than the step when the pool covers half a row (measured on a dark-stage synth)
    row_med = np.percentile(L[:, x0:x1], 10, axis=1)
    cap = min(h, culet + 1 + int(round(n["band_reach_r"] * R)))
    bottom = cap
    for y in range(culet + 2, cap):
        if abs(row_med[y] - row_med[y - 1]) > n["panel_step"]:
            bottom = y
            break
    if bottom - (culet + 1) < n["band_min_rows"]:            # P3 fallback
        bottom = min(h, culet + 1 + max(n["band_min_rows"], int(0.5 * R)))
    band = np.zeros_like(mask)
    band[culet + 1:bottom, x0:x1] = True
    band &= ~mask
    if band.sum() < 200:
        return None
    return {"mask": band, "cy": cy, "cx": cx, "R": R, "culet": culet,
            "rows": (culet + 1, bottom), "cols": (x0, x1)}


def floor_field(L, band, n):
    """P4: per-row inpainting of the stage's own ramp, from the floor OUTSIDE the pool."""
    ys, xs = np.nonzero(band["mask"])
    x0, x1 = float(xs.min()), float(xs.max())
    xn_all = (xs - x0) / max(x1 - x0, 1.0) * 2 - 1
    deg = int(n["field_deg"])
    outer = n["field_outer_r"] * band["R"]
    far = np.abs(xs - band["cx"]) >= outer          # floor sampling window: outside the pool
    F = np.zeros_like(L)
    order = np.argsort(ys, kind="stable")
    ys_s, xs_s, xn_s, far_s = ys[order], xs[order], xn_all[order], far[order]
    rows = np.unique(ys_s)
    lo = int(rows.min())
    start = np.searchsorted(ys_s, np.arange(lo, int(rows.max()) + 2))
    for y in rows:
        i, j = start[y - lo], start[y - lo + 1]
        if j - i < 8:
            continue
        cx_, xn_ = xs_s[i:j], xn_s[i:j]
        vals = L[y, cx_]
        ok = far_s[i:j]
        if ok.sum() < (deg + 1) * 3:                 # band too narrow: use the whole row
            ok = np.ones(vals.shape, bool)
        coef = np.polyfit(xn_[ok], vals[ok], deg)
        res = vals - np.polyval(coef, xn_)
        sd = res[ok].std() or 1.0
        ok2 = ok & (np.abs(res) <= n["field_clip"] * sd)
        if (deg + 1) * 3 <= ok2.sum() < ok.sum():
            coef = np.polyfit(xn_[ok2], vals[ok2], deg)
        F[y, cx_] = np.polyval(coef, xn_)
    return F


def components(pool, n):
    lab, cnt = ndi.label(pool, np.ones((3, 3)))
    if cnt == 0:
        return 0, []
    sizes = ndi.sum(pool, lab, range(1, cnt + 1))
    keep = [float(s) for s in sizes if s >= n["min_cc_px"]]
    return len(keep), sorted(keep, reverse=True)


def gradmag(S):
    gy, gx = np.gradient(S)
    return np.hypot(gx, gy)


def sidecar_metrics(d, keys):
    """P8: any JSON next to the capture (or one level up) naming a rebuild time."""
    found = {}
    for f in sorted(glob.glob(os.path.join(d, "*.json")) +
                    glob.glob(os.path.join(os.path.dirname(os.path.abspath(d)), "*.json"))):
        try:
            blob = json.load(open(f))
        except Exception:
            continue
        stack = [blob]
        vals = []
        while stack:
            cur = stack.pop()
            if isinstance(cur, dict):
                for k, v in cur.items():
                    if k in keys and isinstance(v, (int, float)):
                        vals.append((k, float(v)))
                    elif isinstance(v, (dict, list)):
                        stack.append(v)
            elif isinstance(cur, list):
                stack.extend(cur)
        for k, v in vals:
            found.setdefault(k, []).append(v)
    return {k: {"min": min(v), "max": max(v), "n": len(v)} for k, v in found.items()}


def md5(path):
    return hashlib.md5(open(path, "rb").read()).hexdigest()


# --------------------------------------------------------------------- one shot
def probe(png, n):
    a = load(png)
    L = luminance(a)
    mask = stone_mask(a, n)
    out = {"file": png, "size": list(map(int, a.shape[:2])), "md5": md5(png)}
    if mask is None:
        return dict(out, ok=False, why="no stone mask (sat>%g < %d px)" % (n["mask_sat"], n["min_stone_px"]))
    band = floor_band(L, mask, n)
    if band is None:
        return dict(out, ok=False, why="no floor band under the stone")
    F = floor_field(L, band, n)
    S = np.where(band["mask"], L - F, 0.0)
    peak_s = float(S.max())
    if peak_s <= 0:
        return dict(out, ok=False, why="no positive pool signal")
    if peak_s < n["min_pool_signal"]:
        return dict(out, ok=False,
                    why="pool below the detection floor (peak %.2f < %.1f grey levels over the "
                        "inpainted floor)" % (peak_s, n["min_pool_signal"]))
    pool = band["mask"] & (S >= n["half_max"] * peak_s)
    ncc, sizes = components(pool, n)
    out.update({
        "ok": True,
        "stone_px": int(mask.sum()), "stone_R": round(band["R"], 2),
        "stone_centroid": [round(band["cy"], 2), round(band["cx"], 2)],
        "culet_y": band["culet"], "band_rows": list(band["rows"]), "band_cols": list(band["cols"]),
        "band_px": int(band["mask"].sum()),
        "pool_px": int(pool.sum()), "pool_peak_signal": round(peak_s, 2),
        "components": ncc, "component_sizes": sizes[:6],
    })
    if pool.sum() < n["min_pool_px"]:
        return dict(out, ok=False, why="pool absent (<%d px above half max)" % n["min_pool_px"])

    # (b) peak / baseline — luminance, exactly as the plan words it
    ys, xs = np.nonzero(band["mask"])
    far = np.abs(xs - band["cx"]) > n["baseline_min_dist_r"] * band["R"]
    near_pool = ndi.binary_dilation(pool, np.ones((5, 5)), iterations=1)
    base_sel = band["mask"] & ~near_pool
    base_sel = np.zeros_like(base_sel)
    base_sel[ys[far], xs[far]] = True
    base_sel &= ~near_pool
    if base_sel.sum() < 50:
        base_sel = band["mask"] & ~near_pool
    base_L = float(np.median(L[base_sel]))
    peak_L = float(L[pool].max())
    ratio = peak_L / base_L if base_L > 0 else float("inf")

    # (c) fringe at the streak edges
    g = gradmag(S)
    gp = g[pool]
    thr = np.percentile(gp, n["edge_grad_pct"])
    edge = pool & (g >= thr)
    rb = np.abs(a[:, :, 0] - a[:, :, 2])
    fringe = float(np.median(rb[edge]) - np.median(rb[base_sel]))

    # (d) centroid offset
    wgt = np.where(pool, np.maximum(S, 0.0), 0.0)
    if wgt.sum() > 0:
        yy, xx = np.nonzero(pool)
        py = float((yy * wgt[yy, xx]).sum() / wgt.sum())
        px = float((xx * wgt[yy, xx]).sum() / wgt.sum())
    else:
        yy, xx = np.nonzero(pool)
        py, px = float(yy.mean()), float(xx.mean())
    dx, dy = px - band["cx"], py - band["cy"]
    lat_r = abs(dx) / band["R"]
    out.update({
        "baseline_L": round(base_L, 2), "peak_L": round(peak_L, 2),
        "ratio": round(ratio, 3),
        "ratio_excess": round((base_L + peak_s) / base_L, 3) if base_L else None,
        "pool_signal_mean": round(float(S[pool].mean()), 2),
        "edge_px": int(edge.sum()), "fringe": round(fringe, 2),
        "pool_centroid": [round(py, 2), round(px, 2)],
        "offset_dx": round(dx, 2), "offset_dy": round(dy, 2),
        "offset_lat_r": round(lat_r, 4),
        "offset_2d_r": round(float(np.hypot(dx, dy)) / band["R"], 4),
    })
    out["gates"] = {
        "components<=%g" % n["components_max"]: bool(ncc <= n["components_max"]),
        "peak/baseline>=%g" % n["peak_baseline_min"]: bool(ratio >= n["peak_baseline_min"]),
        "fringe>=%g" % n["fringe_min"]: bool(fringe >= n["fringe_min"]),
        "centroid<=%gr" % n["centroid_max_r"]: bool(lat_r <= n["centroid_max_r"]),
    }
    out["sidecar"] = sidecar_metrics(os.path.dirname(png), n["json_keys"])
    return out


# -------------------------------------------------------------------- selftest
def synth(floor_L, pools, fringe=40.0, stone_r=120):
    """A synthetic capture: page white, a stage panel with a ramp, one stone disc,
    Gaussian pools of added light. `pools` = [(cx, cy, sigma_x, sigma_y, gain), ...]."""
    h, w = 620, 900
    a = np.full((h, w, 3), 255.0)
    panel = np.zeros((h, w), bool)
    panel[40:566, 60:840] = True
    yy, xx = np.mgrid[0:h, 0:w]
    ramp = 229.0 + 10.0 * np.exp(-(((xx - 450) / 420.0) ** 2) - (((yy - 300) / 300.0) ** 2))
    L = np.where(panel, ramp, 255.0)
    L = L + (floor_L - 229.0) * panel
    fringe_map = np.zeros((h, w))
    for cx, cy, sx, sy, gain in pools:
        g = gain * np.exp(-(((xx - cx) / sx) ** 2) - (((yy - cy) / sy) ** 2) * 2.0)
        L = L + g
        fringe_map = np.maximum(fringe_map, g / max(gain, 1.0) * (1.0 - g / max(gain, 1.0)) * 4.0)
    stone = ((xx - 450.0) ** 2 + (yy - 235.0) ** 2) < stone_r ** 2
    L = np.where(stone, 90.0, L)
    a[:, :, 0] = L
    a[:, :, 1] = np.where(stone, 120.0, L - 6.0 * fringe_map)
    a[:, :, 2] = np.where(stone, 200.0, L + fringe * fringe_map)
    return np.clip(a, 0, 255).astype(np.uint8)


def selftest(n):
    """Instrument validity: known inputs must produce known verdicts."""
    import tempfile
    d = tempfile.mkdtemp(prefix="caustic-selftest-")
    cases = [
        ("one pool, light stage", synth(210.0, [(450, 500, 70, 18, 45)]), "cc1"),
        ("two pools, light stage", synth(210.0, [(390, 500, 34, 16, 45), (520, 500, 34, 16, 45)]), "cc2"),
        ("one pool, dark floor", synth(40.0, [(450, 500, 70, 18, 180)]), "dark"),
        ("no pool", synth(229.0, []), "none"),
    ]
    ok = True
    for name, img, expect in cases:
        p = os.path.join(d, name.replace(" ", "-") + ".png")
        Image.fromarray(img).save(p)
        r = probe(p, n)
        got = ("none" if not r["ok"] else "cc%d" % r["components"])
        good = (got == expect) if expect in ("none", "cc1", "cc2") else True
        if expect == "dark":
            good = r["ok"] and r["ratio"] >= n["peak_baseline_min"]
        ok &= bool(good)
        detail = ("—" if not r["ok"] else
                  "cc %d  peak/base %.2f  fringe %+.1f  lat %.3fr"
                  % (r["components"], r["ratio"], r["fringe"], r["offset_lat_r"]))
        print("selftest %-24s expect %-5s got %-5s  %-52s %s"
              % (name, expect, got, detail, "OK" if good else "BROKEN"))
    return 0 if ok else 1


# ------------------------------------------------------------------------ drive
def captures(root):
    if any(os.path.exists(os.path.join(root, f)) for f in FILES):
        return [root]
    dirs = [d for d in sorted(glob.glob(os.path.join(root, "*"))) if os.path.isdir(d)
            and any(os.path.exists(os.path.join(d, f)) for f in FILES)]
    return dirs or [root]


def pick(d):
    for f in FILES:
        p = os.path.join(d, f)
        if os.path.exists(p):
            return p
    return None


def main(argv=None):
    ap = argparse.ArgumentParser(description="E2 caustics detector (independent)")
    ap.add_argument("capture", nargs="?", help="capture dir, or parent dir of several")
    ap.add_argument("--out", help="write the full report as JSON here")
    ap.add_argument("--compare", help="second capture: prove two runs are byte-identical")
    ap.add_argument("--selftest", action="store_true",
                    help="run the synthetic instrument check (no capture needed)")
    a = ap.parse_args(argv)
    n = dict(DEFAULTS)
    if a.selftest:
        return selftest(n)
    if not a.capture:
        ap.error("CAPTUREDIR is required (or --selftest)")

    rows, failed, fatal = [], 0, 0
    for d in captures(a.capture):
        p = pick(d) if os.path.isdir(d) else d
        if not p:
            print("MISSING  %s  (no %s)" % (d, " / ".join(FILES)))
            fatal += 1
            continue
        r = probe(p, n)
        r["capture"] = os.path.basename(os.path.abspath(d))
        rows.append(r)
        if not r["ok"]:
            print("NO MEASURE  %-18s %s" % (r["capture"], r["why"]))
            fatal += 1
            continue
        bad = [k for k, v in r["gates"].items() if not v]
        failed += len(bad)
        print("%-18s cc %d  peak/base %.2f (excess %.2f)  fringe %+.1f  lat %.3fr (2d %.2fr)  %s"
              % (r["capture"], r["components"], r["ratio"], r["ratio_excess"], r["fringe"],
                 r["offset_lat_r"], r["offset_2d_r"], "PASS" if not bad else "FAIL " + ", ".join(bad)))

    print("\n| capture | pool px | components | peak/baseline | fringe Δ\\|R−B\\| | centroid offset | verdict |")
    print("|---|---|---|---|---|---|---|")
    for r in rows:
        if not r["ok"]:
            print("| %s | — | — | — | — | — | NO MEASURE — %s |" % (r["capture"], r["why"]))
            continue
        bad = [k for k, v in r["gates"].items() if not v]
        print("| %s | %d | %d | %.2f | %+.1f | %.3f r | %s |"
              % (r["capture"], r["pool_px"], r["components"], r["ratio"], r["fringe"],
                 r["offset_lat_r"], "PASS" if not bad else "FAIL — " + ", ".join(bad)))

    if a.compare:
        pa = rows[0]["file"] if rows else (pick(a.capture) or a.capture)
        pb = pick(a.compare) if os.path.isdir(a.compare) else a.compare
        det = {"a": pa, "b": pb, "md5_a": md5(pa), "md5_b": md5(pb)}
        det["identical"] = det["md5_a"] == det["md5_b"]
        if not det["identical"]:
            x, y = load(pa), load(pb)
            if x.shape == y.shape:
                d = np.abs(x - y)
                det.update({"mean_abs": round(float(d.mean()), 4),
                            "frac_gt8": round(float((d.max(2) > 8).mean()), 6)})
        print("\ndeterminism  a %s (%s)  b %s (%s)  %s"
              % (os.path.basename(os.path.dirname(pa)), det["md5_a"],
                 os.path.basename(os.path.dirname(pb)), det["md5_b"],
                 "IDENTICAL" if det["identical"] else
                 "DIFFER (mean|Δ| %s)" % det.get("mean_abs")))
        rows_det = det
    else:
        rows_det = None

    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        json.dump({"defaults": n, "rows": rows, "determinism": rows_det},
                  open(a.out, "w"), indent=1)
        print("wrote %s" % a.out)
    return 1 if (failed or fatal) else 0


if __name__ == "__main__":
    sys.exit(main())
