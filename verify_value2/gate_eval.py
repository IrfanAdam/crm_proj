#!/usr/bin/env python3
"""gate_eval.py — evaluate the round gates on a sweep JSON.

Gates (from the brief):
  G1 pale-lowinfo <= 0.12            per pose
  G2 every band std7 med >= 3.0      per pose
  G3 neon == 0                       per pose
  G4 clip <= 0.02                    per pose
  G5 no band collapses bright: every band L p50 <= 130
  G6 score totals reproduce + >= >=66 sap / >=62 cit   (supplied externally)
  G7 (a) pearson r(sat,L) <= -0.5
  G8 (b) achro-bright frac (S<60 & L>150) <= 0.05
  G9 (c) interior mean sat >= 110
  G10 (d) TIR vs non-TIR medians (reported, no pass/fail)

usage: python3 verify_value2/gate_eval.py <sweep.json> [--totals "sap=64,cit=64"]
"""
import argparse
import json
import sys

BANDS = ["crown_top", "crown_lower", "girdle", "upper_pavilion", "mid_pavilion", "culet"]


def eval_pose(e):
    g = e["globals"]
    b = e["bands"]
    std_fail = [k for k in BANDS if b[k]["std7_med"] < 3.0]
    bright_fail = [k for k in BANDS if b[k]["L_p50"] > 130.0]
    return {
        "pose": e["pose"],
        "pale": g["pale_lowinfo_frac"], "pale_ok": g["pale_lowinfo_frac"] <= 0.12,
        "std_min": min(b[k]["std7_med"] for k in BANDS), "std_fail_bands": std_fail,
        "std_ok": not std_fail,
        "neon": g["neon_px"], "neon_ok": g["neon_px"] == 0,
        "clip": g["clip_frac"], "clip_ok": g["clip_frac"] <= 0.02,
        "bright_fail_bands": bright_fail, "bright_ok": not bright_fail,
        "r": g["sat_L_pearson_r"], "r_ok": g["sat_L_pearson_r"] <= -0.5,
        "achro": g["achro_bright_frac"], "achro_ok": g["achro_bright_frac"] <= 0.05,
        "isat": g["interior_sat_mean"], "isat_ok": g["interior_sat_mean"] >= 110.0,
        "L_p05": g["L_p05"], "L_p95": g["L_p95"], "L_p50": g["L_p50"],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sweep")
    ap.add_argument("--totals", default="")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    data = json.load(open(a.sweep))

    totals = {}
    for kv in [x for x in a.totals.split(",") if x]:
        k, v = kv.split("=")
        totals[k.strip()] = int(v)

    summary = {}
    for cat, entries in data.items():
        rows = [eval_pose(e) for e in entries if "globals" in e]
        summary[cat] = rows
        print(f"== {cat} ==")
        print("pose        pale  G1 | stdmin G2 fails            | neon G3 | clip   G4 | brightL50>130 G5 | r(s,L) G7 | achro  G8 | isat G9")
        for r in rows:
            print("%-10s %.3f %s | %5.2f %s %-22s | %3d %s | %.4f %s | %-30s %s | %6.3f %s | %.3f %s | %5.1f %s" % (
                r["pose"], r["pale"], "P" if r["pale_ok"] else "F",
                r["std_min"], "P" if r["std_ok"] else "F", ",".join(x[:9] for x in r["std_fail_bands"]) or "-",
                r["neon"], "P" if r["neon_ok"] else "F",
                r["clip"], "P" if r["clip_ok"] else "F",
                ",".join(x[:9] for x in r["bright_fail_bands"]) or "-", "P" if r["bright_ok"] else "F",
                r["r"], "P" if r["r_ok"] else "F",
                r["achro"], "P" if r["achro_ok"] else "F",
                r["isat"], "P" if r["isat_ok"] else "F"))
        keys = ["pale_ok", "std_ok", "neon_ok", "clip_ok", "bright_ok", "r_ok", "achro_ok", "isat_ok"]
        print("poses passing:", {k: sum(1 for r in rows if r[k]) for k in keys}, "of", len(rows))
        if cat in totals:
            need = 66 if cat == "sapphire" else 62
            print(f"score {totals[cat]}/110 (need >= {need}) ->", "PASS" if totals[cat] >= need else "FAIL")

    out = {"summary": summary, "totals": totals}
    if a.out:
        json.dump(out, open(a.out, "w"), indent=2)
        open(a.out, "a").write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
