#!/usr/bin/env python3
"""value2/report.py — emit the measured tables (bands per spin angle, tilt x spin, gates, TIR split)
for two builds (committed `base`, candidate `cur`) into lanes/value2/tables.md.
usage: python3 lanes/value2/report.py [--cur lanes/value2] [--base lanes/value2/base]
"""
import json, sys, importlib.util

spec = importlib.util.spec_from_file_location("m", "lanes/value2/measure.py")
M = importlib.util.module_from_spec(spec); spec.loader.exec_module(M)

args = sys.argv
cur = args[args.index("--cur") + 1] if "--cur" in args else "lanes/value2"
base = args[args.index("--base") + 1] if "--base" in args else "lanes/value2/base"
CATS = ["sapphire", "citrine"]
ANGS = [0, 35, 70]
TILTS = [-0.55, 0.55]
out = []
w = out.append

w("## A. Band table per spin angle (frozen tilt 0) — committed | this build\n")
for cat in CATS:
    for ang in ANGS:
        try:
            b = M.measure(base, cat, ang); c = M.measure(cur, cat, ang)
        except FileNotFoundError as e:
            w("- %s a%d: NOT CAPTURED (%s)" % (cat, ang, e)); continue
        w("### %s · %d deg\n" % (cat, ang))
        w("| band | %stone | L p50 | sat | 7x7 std || %stone | L p50 | sat | 7x7 std |")
        w("|---|---|---|---|---|---|---|---|---|")
        for k in b["bands"]:
            bb, cc = b["bands"][k], c["bands"][k]
            if not bb or not cc: continue
            w("| %s | %.1f | %.1f | %.1f | %.2f || %.1f | %.1f | %.1f | %.2f |" % (
                k, bb["pct_stone"], bb["L50"], bb["sat"], bb["std7"], cc["pct_stone"], cc["L50"], cc["sat"], cc["std7"]))
        w("| **stone** | | %.1f | %.1f | %.2f || | %.1f | %.1f | %.2f |" % (
            b["stone"]["L50"], b["stone"]["sat50"], b["stone"]["std7_p50"],
            c["stone"]["L50"], c["stone"]["sat50"], c["stone"]["std7_p50"]))
        w("| **pale-lowinfo** | %.1f%% ||| **%.1f%%** ||| |" % (100 * b["pale_lowinfo"], 100 * c["pale_lowinfo"]))
        w("| clip | %.4f ||| %.4f ||| |" % (b["global"]["clip_frac"], c["global"]["clip_frac"]))
        w("| achrom bright | %.1f%% ||| %.1f%% ||| |" % (100 * b["interior"]["achrom_bright"], 100 * c["interior"]["achrom_bright"]))
        w("| mean interior sat | %.1f ||| %.1f ||| |" % (b["interior"]["mean_sat"], c["interior"]["mean_sat"]))
        w("| r(sat,L) | %.3f ||| %.3f ||| |" % (b["interior"]["sat_L_r"], c["interior"]["sat_L_r"]))
        w("")

w("\n## B. Tilt x spin (stone-wide L50 / sat / 7x7 std / pale-lowinfo) — committed → this build\n")
w("| cat | spin | tilt | committed | this build |")
w("|---|---|---|---|---|")
for cat in CATS:
    for ang in ANGS:
        for tilt in [0] + TILTS:
            try:
                b = M.measure(base, cat, ang, tilt); c = M.measure(cur, cat, ang, tilt)
            except FileNotFoundError:
                w("| %s | %d | %g | NOT CAPTURED | NOT CAPTURED |" % (cat, ang, tilt)); continue
            f = lambda r: "L %.1f / sat %.1f / std %.2f / pale %.1f%%" % (
                r["stone"]["L50"], r["stone"]["sat50"], r["stone"]["std7_p50"], 100 * r["pale_lowinfo"])
            w("| %s | %d | %g | %s | %s |" % (cat, ang, tilt, f(b), f(c)))

w("\n## C. Gate matrix (both cats, all spin angles + both tilts)\n")
w("| cell | pale<=12% | band/stone std | neon0 | clip<=0.02 | dark L50<=130 | r(sat,L)<=-0.5 | achrom<=5% | sat>=110 |")
w("|---|---|---|---|---|---|---|---|---|")
for cat in CATS:
    for ang in ANGS:
        for tilt in [0] + TILTS:
            try:
                r = M.measure(cur, cat, ang, tilt)
            except FileNotFoundError:
                continue
            g = M.verdict(r)
            col = lambda k: ("PASS" if g[k] else "FAIL")
            w("| %s a%d t%g | %s | %s | %s | %s | %s | %s | %s | %s |" % (
                cat, ang, tilt, col("pale<=12%"), col("std7>=3"), col("neon0"), col("clip<=0.02"),
                col("darkL50<=130"), col("sat_L_r<=-0.5"), col("achrom_bright<=5%"), col("mean_sat>=110")))

w("\n## D. TIR (double-bounce) vs non-TIR pixels — this build, 5px-eroded stone\n")
w("| cat | spin | TIR px | L p50 TIR | sat TIR | L p50 non | sat non | darker | more sat |")
w("|---|---|---|---|---|---|---|---|---|")
for cat in CATS:
    for ang in ANGS:
        try:
            r = M.measure(cur, cat, ang)
        except FileNotFoundError:
            continue
        t = r.get("tir")
        if not isinstance(t, dict):
            w("| %s | %d | SKIPPED | | | | | | |" % (cat, ang)); continue
        w("| %s | %d | %.1f%% | %.1f | %.1f | %.1f | %.1f | %s | %s |" % (
            cat, ang, 100 * t["frac_any"], t["L_tir"] or -1, t["sat_tir"] or -1, t["L_non"], t["sat_non"],
            "yes" if (t["L_tir"] is not None and t["L_tir"] < t["L_non"]) else "**no**",
            "yes" if (t["sat_tir"] is not None and t["sat_tir"] > t["sat_non"]) else "**no**"))

w("\n## E. Sheet (rubric total /110) at the frozen pose\n")
for cat in CATS:
    row = []
    for label, d in (("committed", base), ("this build", cur)):
        try:
            s = json.load(open("%s/%s/score.json" % (d, cat)))
            crit = [(x.get("id"), x.get("score")) for x in s["criteria"]]
            row.append("%s **%s** %s" % (label, s["total_of_110"], crit))
        except Exception as e:
            row.append("%s NOT SCORED (%s)" % (label, e))
    w("- **%s** — %s" % (cat, " · ".join(row)))

open("lanes/value2/tables.md", "w").write("\n".join(out) + "\n")
print("\n".join(out))
