#!/usr/bin/env python3
"""verify_value3/gates.py — PASS/FAIL evaluation of the round-6 value3 gates.

Gates (fixed by the brief):
    pale-lowinfo <= 12 %          stone px with L > 185 and 7x7 std < 6
    clip          <= 2 %          stone px with L >= 250
    achro-bright  <= 5 %          stone px with sat < 60 and L > 150
    L95            in 200..245    stone L p95
    band std      >= 5.0          population std of the 6 band L p50s
                                  (facet band separation; per-band 7x7 std
                                  medians reported alongside as INFO)
    neon            == 0 px       in-mask magenta / green
    dark bands      L p50 <= 130  all 6 bands, dark-scheme cells only
    totals          reproduce the lane's claim exactly and stay >= 66 / 62

Scope: gates are scored on STONE cells (front*, dark*, i.e. the shipped view).
txoff / dispoff / chart / nogem are instruments/controls — measured, listed as
INFO, not gated.

usage: python3 verify_value3/gates.py <dets.json> [--totals t.json] [--json out.json]
"""
import argparse
import json

BANDS = ["crown_top", "crown_lower", "girdle", "upper_pavilion", "mid_pavilion", "culet"]


def is_gated(name):
    base = name[:-4] if name.endswith(".png") else name
    return base.startswith("front") or base.startswith("dark")


def is_dark(name):
    return name.startswith("dark")


def gate_row(m, dark):
    row = {}
    row["pale"] = ("PASS" if m["pale_lowinfo_pct"] <= 12.0 else "FAIL", round(m["pale_lowinfo_pct"], 2), "<=12")
    row["clip"] = ("PASS" if m["clip_pct"] <= 2.0 else "FAIL", round(m["clip_pct"], 2), "<=2")
    row["achro"] = ("PASS" if m["achro_bright_pct"] <= 5.0 else "FAIL", round(m["achro_bright_pct"], 2), "<=5")
    l95 = m["L_p95"]
    row["L95"] = ("PASS" if 200.0 <= l95 <= 245.0 else "FAIL", round(l95, 1), "200..245")
    bs = m["band_std_of_p50"]
    row["band_std"] = ("PASS" if bs is not None and bs >= 5.0 else "FAIL", round(bs, 2) if bs is not None else None, ">=5")
    row["neon"] = ("PASS" if m["neon_pct"] == 0.0 else "FAIL", round(m["neon_pct"], 4), "0")
    bandp = {b: (m["bands"][b]["L_p50"] if m["bands"][b]["L_p50"] is not None else None) for b in BANDS}
    if dark:
        over = [b for b, v in bandp.items() if v is not None and v > 130.0]
        row["dark_bands"] = ("PASS" if not over else "FAIL",
                             {b: (round(v, 1) if v is not None else None) for b, v in bandp.items()},
                             "all p50<=130")
        row["dark_bands_over"] = over
    else:
        row["dark_bands"] = ("N/A", None, "dark cells only")
        row["dark_bands_over"] = []
    row["_info"] = {
        "L_p50": round(m["L_p50"], 1),
        "sat_med": round(m["sat_med"], 1),
        "std7_med": round(m["std7_med"], 2),
        "band_std7_med_median": round(m["band_std7_med_median"], 2) if m["band_std7_med_median"] is not None else None,
        "band_std7_med_min": round(m["band_std7_med_min"], 2) if m["band_std7_med_min"] is not None else None,
        "mask_px": m["mask_px"],
        "band_p50": {b: (round(v, 1) if v is not None else None) for b, v in bandp.items()},
    }
    return row


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("dets")
    ap.add_argument("--totals", default=None)
    ap.add_argument("--json", default=None)
    args = ap.parse_args(argv)
    with open(args.dets) as fh:
        dets = json.load(fh)
    out = {}
    fails = 0
    gated = 0
    for cat, cells in dets.items():
        out[cat] = {}
        for name, m in sorted(cells.items()):
            if "error" in m:
                out[cat][name] = {"error": m["error"]}
                continue
            gated_flag = is_gated(name)
            row = gate_row(m, is_dark(name) and gated_flag)
            row["gated"] = gated_flag
            out[cat][name] = row
            if not gated_flag:
                continue
            gated += 1
            bad = [k for k in ("pale", "clip", "achro", "L95", "band_std", "neon", "dark_bands")
                   if row[k][0] == "FAIL"]
            if bad:
                fails += 1
            print(f"{cat:9s} {name:22s} {'FAIL' if bad else 'PASS'} {bad if bad else ''}")
    if args.totals:
        with open(args.totals) as fh:
            out["_totals"] = json.load(fh)
    print(f"gated cells: {gated}  failing: {fails}")
    out["_summary"] = {"gated_cells": gated, "failing_cells": fails}
    body = json.dumps(out, indent=2)
    if args.json:
        with open(args.json, "w") as fh:
            fh.write(body + "\n")
        print(f"wrote {args.json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
