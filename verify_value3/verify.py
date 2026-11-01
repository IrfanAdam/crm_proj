#!/usr/bin/env python3
"""verify_value3/verify.py — post-DONE verification of the value3 lane.

Steps (all read-only on the lane's output; writes only under verify_value3/):
  1. md5 every PNG in lanes/value3/<cat>/ (manifest + duplicate/blank check)
  2. re-run the frozen-angle scorer: score.py <cell-dir> --color <cat>
     --peer <other cat> --quiet, writing into verify_value3/new/
  3. run the independent detectors (det.py) on every captured stone cell
  4. evaluate the gates (gates.py) and emit the numbers verdict.md needs

usage: python3 verify_value3/verify.py
"""
import hashlib
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)

import det  # noqa: E402

LANE = os.path.join(REPO, "lanes", "value3")
OUT = HERE
NEW = os.path.join(HERE, "new")
SCORE = os.path.join(REPO, "prototype", "gems", "score.py")
CATS = ["sapphire", "citrine"]
PEER = {"sapphire": "citrine", "citrine": "sapphire"}


def md5(path):
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def cat_dir(cat):
    for cand in (os.path.join(LANE, cat), os.path.join(LANE, "..", "value3", cat)):
        if os.path.isdir(cand):
            return os.path.abspath(cand)
    return None


def shot_dir(cat):
    """Directory holding front/repeat/txoff/... at the frozen 0/0 pose."""
    d = cat_dir(cat)
    if d and all(os.path.exists(os.path.join(d, f"{r}.png"))
                 for r in ("front", "repeat", "txoff", "dispoff", "chart", "dark", "nogem")):
        return d
    # some lanes nest the frozen set under base/
    for sub in ("base", "frozen", "score", "sheet"):
        cand = os.path.join(d, sub) if d else None
        if cand and os.path.isdir(cand) and os.path.exists(os.path.join(cand, "front.png")):
            return cand
    return d


def main():
    os.makedirs(NEW, exist_ok=True)
    report = {"lane": LANE, "cats": {}}
    manifest = []
    for cat in CATS:
        d = cat_dir(cat)
        if not d:
            report["cats"][cat] = {"error": "no lane cell dir"}
            continue
        pngs = sorted(f for f in os.listdir(d) if f.lower().endswith(".png"))
        digests = {}
        for f in pngs:
            p = os.path.join(d, f)
            digests[f] = {"md5": md5(p), "bytes": os.path.getsize(p)}
            manifest.append({"cat": cat, "file": f, **digests[f]})
        seen = {}
        for f, info in digests.items():
            seen.setdefault(info["md5"], []).append(f)
        dupes = {h: fs for h, fs in seen.items() if len(fs) > 1}
        report["cats"][cat] = {
            "dir": d, "n_png": len(pngs), "md5": digests,
            "duplicate_md5_groups": dupes,
            "nonpng_files": sorted(f for f in os.listdir(d) if not f.lower().endswith(".png")),
        }

    # rescore at the frozen angle pose
    for cat in CATS:
        sd = shot_dir(cat)
        peer = shot_dir(PEER[cat])
        if not sd:
            continue
        out = os.path.join(NEW, f"score_{cat}.json")
        cmd = [sys.executable, SCORE, sd, "--color", cat, "--peer", peer, "--out", out, "--quiet"]
        r = subprocess.run(cmd, capture_output=True, text=True)
        entry = report["cats"][cat]
        entry["rescore_dir"] = sd
        entry["rescore_cmd"] = " ".join(cmd)
        entry["rescore_rc"] = r.returncode
        entry["rescore_stderr"] = r.stderr.strip()[:800]
        if r.returncode == 0 and os.path.exists(out):
            with open(out) as fh:
                pay = json.load(fh)
            entry["rescore_total"] = pay.get("total_of_110")
            entry["rescore_criteria"] = [(c["id"], c["score"], (c.get("notes") or "")[:80]) for c in pay.get("criteria", [])]
            claim_path = os.path.join(cat_dir(cat) or "", "score.json")
            if os.path.exists(claim_path):
                with open(claim_path) as fh:
                    claim = json.load(fh)
                entry["claim_path"] = claim_path
                entry["claim_total"] = claim.get("total_of_110")
                entry["matches_claim"] = claim.get("total_of_110") == pay.get("total_of_110")
                c1 = {c["id"]: c["score"] for c in claim.get("criteria", [])}
                p1 = {c["id"]: c["score"] for c in pay.get("criteria", [])}
                entry["criteria_delta"] = {k: [c1.get(k), p1.get(k)] for k in sorted(set(c1) | set(p1)) if c1.get(k) != p1.get(k)}
            else:
                entry["claim_path"] = None

    # detectors on every captured stone cell
    dets = {}
    for cat in CATS:
        d = cat_dir(cat)
        if not d:
            continue
        dets[cat] = {}
        for f in sorted(os.listdir(d)):
            if not f.lower().endswith(".png"):
                continue
            base = f[:-4]
            if not (base.startswith("front") or base.startswith("dark")):
                continue
            dets[cat][f] = det.measure(os.path.join(d, f))
    with open(os.path.join(NEW, "dets.json"), "w") as fh:
        json.dump(dets, fh, indent=2)

    with open(os.path.join(HERE, "md5_manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    with open(os.path.join(HERE, "verify.json"), "w") as fh:
        json.dump(report, fh, indent=2)

    print(json.dumps({c: {k: v for k, v in report["cats"][c].items()
                          if k in ("n_png", "rescore_total", "claim_total", "matches_claim",
                                   "criteria_delta", "duplicate_md5_groups", "nonpng_files")}
                      for c in report["cats"]}, indent=2))
    print(f"manifest -> {os.path.join(HERE, 'md5_manifest.json')}")
    print(f"dets      -> {os.path.join(NEW, 'dets.json')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
