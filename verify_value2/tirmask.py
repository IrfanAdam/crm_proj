#!/usr/bin/env python3
"""tirmask.py — gate (d): TIR-bounce-ish pixels vs the rest, per cat per pose.

RULE (the lane's own shader debug channel, not a proxy I invented):
  lanes/value2/capture2.mjs `tirmask` role hides the body material (r.mats[0]) and
  sets the proxy material's `u.dbg = 1`, so the shader itself paints only the
  reflected / total-internal-reflection contribution. A pixel is TIR-bounce-ish
  when, inside the frozen dark.png mask, that debug render differs from the empty
  stage (nogem.png, gem group hidden) by |dL| >= 8. All other masked pixels are
  "non-TIR". Median L and median sat of both sets are then measured on the graded
  front.png of the same pose.

usage: python3 verify_value2/tirmask.py <dir> --out <json>
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bands2  # noqa: E402
import poses  # noqa: E402

TIR_DL = 8.0


def L_of(p):
    return bands2.lum(np.asarray(Image.open(p).convert("RGB")).astype(np.float64))


def S_of(p):
    return bands2.sat(np.asarray(Image.open(p).convert("RGB")).astype(np.float64))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--out", required=True)
    ap.add_argument("--cats", default="sapphire,citrine")
    a = ap.parse_args()

    out = {}
    for cat in [c.strip() for c in a.cats.split(",") if c.strip()]:
        recs = []
        for p in poses.tirmasks(a.dir, cat):
            if not (os.path.exists(p["dark"]) and os.path.exists(p["front"])):
                recs.append({"pose": p["pose"], "angle": p["angle"], "tilt": p["tilt"],
                             "status": "MISSING front/dark pair"})
                continue
            nogem = os.path.join(p["dir"], "nogem.png")
            if not os.path.exists(nogem):
                recs.append({"pose": p["pose"], "angle": p["angle"], "tilt": p["tilt"],
                             "status": "MISSING nogem.png"})
                continue
            mask, _, _ = bands2.mask_from_dark(p["dark"])
            d = L_of(p["tir"]) - L_of(nogem)
            Lf = L_of(p["front"])
            Sf = S_of(p["front"])
            tir = mask & (np.abs(d) >= TIR_DL)
            non = mask & ~tir
            rec = {
                "pose": p["pose"], "angle": p["angle"], "tilt": p["tilt"],
                "rule": f"u.dbg=1 tirmask vs nogem, |dL|>={TIR_DL}, inside dark.png mask",
                "mask_px": int(mask.sum()),
                "tir_px": int(tir.sum()),
                "tir_frac": float(tir.sum() / max(int(mask.sum()), 1)),
                "tir_brighter_px": int((mask & (d >= TIR_DL)).sum()),
                "tir_darker_px": int((mask & (d <= -TIR_DL)).sum()),
                "dL_med_tir": float(np.median(d[tir])) if tir.any() else None,
            }
            if tir.any():
                rec["tir_L_med"] = float(np.median(Lf[tir]))
                rec["tir_S_med"] = float(np.median(Sf[tir]))
            if non.any():
                rec["nontir_L_med"] = float(np.median(Lf[non]))
                rec["nontir_S_med"] = float(np.median(Sf[non]))
            if "tir_L_med" in rec and "nontir_L_med" in rec:
                rec["dL_tir_minus_nontir"] = rec["tir_L_med"] - rec["nontir_L_med"]
                rec["dS_tir_minus_nontir"] = rec["tir_S_med"] - rec["nontir_S_med"]
            recs.append(rec)
        out[cat] = recs

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w") as fh:
        json.dump(out, fh, indent=2)
        fh.write("\n")

    for cat, recs in out.items():
        print(f"== {cat} ==")
        for r in recs:
            if "tir_px" not in r:
                print(r.get("pose"), r.get("status"))
                continue
            print("%-9s tir %5.3f (%4d px) | TIR L %6.1f S %6.1f | non-TIR L %6.1f S %6.1f | dL %+6.1f dS %+6.1f" % (
                r["pose"], r["tir_frac"], r["tir_px"], r.get("tir_L_med", float("nan")),
                r.get("tir_S_med", float("nan")), r.get("nontir_L_med", float("nan")),
                r.get("nontir_S_med", float("nan")), r.get("dL_tir_minus_nontir", float("nan")),
                r.get("dS_tir_minus_nontir", float("nan"))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
