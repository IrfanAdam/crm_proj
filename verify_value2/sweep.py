#!/usr/bin/env python3
"""sweep.py — run bands2.measure over every captured pose of a lane dir.

usage: python3 verify_value2/sweep.py <dir> --out <json> [--cats sapphire,citrine]
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bands2  # noqa: E402
import poses  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--out", required=True)
    ap.add_argument("--cats", default="sapphire,citrine")
    a = ap.parse_args()

    out = {}
    for cat in [c.strip() for c in a.cats.split(",") if c.strip()]:
        entries = []
        for p in poses.poses(a.dir, cat):
            if not os.path.exists(p["dark"]):
                entries.append({"pose": p["pose"], "angle": p["angle"], "tilt": p["tilt"],
                                "status": "MISSING MASK " + os.path.basename(p["dark"])})
                continue
            rec = bands2.measure(cat, p["dark"], p["front"], run_dir=p["dir"],
                                 img_role=os.path.basename(p["front"])[:-4])
            rec.update({"pose": p["pose"], "angle": p["angle"], "tilt": p["tilt"]})
            entries.append(rec)
        out[cat] = entries

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w") as fh:
        json.dump(out, fh, indent=2)
        fh.write("\n")

    for cat, entries in out.items():
        print(f"== {cat} ==")
        print("pose       pale  r(s,L) achro  isat   clip    L5    L95 neon  stdmin bandL50 min..max")
        for e in entries:
            if "globals" not in e:
                print(f"{e.get('pose','?'):<10} {e.get('status')}")
                continue
            g = e["globals"]
            b = e["bands"]
            stdmin = min(v["std7_med"] for v in b.values() if "std7_med" in v)
            l50s = [v["L_p50"] for v in b.values() if "L_p50" in v]
            print("%-10s %.3f  %6.3f %.3f %5.1f %.4f %5.1f %6.1f %4d %6.2f   %.1f..%.1f" % (
                e["pose"], g["pale_lowinfo_frac"], g["sat_L_pearson_r"], g["achro_bright_frac"],
                g["interior_sat_mean"], g["clip_frac"], g["L_p05"], g["L_p95"],
                g["neon_px"], stdmin, min(l50s), max(l50s)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
