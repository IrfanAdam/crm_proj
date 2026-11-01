#!/usr/bin/env python3
"""build_verdict.py — assemble verify_value2/verdict.md from the measured JSON."""
import hashlib
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(ROOT, "verify_value2")

BANDS = ["crown_top", "crown_lower", "girdle", "upper_pavilion", "mid_pavilion", "culet"]
FRAC = {"crown_top": "0-.18", "crown_lower": ".18-.32", "girdle": ".32-.38",
        "upper_pavilion": ".38-.62", "mid_pavilion": ".62-.82", "culet": ".82-1"}


def md5(p):
    return hashlib.md5(open(p, "rb").read()).hexdigest()


def load(n):
    return json.load(open(os.path.join(V, n)))


new = load("new_angles.json")
pre = load("pre_angles.json")
tir = load("new_tirmask.json")
base = {c: load(f"baseline_{c}.json") for c in ("sapphire", "citrine")}
rescore = {c: load(f"new_rescore_{c}.json") for c in ("sapphire", "citrine")}
bres = {c: load(f"baseline_rescore_{c}.json") for c in ("sapphire", "citrine")}
lane = {c: json.load(open(os.path.join(ROOT, f"lanes/value2/{c}/score.json"))) for c in ("sapphire", "citrine")}

shader_md5 = md5(os.path.join(ROOT, "src/components/GemReward/gem-shader.js"))
try7_md5 = md5(os.path.join(ROOT, "lanes/value2/gem-shader.try7.js"))
committed_md5 = md5(os.path.join(ROOT, "lanes/value2/gem-shader.committed.js"))


def rows(es):
    return [e for e in es if "globals" in e]


def gate_row(e):
    g, b = e["globals"], e["bands"]
    std_min = min(b[k]["std7_med"] for k in BANDS)
    std_bad = [k for k in BANDS if b[k]["std7_med"] < 3.0]
    br_bad = [k for k in BANDS if b[k]["L_p50"] > 130.0]
    return dict(pose=e["pose"], pale=g["pale_lowinfo_frac"], pale_ok=g["pale_lowinfo_frac"] <= 0.12,
                std_min=std_min, std_bad=",".join(std_bad) or "-", std_ok=not std_bad,
                neon=g["neon_px"], neon_ok=g["neon_px"] == 0,
                clip=g["clip_frac"], clip_ok=g["clip_frac"] <= 0.02,
                br_bad=",".join(br_bad) or "-", br_ok=not br_bad,
                r=g["sat_L_pearson_r"], r_ok=g["sat_L_pearson_r"] <= -0.5,
                achro=g["achro_bright_frac"], achro_ok=g["achro_bright_frac"] <= 0.05,
                isat=g["interior_sat_mean"], isat_ok=g["interior_sat_mean"] >= 110.0,
                L5=g["L_p05"], L95=g["L_p95"], L50=g["L_p50"])


out = []
w = out.append

w("# verify_value2 — angle-stable interior: independent verification")
w("")
w("Instrument `prototype/gems/score.py` (not modified). Detectors are mine, written from the")
w("brief's frozen spec: `verify_value2/bands2.py` (mask + bands + globals + gates a-c),")
w("`verify_value2/poses.py` (pose discovery), `verify_value2/sweep.py` (per-angle sweep),")
w("`verify_value2/tirmask.py` (gate d), `verify_value2/gate_eval.py` (gate table).")
w("")
w("## 0. Provenance of what was graded")
w("")
w("| item | value |")
w("|---|---|")
w(f"| shipped shader `src/components/GemReward/gem-shader.js` | md5 `{shader_md5}` |")
w(f"| lane `lanes/value2/gem-shader.try7.js` | md5 `{try7_md5}` — **identical to shipped** |")
w(f"| committed bytes `lanes/value2/gem-shader.committed.js` | md5 `{committed_md5}` (revert target) |")
w("| PNGs hashed | 52 (26 per cat), all non-zero, none flat (min per-file L std 16.9) — `new_md5.txt` / `new_md5.json` |")
w("| poses captured per cat | 9 = yaw 0/35/70 x tilt 0/+0.55/-0.55, each with `front` + `dark` |")
w("| extra poses | `tirmask` debug shot at yaw 0/35/70, tilt 0 only (3 per cat) |")
w("")
w("The lane's `DONE` says FAILED and does not claim success; the numbers below are my own")
w("re-derivation, not a restatement of its table.")
w("")
w("## 1. Baseline — committed look, `.hermes/tmp/round6/runs/`")
w("")
w("| cat | committed `score.json` | my re-run `--peer --quiet` | match |")
w("|---|---:|---:|:--:|")
for c in ("sapphire", "citrine"):
    committed_total = json.load(open(os.path.join(ROOT, f".hermes/tmp/round6/runs/{c}/score.json")))["total_of_110"]
    w(f"| {c} | {committed_total}/110 | {bres[c]['total_of_110']}/110 | exact |")
w("")
w("Baseline band meter (front.png, dark.png mask, 32,272 / 32,212 px, bbox h 185):")
w("")
w("| cat | band | frac of h | %stone | L p50 | S med | 7x7 std med | pale frac |")
w("|---|---|---|---:|---:|---:|---:|---:|")
for c in ("sapphire", "citrine"):
    for b in BANDS:
        v = base[c]["bands"][b]
        w(f"| {c} | {b} | {FRAC[b]} | {v['frac_stone']:.3f} | {v['L_p50']:.2f} | {v['S_med']:.1f} | {v['std7_med']:.2f} | {v['pale_frac']:.3f} |")
w("")
w("| cat | pale-lowinfo | clip | L p5 | L p95 | neon | r(sat,L) | achro-bright | interior S mean |")
w("|---|---:|---:|---:|---:|---:|---:|---:|---:|")
for c in ("sapphire", "citrine"):
    g = base[c]["globals"]
    w(f"| {c} | {g['pale_lowinfo_frac']:.4f} | {g['clip_frac']:.4f} | {g['L_p05']:.2f} | {g['L_p95']:.2f} | {g['neon_px']} | {g['sat_L_pearson_r']:+.3f} | {g['achro_bright_frac']:.4f} | {g['interior_sat_mean']:.1f} |")
w("")
w("Baseline already misses several of the round's gates on the committed pose: sapphire")
w("crown_top std 2.19, clip 0.0311 > 0.02, achro-bright 10.0% > 5%, score 66 = the bar with no")
w("headroom; citrine pale-lowinfo 0.270, upper_pavilion std 2.03, clip 0.0544.")
w("")
w("### 1b. Baseline at spin angles (committed shader, captured 00:53-00:58 before the lane rewrote its dir)")
w("")
w("I snapshotted the lane's first capture pass while `gem-shader.js` was still the committed")
w("bytes (`f854e08`); those PNGs are frozen in `verify_value2/pre_angles/` with a manifest.")
w("")
w("| cat | pose | pale-lowinfo | clip | achro | r(sat,L) | std min |")
w("|---|---|---:|---:|---:|---:|---:|")
for c in ("sapphire", "citrine"):
    for e in rows(pre[c]):
        g = e["globals"]
        w(f"| {c} | {e['pose']} | {g['pale_lowinfo_frac']:.3f} | {g['clip_frac']:.4f} | {g['achro_bright_frac']:.3f} | {g['sat_L_pearson_r']:+.3f} | {min(e['bands'][b]['std7_med'] for b in BANDS):.2f} |")
w("")
w("So on the committed shader the pale field is 7.2-10.6% (sapphire) and 27.5-27.7% (citrine)")
w("across yaw 0/35/70/90/110/140/170. The brief's ~49% angle, and the lane's own claim of 84.7% at")
w("citrine tilt -0.55 / 32-33% at sapphire tilt -0.55, are tilt-cell claims: my snapshot has no")
w("pre-fix tilt capture, so those are **not independently reproduced** — the committed-shader yaw")
w("numbers above are the whole pre-fix envelope I can vouch for.")
w("")
w("## 2. Lane's claim vs my reproduction")
w("")
w("| item | lane claim | my measurement | agree |")
w("|---|---|---|---|")
w(f"| sap total | {lane['sapphire']['total_of_110']}/110 | {rescore['sapphire']['total_of_110']}/110 | yes, per-criterion identical |")
w(f"| cit total | {lane['citrine']['total_of_110']}/110 | {rescore['citrine']['total_of_110']}/110 | yes, per-criterion identical |")
w("| shipped = try7 | md5 ad74d419... | md5 identical to `gem-shader.try7.js` | yes |")
w("| clip at tilt +0.55 | 13-15% | 9.3-16.9% (cit 0.0925-0.1327, sap 0.1121-0.1693) | same cells, wider |")
w("| band std misses | crown_top 1.02-1.30 (sap), lower_pav 0.73-2.36 | crown_top 0.90-1.17 (sap); citrine 7/9 poses miss | same conclusion, my band fractions are the frozen spec's (the lane's `measure.py` uses 0-.22/.22-.38/.38-.46/... ) |")
w("| TIR gate | \"inverted, TIR 98.2-98.8% of stone\" | TIR 56-58% of stone with my rule (below) | rule differs; both agree there is no usable TIR/non-TIR split |")
w("")
w("## 3. Every captured angle — gate table")
w("")
for c in ("sapphire", "citrine"):
    rr = [gate_row(e) for e in rows(new[c])]
    w(f"### {c}")
    w("")
    w("| pose | pale | G1 | 7x7 std min | failing bands | G2 | neon | clip | G4 | bands L p50 >130 | G5 | r(sat,L) | (a) | achro | (b) | int S | (c) |")
    w("|---|---:|:--:|---:|---|:--:|---:|---:|:--:|---|:--:|---:|:--:|---:|:--:|---:|:--:|")
    for r in rr:
        w("| {pose} | {pale:.3f} | {p1:} | {sm:.2f} | {sb} | {p2:} | {neon} | {clip:.4f} | {p3:} | {bb} | {p4:} | {r:+.3f} | {p5:} | {ac:.3f} | {p6:} | {isat:.1f} | {p7:} |".format(
            pose=r["pose"], pale=r["pale"], p1="PASS" if r["pale_ok"] else "FAIL", sm=r["std_min"],
            sb=r["std_bad"], p2="PASS" if r["std_ok"] else "FAIL", neon=r["neon"], clip=r["clip"],
            p3="PASS" if r["clip_ok"] else "FAIL", bb=r["br_bad"], p4="PASS" if r["br_ok"] else "FAIL",
            r=r["r"], p5="PASS" if r["r_ok"] else "FAIL", ac=r["achro"], p6="PASS" if r["achro_ok"] else "FAIL",
            isat=r["isat"], p7="PASS" if r["isat_ok"] else "FAIL"))
    n = len(rr)
    w("")
    w("poses passing: pale {}/{} | std {}/{} | neon {}/{} | clip {}/{} | no-bright-band {}/{} | r {}/{} | achro {}/{} | interior-S {}/{}".format(
        sum(r["pale_ok"] for r in rr), n, sum(r["std_ok"] for r in rr), n, sum(r["neon_ok"] for r in rr), n,
        sum(r["clip_ok"] for r in rr), n, sum(r["br_ok"] for r in rr), n, sum(r["r_ok"] for r in rr), n,
        sum(r["achro_ok"] for r in rr), n, sum(r["isat_ok"] for r in rr), n))
    w("")

w("### 3b. Full band table (L p50 / 7x7 std med)")
w("")
for c in ("sapphire", "citrine"):
    w(f"**{c}**")
    w("")
    w("| pose | " + " | ".join(BANDS) + " |")
    w("|---|" + "---:|" * len(BANDS))
    for e in rows(new[c]):
        cells = [f"{e['bands'][b]['L_p50']:.1f} / {e['bands'][b]['std7_med']:.2f}" for b in BANDS]
        w(f"| {e['pose']} | " + " | ".join(cells) + " |")
    w("")

w("## 4. New gates (a)-(d)")
w("")
w("### (a) saturation-vs-luminance coupling, r(sat, L) over masked stone px, gate r <= -0.5")
w("")
w("| cat | worst pose | r | best pose | r | poses passing |")
w("|---|---|---:|---|---:|---:|")
for c in ("sapphire", "citrine"):
    rr = [gate_row(e) for e in rows(new[c])]
    worst = max(rr, key=lambda r: r["r"])
    best = min(rr, key=lambda r: r["r"])
    w(f"| {c} | {worst['pose']} | {worst['r']:+.3f} | {best['pose']} | {best['r']:+.3f} | {sum(r['r_ok'] for r in rr)}/{len(rr)} |")
w("")
w("Sapphire passes everywhere: dark interior stays the saturated/bluer end (-0.85..-0.96).")
w("Citrine is inverted at tilt 0 and at -0.55 (+0.18, +0.07, +0.40): its brighter interior is its")
w("*more* saturated interior, i.e. the coupling the owner complained about is still absent there,")
w("and the pre-fix shader had it right for citrine (-0.72..-0.75). This is a regression, not a fix.")
w("")
w("### (b) achromatic bright field, frac(sat<60 & L>150) <= 5%")
w("")
w("| cat | tilt 0 | tilt -0.55 | tilt +0.55 |")
w("|---|---:|---:|---:|")
for c in ("sapphire", "citrine"):
    by = {e["pose"]: e["globals"]["achro_bright_frac"] for e in rows(new[c])}
    cells = []
    for t, poses in (("0", ["a0", "a35", "a70"]), ("-0.55", ["a0_t-0.55", "a35_t-0.55", "a70_t-0.55"]),
                     ("+0.55", ["a0_t0.55", "a35_t0.55", "a70_t0.55"])):
        cells.append(", ".join(f"{by[p]:.3f}" for p in poses if p in by))
    w(f"| {c} | {cells[0]} | {cells[1]} | {cells[2]} |")
w("")
w("The +0.55 cells fail by 2.4-4.4x (11.9-21.8%): the top-up light turns a large achromatic-white")
w("region on.")
w("")
w("### (c) interior mean saturation (mask eroded 2 px) >= 110")
w("")
w("| cat | min | max | poses passing |")
w("|---|---:|---:|---:|")
for c in ("sapphire", "citrine"):
    rr = [gate_row(e) for e in rows(new[c])]
    w(f"| {c} | {min(r['isat'] for r in rr):.1f} | {max(r['isat'] for r in rr):.1f} | {sum(r['isat_ok'] for r in rr)}/{len(rr)} |")
w("")
w("Saturation is not the problem: both stones are strongly coloured (interior S 129-231).")
w("")
w("### (d) TIR-bounce-ish vs non-TIR pixels")
w("")
w("RULE (measured, not proxied): the lane's own shader debug channel. `capture2.mjs` role")
w("`tirmask` hides the body material (`r.mats[0]`) and sets the proxy material's `u.dbg = 1`, so")
w("the shader paints only the reflected/TIR contribution. Inside the frozen `dark.png` mask, a")
w("pixel is TIR-bounce-ish when that debug render differs from the empty stage (`nogem.png`) by")
w("|dL| >= 8; everything else is non-TIR. Medians are then read off the graded `front.png` of the")
w("same pose. Coverage: yaw 0/35/70 at tilt 0 only — the lane captured no `tirmask` at +-0.55, so")
w("those six cells are NOT MEASURED for (d).")
w("")
w("| cat | pose | TIR frac | TIR L med | TIR S med | non-TIR L med | non-TIR S med | dL | dS |")
w("|---|---|---:|---:|---:|---:|---:|---:|---:|")
for c in ("sapphire", "citrine"):
    for r in tir[c]:
        if "tir_px" not in r:
            w(f"| {c} | {r['pose']} | {r.get('status')} | | | | | | |")
            continue
        w("| {c} | {p} | {f:.3f} | {tl:.1f} | {ts:.1f} | {nl:.1f} | {ns:.1f} | {dl:+.1f} | {ds:+.1f} |".format(
            c=c, p=r["pose"], f=r["tir_frac"], tl=r.get("tir_L_med", float("nan")), ts=r.get("tir_S_med", float("nan")),
            nl=r.get("nontir_L_med", float("nan")), ns=r.get("nontir_S_med", float("nan")),
            dl=r.get("dL_tir_minus_nontir", float("nan")), ds=r.get("dS_tir_minus_nontir", float("nan"))))
w("")
w("Read: the debug channel lights 56-58% of the stone, so the split is coarse — it separates a")
w("bright bounce field from a dark grazing fringe, not \"interior reflection\" from \"surface\".")
w("Within it, sapphire's TIR pixels are slightly brighter and slightly more saturated (+6..+8 L,")
w("+10..+12 S); citrine's are *darker and less saturated* than the rest (-4..-10 L, -3..-14 S).")
w("So on citrine the reflected field still carries no colour relative to its surroundings — the")
w("owner's finding persists in the category the fix was aimed at.")
w("")
w("## 5. Committed vs new, same poses")
w("")
w("| cat | pose | pale committed -> new | std min committed -> new | clip committed -> new | achro committed -> new | r committed -> new |")
w("|---|---|---|---:|---:|---:|---:|")
pend = {c: {e["pose"]: e for e in rows(pre[c])} for c in ("sapphire", "citrine")}
for c in ("sapphire", "citrine"):
    for pose in ("a0", "a35", "a70"):
        if pose in pend[c] and pose in {e["pose"]: e for e in rows(new[c])}:
            p = pend[c][pose]
            n = {e["pose"]: e for e in rows(new[c])}[pose]
            w("| {} | {} | {:.3f} -> {:.3f} | {:.2f} -> {:.2f} | {:.4f} -> {:.4f} | {:.3f} -> {:.3f} | {:+.3f} -> {:+.3f} |".format(
                c, pose, p["globals"]["pale_lowinfo_frac"], n["globals"]["pale_lowinfo_frac"],
                min(p["bands"][b]["std7_med"] for b in BANDS), min(n["bands"][b]["std7_med"] for b in BANDS),
                p["globals"]["clip_frac"], n["globals"]["clip_frac"],
                p["globals"]["achro_bright_frac"], n["globals"]["achro_bright_frac"],
                p["globals"]["sat_L_pearson_r"], n["globals"]["sat_L_pearson_r"]))
w("")
w("| cat | committed total | new total | bar | verdict |")
w("|---|---:|---:|---:|---|")
w(f"| sapphire | {bres['sapphire']['total_of_110']} | {rescore['sapphire']['total_of_110']} | 66 | **FAIL** (-2) |")
w(f"| citrine | {bres['citrine']['total_of_110']} | {rescore['citrine']['total_of_110']} | 62 | PASS (+2) |")
w("")
w("Stone mean L collapsed with the fix: sapphire 141 -> 77-135 (64-74% of stone below L80 in the")
w("tilt -0.55 cells), citrine 202 -> 102-141. L p95 237-250 -> 125-162 except in the +0.55 cells,")
w("which blow to 255. The pale field was removed by removing the light, not by routing colour")
w("into it: the value range that the committed look had is gone, and that is what the rubric")
w("total is paying for (66 -> 64).")
w("")
w("## 6. Verdict")
w("")
w("**FAILED.** 6 of the 11 gate rows miss; the lane's own DONE agrees on the total but understates")
w("two of the misses (it reports clip 13-15% where I measure up to 16.9%, and it does not flag that")
w("citrine's r(sat,L) inverted).")
w("")
w("| gate | bar | sapphire | citrine | overall |")
w("|---|---|---|---|---|")
w("| pale-lowinfo | <= 12% at every captured angle | 0.000-0.115 PASS (9/9) | 0.000-0.097 PASS (9/9) | **PASS** |")
w("| band 7x7 std | >= 3.0 every band | 0.90-1.17 crown_top at tilt 0, 3/9 poses FAIL | 1.42-2.04, 7/9 poses FAIL | **FAIL** |")
w("| neon | 0 | 0 (9/9) | 0 (9/9) | **PASS** |")
w("| clip | <= 0.02 | 0.112-0.169 at +0.55, 3/9 FAIL | 0.093-0.133 at +0.55, 3/9 FAIL | **FAIL** |")
w("| no bright band | every band L p50 <= 130 | 3-5 bands 131-146 at +0.55, 3/9 FAIL | 4-6 bands 133-147 at +0.55, 3/9 FAIL | **FAIL** |")
w("| totals reproduce | exact | 64 = 64, per-criterion identical PASS | 64 = 64 PASS | **PASS** |")
w("| totals vs bar | >= 66 / >= 62 | 64 FAIL | 64 PASS | **FAIL** |")
w("| (a) r(sat,L) | <= -0.5 | -0.849..-0.960 PASS (9/9) | -0.436..+0.403, 2/9 pass FAIL | **FAIL** |")
w("| (b) achro bright | <= 5% | 0.157-0.218 at +0.55, 3/9 FAIL | 0.119-0.167 at +0.55, 3/9 FAIL | **FAIL** |")
w("| (c) interior mean S | >= 110 | 129.0-230.9 PASS (9/9) | 141.1-213.4 PASS (9/9) | **PASS** |")
w("| (d) TIR split | report | 3 poses measured, 6 NOT MEASURED | same | **REPORTED** |")
w("")
w("Deciding numbers: sapphire crown_top std 1.17 / 1.08 / 0.90 at yaw 0 / 35 / 70 (bar 3.0),")
w("citrine mid_pavilion 2.03 / 1.79 / 1.42, culet 2.27 / 2.51 / 1.56, upper_pavilion 2.59 / 4.73 /")
w("2.55 at yaw 0 / 35 / 70; clip 0.1693 (sap a0_t+0.55) and 0.1327 (cit a0_t+0.55) against 0.02;")
w("citrine r(sat,L) +0.403 at a70 against the -0.5 bar; totals 64/64 against 66/62.")
w("")
w("What the fix did achieve, and it is real: pale-lowinfo is 0.0-11.5% everywhere (committed")
w("7.2-10.6% / 27.5-27.7% at yaw, claimed 32-85% at tilt), neon is 0, interiors are saturated,")
w("and the totals reproduce byte-for-byte from the lane's own PNGs. What it did not achieve:")
w("facet-to-facet structure at tilt 0 (both cats), any control of the +0.55 light (clip, achro,")
w("bright bands), citrine's colour coupling, and it lost the committed look's value range and 2")
w("points of the sapphire rubric.")
w("")
w("Artifacts: `baseline_{cat}.json`, `baseline_rescore_{cat}.json`, `pre_angles/` +")
w("`pre_angles.json`, `new_angles.json`, `new_tirmask.json`, `gates_new.json`, `new_md5.txt`,")
w("`new_rescore_{cat}.json`.")

open(os.path.join(V, "verdict.md"), "w").write("\n".join(out) + "\n")
print("wrote verdict.md", len(out), "lines")
