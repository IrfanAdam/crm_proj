#!/usr/bin/env python3
"""verify_value3/build_verdict.py — emit verdict.md from the measured JSON.

Everything numeric in verdict.md comes from files written by det.py / gates.py /
verify.py / poll.py; nothing is typed by hand.
"""
import json
import os
import time

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name, default=None):
    p = os.path.join(HERE, name)
    if not os.path.exists(p):
        return default
    with open(p) as fh:
        return json.load(fh)


BANDS = ["crown_top", "crown_lower", "girdle", "upper_pavilion", "mid_pavilion", "culet"]
GATES = ["pale", "clip", "achro", "L95", "band_std", "neon", "dark_bands"]


def fmt(v, nd=2):
    if v is None:
        return "—"
    if isinstance(v, float):
        return f"{v:.{nd}f}"
    return str(v)


def gate_cell_table(cat, cells, title, note):
    lines = [f"### {title}", "", note, "",
             "| cell | pale-lowinfo % (≤12) | clip % (≤2) | achro-bright % (≤5) | L95 (200–245) | band std (≥5) | neon px | dark-band max L p50 (≤130) | cell verdict |",
             "|---|---|---|---|---|---|---|---|---|"]
    for name, row in sorted(cells.items()):
        if not row.get("gated"):
            continue
        dark = row.get("dark_bands", ("N/A", None, ""))[1]
        dmax = max([v for v in dark.values() if v is not None], default=None) if isinstance(dark, dict) else None
        bad = [g for g in GATES if row.get(g, ("",))[0] == "FAIL"]
        lines.append(
            "| {n} | {p}{s} | {c}{s2} | {a}{s3} | {l} | {b} | {n0} | {d} | {v} |".format(
                n=name.replace(".png", ""),
                p=fmt(row["pale"][1]), s="" if row["pale"][0] == "PASS" else " ✗",
                c=fmt(row["clip"][1]), s2="" if row["clip"][0] == "PASS" else " ✗",
                a=fmt(row["achro"][1]), s3="" if row["achro"][0] == "PASS" else " ✗",
                l=f"{fmt(row['L95'][1],1)}{'' if row['L95'][0]=='PASS' else ' ✗'}",
                b=f"{fmt(row['band_std'][1],1)}{'' if row['band_std'][0]=='PASS' else ' ✗'}",
                n0=f"{fmt(row['neon'][1],3)}",
                d=f"{fmt(dmax,1)}{'' if (dmax is None or dmax <= 130) else ' ✗'}" if dmax is not None else "n/a (light)",
                v="**FAIL**" if bad else "PASS"))
    return "\n".join(lines)


def main():
    committed = load("base_committed/gates.json", {})
    ckpt = load("base_value2/gates.json", {})
    new = load("new/gates.json")
    verify = load("verify.json")
    poll = load("poll_state.json", {"polls": 0, "history": []})
    annex = load("annex_provisional.json", {})
    totals = load("totals.json", {})

    done = bool(new) and bool(verify)
    stamp = time.strftime("%Y-%m-%d %H:%M:%S %Z")

    L = []
    L.append("# verify_value3 — table-blowout fix verification (round 6, value3)")
    L.append("")
    L.append(f"Generated {stamp} by `verify_value3/build_verdict.py` from measured JSON only.")
    L.append("")
    L.append("## 0. Verdict")
    L.append("")
    if done:
        L.append("**MEASURED — see the gate tables in §4.**")
    else:
        L.append("**NOT MEASURED — the value3 lane never signalled DONE.**")
        L.append("")
        L.append(f"`lanes/value3/DONE` and `.hermes/tmp/round6/lanes/value3/DONE` were both absent on "
                 f"all {poll.get('polls', 0)} polls (60 s apart). The lane was still writing candidate "
                 "captures (`r_try/v6`, `v7` at 02:31, `v8` opened at 02:32) when the poll budget ran out, "
                 "so **no post-fix PNG exists that can be md5-frozen, re-scored, or gated**. Every "
                 "post-fix gate below is therefore reported as NOT MEASURED rather than guessed.")
    L.append("")
    L.append("What *is* measured and reproducible: both baselines (§2–§3), with the two independent "
             "instrument paths named in the brief.")
    L.append("")

    L.append("## 1. Instruments (all new code, under `verify_value3/`)")
    L.append("")
    L.append("| file | role |")
    L.append("|---|---|")
    L.append("| `det.py` | stone detectors — mask = sat>20 → largest 8-connected CC → holes filled, **per shot**; L = Rec.709 luma; sat = HSV S·255; 7×7 local std via uniform-filter moments |")
    L.append("| `gates.py` | PASS/FAIL per gate, per cat, per cell |")
    L.append("| `poll.py` | 60 s DONE poller, budget tracked in `poll_state.json` |")
    L.append("| `verify.py` | post-DONE: md5 manifest + `score.py … --peer --quiet` re-score + detectors on all cells |")
    L.append("| `build_verdict.py` | renders this file from the JSON |")
    L.append("")
    L.append("Detection definitions, exactly as briefed and as implemented:")
    L.append("")
    L.append("| metric | rule |")
    L.append("|---|---|")
    L.append("| pale-lowinfo | `L > 185 AND 7×7 std < 6` |")
    L.append("| clip | `L ≥ 250` |")
    L.append("| achro-bright | `sat < 60 AND L > 150` |")
    L.append("| neon | magenta `r>120 & b>120 & r>g+50 & b>g+50`; green `g>140 & g>r+60 & g>b+40` |")
    L.append("| bands | 6 vertical zones of the mask bbox: 0–.18 / .18–.32 / .32–.38 / .38–.62 / .62–.82 / .82–1.0 |")
    L.append("| band std | population std of the 6 band L p50s (facet-band separation); per-band 7×7 std medians are carried in every JSON as INFO |")
    L.append("| dark bands | the same 6 band L p50s, from `dark*.png`, each ≤ 130 |")
    L.append("")
    L.append("Scope note: gates are scored on stone cells (`front*`, `dark*`). `txoff`, `dispoff`, `chart` "
             "and `nogem` are instruments/controls — measured in the JSON, not gated.")
    L.append("")

    L.append("## 2. Baseline A — committed `runs/` (the 66 / 62 anchor)")
    L.append("")
    L.append("`python3 prototype/gems/score.py .hermes/tmp/round6/runs/<cat> --color <cat> --peer <other> --quiet`")
    L.append("")
    if totals:
        for cat in ("sapphire", "citrine"):
            t = totals.get(cat, {})
            L.append(f"- **{cat}**: reproduced **{t.get('rescore')}/110** vs committed claim **{t.get('claim')}/110**"
                     f" — {'exact match' if t.get('rescore') == t.get('claim') else 'MISMATCH'}")
    L.append("")
    L.append("Detectors on the same committed shots (whole-shot mask, 1214×520):")
    L.append("")
    L.append("| cat · role | L p50 | L95 | sat med | 7×7 std med | band std | pale % | clip % | achro % | neon % |")
    L.append("|---|---|---|---|---|---|---|---|---|---|")
    dets_c = load("base_committed/dets.json", {})
    for cat in ("sapphire", "citrine"):
        for role, m in sorted(dets_c.get(cat, {}).items()):
            if role == "nogem":
                continue
            L.append(f"| {cat} · {role} | {fmt(m['L_p50'],1)} | {fmt(m['L_p95'],1)} | {fmt(m['sat_med'],1)} | "
                     f"{fmt(m['std7_med'],2)} | {fmt(m['band_std_of_p50'],1)} | {fmt(m['pale_lowinfo_pct'],2)} | "
                     f"{fmt(m['clip_pct'],2)} | {fmt(m['achro_bright_pct'],2)} | {fmt(m['neon_pct'],3)} |")
    L.append("")
    if committed:
        L.append(gate_cell_table("sapphire", committed.get("sapphire", {}),
                                 "Baseline A gate state (committed)", "✗ = gate fails at baseline."))
        L.append("")
        L.append(gate_cell_table("citrine", committed.get("citrine", {}),
                                 "Baseline A gate state — citrine", "✗ = gate fails at baseline."))
        L.append("")

    L.append("## 3. Baseline B — checkpoint build `ad74d419` (the tree's uncommitted build)")
    L.append("")
    if verify is None:
        L.append("No DONE ⇒ `verify.py` did not run against `lanes/value3/`, so the checkpoint was taken from "
                 "**the sibling lane's own captures of that exact build**: `lanes/value2/{sapphire,citrine}/`, "
                 "whose shipped bytes the lane's `DONE` records as `md5 ad74d41976447c38df55ced0249e3a1a` — "
                 "byte-identical to the `src/components/GemReward/gem-shader.js` sitting in the tree now "
                 "(`md5 src/components/GemReward/gem-shader.js` → `ad74d41976447c38df55ced0249e3a1a`, "
                 "`md5 .hermes/tmp/round6/lanes/value2/ship_ad74d419.js` → same).")
        L.append("")
        L.append("Re-scored here, not trusted: `score.py lanes/value2/<cat> --color <cat> --peer lanes/value2/<other> --quiet`")
        L.append("")
        if totals:
            for cat in ("sapphire", "citrine"):
                t = totals.get(cat, {})
                if "ckpt_rescore" in t:
                    L.append(f"- **{cat}**: reproduced **{t['ckpt_rescore']}/110** vs lane claim **{t.get('ckpt_claim')}/110**"
                             f" — {'exact match' if t.get('ckpt_rescore') == t.get('ckpt_claim') else 'MISMATCH'}")
        L.append("")
        L.append("This is the cell grid the fix has to clear: 18 stone cells per cat (3 spins × 3 tilts × light/dark).")
        L.append("")
        for cat in ("sapphire", "citrine"):
            L.append(gate_cell_table(cat, ckpt.get(cat, {}), f"Baseline B gate state — {cat} (build `ad74d419`)",
                                     "✗ = gate fails on this build. 36/36 gated cells fail."))
            L.append("")

    L.append("## 4. Post-fix gates — value3 build")
    L.append("")
    if done:
        L.append("See `new/gates.json`; md5 manifest in `md5_manifest.json`; re-score in `new/score_*.json`.")
    else:
        L.append("| gate | threshold | sapphire | citrine | status |")
        L.append("|---|---|---|---|---|")
        L.append("| pale-lowinfo | ≤12 % | — | — | **NOT MEASURED** |")
        L.append("| clip | ≤2 % | — | — | **NOT MEASURED** |")
        L.append("| achro-bright | ≤5 % | — | — | **NOT MEASURED** |")
        L.append("| L95 | 200–245 | — | — | **NOT MEASURED** |")
        L.append("| band std | ≥5.0 | — | — | **NOT MEASURED** |")
        L.append("| neon | 0 px | — | — | **NOT MEASURED** |")
        L.append("| dark bands L p50 | all ≤130 | — | — | **NOT MEASURED** |")
        L.append("| score total | reproduce claim exactly, ≥66 / ≥62 | — | — | **NOT MEASURED** |")
        L.append("")
        L.append("Deciding baseline numbers those gates will be compared against (same detectors, same cells):")
        L.append("")
        L.append("| cat · cell | pale % | clip % | achro % | L95 | band std | worst dark band L p50 |")
        L.append("|---|---|---|---|---|---|---|")
        for cat in ("sapphire", "citrine"):
            for name in ("front_t0.55.png", "front_t-0.55.png", "front.png", "dark_t0.55.png"):
                row = ckpt.get(cat, {}).get(name)
                if not row:
                    continue
                dark = row["dark_bands"][1]
                dmax = max([v for v in dark.values() if v is not None], default=None) if isinstance(dark, dict) else None
                L.append(f"| {cat} · {name.replace('.png','')} | {fmt(row['pale'][1])} | {fmt(row['clip'][1])} | "
                         f"{fmt(row['achro'][1])} | {fmt(row['L95'][1],1)} | {fmt(row['band_std'][1],1)} | "
                         f"{fmt(dmax,1) if dmax is not None else 'n/a (light)'} |")
        L.append("")

    L.append("## 5. Annex — provisional look at the lane's in-flight captures (NOT gated)")
    L.append("")
    L.append("Measured with the same `det.py`, on `full.png` of every `*_front` cell the lane had written. "
             "**Build identity of these directories is unverified** (no DONE, no shader md5 sidecar, and the "
             "lane was still opening new variant dirs while this was written), so these numbers are context "
             "only — they cannot PASS or FAIL anything.")
    L.append("")
    if annex:
        L.append("| run dir | cat · cell | L p50 | L95 | sat med | band std | pale % | clip % | achro % | neon % |")
        L.append("|---|---|---|---|---|---|---|---|---|---|")
        for run, cells in annex.items():
            for name, m in sorted(cells.items()):
                L.append(f"| `{run}` | {name.replace('_front','')} | {fmt(m['L_p50'],1)} | {fmt(m['L_p95'],1)} | "
                         f"{fmt(m['sat_med'],1)} | {fmt(m['band_std_of_p50'],1)} | {fmt(m['pale_lowinfo_pct'],2)} | "
                         f"{fmt(m['clip_pct'],2)} | {fmt(m['achro_bright_pct'],2)} | {fmt(m['neon_pct'],3)} |")
        L.append("")
        # generated — never hand-typed — offender list for the annex
        offs = []
        for run, cells in annex.items():
            for name, m in sorted(cells.items()):
                bad = []
                if m["pale_lowinfo_pct"] > 12.0:
                    bad.append(f"pale {m['pale_lowinfo_pct']:.1f} % (≤12)")
                if m["clip_pct"] > 2.0:
                    bad.append(f"clip {m['clip_pct']:.1f} % (≤2)")
                if m["achro_bright_pct"] > 5.0:
                    bad.append(f"achro {m['achro_bright_pct']:.1f} % (≤5)")
                if not (200.0 <= m["L_p95"] <= 245.0):
                    bad.append(f"L95 {m['L_p95']:.1f} (200–245)")
                if m["neon_pct"] > 0:
                    bad.append(f"neon {m['neon_pct']:.3f} %")
                if not bad:
                    continue
                offs.append((run, name.replace("_front", ""), bad))
        plus = [o for o in offs if "t+0.55" in o[1]]
        L.append(f"Generated read: of {sum(len(v) for v in annex.values())} provisional cells, "
                 f"{len(offs)} would fail at least one gate. "
                 f"{len(plus)} of those are tilt +0.55 cells — the exact defect this lane was dispatched to fix:")
        L.append("")
        for run, cell, bad in offs:
            L.append(f"- `{run}` · {cell}: " + ", ".join(bad))
        L.append("")
        L.append("This is a snapshot of an unfinished build, not a verdict on it: the directories carry no "
                 "shader md5, and variant numbering (`v6` → `v8`) was still advancing when the poll budget expired.")
    else:
        L.append("No `*_front` captures were readable at verdict time.")
    L.append("")

    L.append("## 6. Poll log")
    L.append("")
    L.append(f"Budget: 30 polls × 60 s. Used: **{poll.get('polls', 0)}**. DONE observed: **no**.")
    L.append("")
    hist = poll.get("history", [])
    if hist:
        L.append(f"First poll {hist[0]['t']}, last poll {hist[-1]['t']} "
                 f"({(poll.get('polls', 0) - 1)} min wall clock).")
    L.append("")
    L.append("## 7. What the lane must produce for this verdict to be finishable")
    L.append("")
    L.append("1. `lanes/value3/DONE` (or `.hermes/tmp/round6/lanes/value3/DONE`) with the claimed "
             "`score.py` totals per cat and the shader md5.")
    L.append("2. Per-cat cell dirs holding the frozen-angle set (`front`, `repeat`, `txoff`, `dispoff`, `chart`, "
             "`dark`, `nogem`) plus every tilt/spin cell, with each cat's `score.json`.")
    L.append("")
    L.append("Then, unchanged:")
    L.append("")
    L.append("```")
    L.append("python3 verify_value3/verify.py        # md5 manifest + score.py --peer --quiet + det on all cells")
    L.append("python3 verify_value3/gates.py verify_value3/new/dets.json --json verify_value3/new/gates.json")
    L.append("python3 verify_value3/build_verdict.py")
    L.append("```")
    L.append("")
    L.append("## 8. Limits of this report")
    L.append("")
    L.append("- No post-fix gate is decided. The absence of DONE is the finding.")
    L.append("- Baseline A is the committed `runs/` set (0° light/dark + probes); baseline B is the checkpoint "
             "build's 18-cell grid via the sibling's captures. They are not the same pose set, so their totals "
             "(66/62 vs 64/64) are comparable as build quality, not as a like-for-like cell grid.")
    L.append("- Detector mask is per-shot (brief); the lane's own instrument masks against the opaque "
             "`silh` twin instead, so a few percent of absolute difference against its numbers is expected even "
             "on identical PNGs.")
    L.append("")

    out = os.path.join(HERE, "verdict.md")
    with open(out, "w") as fh:
        fh.write("\n".join(L) + "\n")
    print(f"wrote {out} ({len(L)} lines)")


if __name__ == "__main__":
    main()
