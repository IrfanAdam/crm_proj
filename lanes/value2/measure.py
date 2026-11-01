#!/usr/bin/env python3
"""value2/measure.py — frozen band meter + the round's colour gates.

mask   : <cat>/dark[_aN].png  saturation > 20 -> largest 8-CC -> fill holes (frozen scheme)
front  : <cat>/front[_aN].png measured through that mask
bands  : fractions of mask bbox height (crown_top .00-.22, crown_lower .22-.38, girdle .38-.46,
         upper_pav .46-.68, lower_pav .68-.86, culet .86-1.0)
tir    : <cat>/tirmask[_aN].png (debug: R = first-bounce TIR, G = second-bounce TIR), body hidden

usage: python3 lanes/value2/measure.py <lane-or-run-dir> --cat sapphire --angles 0,35,70 [--json out]
"""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

BANDS = [("crown_top", 0.00, 0.22), ("crown_lower", 0.22, 0.38), ("girdle", 0.38, 0.46),
         ("upper_pav", 0.46, 0.68), ("lower_pav", 0.68, 0.86), ("culet", 0.86, 1.00)]


def lum(a):
    return 0.2126 * a[:, :, 0] + 0.7152 * a[:, :, 1] + 0.0722 * a[:, :, 2]


def sat(a):
    mx = np.max(a, axis=2); mn = np.min(a, axis=2)
    return np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0.0) * 255.0


def mask_from(path, thr=20.0):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float64)
    seed = sat(a) > thr
    lab, n = ndi.label(seed, structure=np.ones((3, 3), bool))
    if n == 0:
        raise SystemExit("empty mask in " + path)
    sizes = ndi.sum(seed, lab, range(1, n + 1))
    m = ndi.binary_fill_holes(lab == int(np.argmax(sizes)) + 1)
    return m


def boxstd(L, k=7):
    r = k // 2
    p = np.pad(L, r, mode="edge")
    m = np.zeros_like(L); m2 = np.zeros_like(L)
    for dy in range(k):
        for dx in range(k):
            v = p[dy:dy + L.shape[0], dx:dx + L.shape[1]]
            m += v; m2 += v * v
    n = float(k * k)
    return np.sqrt(np.maximum(m2 / n - (m / n) ** 2, 0.0))


def neon(a, m):
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mag = (r > 120) & (b > 120) & (r > g + 50) & (b > g + 50)
    grn = (g > 140) & (g > r + 60) & (g > b + 40)
    return int(((mag | grn) & m).sum())


def measure(run, cat, ang, tilt=0.0):
    suff = ("_a%d" % ang if ang else "") + (("_t%s" % ("%g" % tilt)) if tilt else "")
    m = mask_from("%s/%s/dark%s.png" % (run, cat, suff))
    a = np.asarray(Image.open("%s/%s/front%s.png" % (run, cat, suff)).convert("RGB")).astype(np.float64)
    L = lum(a); S = sat(a); SD = boxstd(L)
    er = ndi.binary_erosion(m, np.ones((5, 5), bool))
    ys, xs = np.where(m)
    y0, y1, hh = ys.min(), ys.max() + 1, ys.max() - ys.min() + 1
    tot = max(len(ys), 1)
    out = {"cat": cat, "angle": ang, "img": "front%s" % suff, "bbox": [int(y0), int(y1), int(xs.min()), int(xs.max())], "bands": {}}
    for name, f0, f1 in BANDS:
        b0 = int(y0 + f0 * hh); b1 = int(y0 + f1 * hh)
        band = np.zeros_like(m); band[max(b0, 0):min(b1, m.shape[0]), :] = True
        sel = band & m
        n = int(sel.sum())
        if n == 0:
            out["bands"][name] = None; continue
        out["bands"][name] = {"pct_stone": round(100.0 * n / tot, 2),
                              "L50": round(float(np.percentile(L[sel], 50)), 1),
                              "L5": round(float(np.percentile(L[sel], 5)), 1),
                              "L95": round(float(np.percentile(L[sel], 95)), 1),
                              "sat": round(float(np.percentile(S[sel], 50)), 1),
                              "std7": round(float(np.percentile(SD[sel], 50)), 2)}
    LI = L[m]
    St = S[m]
    out["stone"] = {"L50": round(float(np.percentile(LI, 50)), 1), "sat50": round(float(np.percentile(St, 50)), 1),
                    "std7_p50": round(float(np.percentile(SD[m], 50)), 2)}
    out["global"] = {"L5": round(float(np.percentile(LI, 5)), 1), "L95": round(float(np.percentile(LI, 95)), 1),
                     "clip_frac": round(float(((LI >= 254.5) | (LI <= 0.5)).mean()), 4),
                     "neon_px": neon(a, m)}
    out["pale_lowinfo"] = round(float(((L > 185) & (SD < 6) & m).sum()) / tot, 4)
    out["dark_flat"] = round(float(((L >= 40) & (L <= 80) & (SD < 6) & m).sum()) / tot, 4)
    Li, Si = L[er], S[er]
    out["interior"] = {"mean_sat": round(float(Si.mean()), 1), "mean_L": round(float(Li.mean()), 1),
                       "sat_L_r": round(float(np.corrcoef(Si, Li)[0, 1]), 3),
                       "achrom_bright": round(float(((Si < 60) & (Li > 150)).sum()) / max(int(er.sum()), 1), 4)}
    # TIR split from the debug mask (body hidden, same pose)
    try:
        t = np.asarray(Image.open("%s/%s/tirmask%s.png" % (run, cat, suff)).convert("RGB")).astype(np.float64)
        er3 = ndi.binary_erosion(m, np.ones((9, 9), bool))
        b1 = t[:, :, 0] > 128                        # R = first-bounce TIR
        b2 = t[:, :, 1] > 128                        # G = second-bounce TIR
        anyt = (b1 | b2)
        out["tir"] = {
            "frac_tir1": round(float((b1 & m).sum()) / max(m.sum(), 1), 3),
            "frac_tir2": round(float((b2 & m).sum()) / max(m.sum(), 1), 3),
            "frac_any": round(float((anyt & m).sum()) / max(m.sum(), 1), 3),
            "L_tir": round(float(np.percentile(L[er3 & anyt], 50)), 1) if (er3 & anyt).sum() else None,
            "sat_tir": round(float(np.percentile(S[er3 & anyt], 50)), 1) if (er3 & anyt).sum() else None,
            "L_non": round(float(np.percentile(L[er3 & ~anyt], 50)), 1),
            "sat_non": round(float(np.percentile(S[er3 & ~anyt], 50)), 1),
        }
    except FileNotFoundError:
        out["tir"] = "SKIPPED (no tirmask)"
    return out


def verdict(r):
    b = r["bands"]; g = r["global"]; i = r["interior"]
    v = {}
    v["pale<=12%"] = r["pale_lowinfo"] <= 0.12
    v["std7>=3"] = all(x is not None and x["std7"] >= 3.0 for x in b.values())
    v["neon0"] = g["neon_px"] == 0
    v["clip<=0.02"] = g["clip_frac"] <= 0.02
    v["darkL50<=130"] = all(b[k]["L50"] <= 130 for k in ("lower_pav", "culet"))
    v["sat_L_r<=-0.5"] = i["sat_L_r"] <= -0.5
    v["achrom_bright<=5%"] = i["achrom_bright"] <= 0.05
    v["mean_sat>=110"] = i["mean_sat"] >= 110
    t = r.get("tir")
    if isinstance(t, dict):
        v["tir_darker"] = t["L_tir"] is not None and t["L_tir"] < t["L_non"]
        v["tir_more_sat"] = t["sat_tir"] is not None and t["sat_tir"] > t["sat_non"]
    else:
        v["tir_darker"] = "SKIPPED"; v["tir_more_sat"] = "SKIPPED"
    return v


if __name__ == "__main__":
    run = sys.argv[1]
    cat = sys.argv[sys.argv.index("--cat") + 1] if "--cat" in sys.argv else "sapphire"
    angs = [int(x) for x in (sys.argv[sys.argv.index("--angles") + 1].split(",") if "--angles" in sys.argv else ["0"])]
    tl = [float(x) for x in (sys.argv[sys.argv.index("--tilts") + 1].split(",") if "--tilts" in sys.argv else ["0"])]
    allr = []
    for ang, tilt in [(a, tt) for a in angs for tt in tl]:
        r = measure(run, cat, ang, tilt)
        r["gates"] = verdict(r)
        allr.append(r)
        print("== %s  angle %d  tilt %g  (%s)" % (cat, ang, tilt, r["img"]))
        for name, bb in r["bands"].items():
            if bb:
                print("  %-12s %5.1f%%  L50 %5.1f [%3.0f-%3.0f]  sat %5.1f  std7 %5.2f" % (name, bb["pct_stone"], bb["L50"], bb["L5"], bb["L95"], bb["sat"], bb["std7"]))
        print("  stone", r.get("stone"), "| global", r["global"], "pale", r["pale_lowinfo"], "darkflat", r["dark_flat"])
        print("  interior", r["interior"])
        print("  tir", r["tir"])
        print("  gates", {k: (v if isinstance(v, str) else ("PASS" if v else "fail")) for k, v in r["gates"].items()})
    if "--json" in sys.argv:
        p = sys.argv[sys.argv.index("--json") + 1]
        json.dump(allr, open(p, "w"), indent=1)
