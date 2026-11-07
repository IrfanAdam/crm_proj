#!/usr/bin/env python3
"""optics_sweep.py — move ONE optical parameter across N values and print the render's response.

    python3 prototype/gems/optics_sweep.py --url URL --stone sapphire \
        --param n.trace --values 1.768,2.0,2.4,2.6 --out DIR

Why: GEM_OPTICS is a record, so a sweep is a runtime `set` + `apply`, never a rebuild. Each value is one
capture of the SAME frozen pose (tilt −0.15, spin 0, idle float pinned), so any difference is the parameter.

Reported per value: md5 · mean|Δ| vs the first value · L50 · L95 · median sat · stone px · plate %.
The stone mask is "pixels that deviate from the stage's own border colour by > 12" — the studio stage is a
near-uniform field, so this is the stone plus the light it throws, and it is stable across values.

A sweep whose variants share one md5 is an INERT KNOB: the value never reached the program. Report that as
such, never as a negative result. Writes <out>/sweep.json and one directory per value.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

W = np.array([0.2126, 0.7152, 0.0722])
POSE = ("(window.GEM3D.rigs||[]).filter(function(r){return r.group}).forEach(function(r){"
        "r.cat.spin=0;Object.defineProperty(r,'t',{get:function(){return 0},set:function(){}});"
        "r.tilt=-0.15;r.tiltT=-0.15;r.group.rotation.y=0;})")


def patch_of(param: str, value: float) -> dict:
    """'n.trace' → {'n': {'trace': 2.0}}"""
    keys = param.split(".")
    out: dict = {}
    cur = out
    for k in keys[:-1]:
        cur[k] = {}
        cur = cur[k]
    cur[keys[-1]] = value
    return out


def metrics(path: str) -> dict:
    im = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)
    mx, mn = im.max(axis=2), im.min(axis=2)
    satv = np.where(mx > 1, (mx - mn) / np.maximum(mx, 1) * 255, 0)
    mask = satv > 55                      # the stone's own colour: the studio stage is neutral (sat≈0)
    if mask.sum() < 2000:                 # pale stone on a pale stage — fall back to deviation from the border
        border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
        mask = np.abs(im - np.median(border, axis=0)).max(axis=2) > 12
    lum = im @ W
    lp = lum[mask] if mask.any() else np.zeros(1)
    sat = satv[mask]
    k = 7
    mean = ndi.uniform_filter(lum, k)
    sq = ndi.uniform_filter(lum * lum, k)
    std = np.sqrt(np.maximum(sq - mean * mean, 0))
    plate = mask & (lum >= 40) & (lum <= 80) & (std < 6)
    return {
        "md5": hashlib.md5(open(path, "rb").read()).hexdigest(),
        "px": int(mask.sum()),
        "l50": float(np.percentile(lp, 50)),
        "l95": float(np.percentile(lp, 95)),
        "sat": float(np.median(sat)) if sat.size else 0.0,
        "plate": 100.0 * float(plate.sum()) / max(int(mask.sum()), 1),
        "rgb": im,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--stone", default="sapphire")
    ap.add_argument("--param", required=True)
    ap.add_argument("--values", required=True, help="comma-separated numbers")
    ap.add_argument("--out", required=True)
    ap.add_argument("--shot", default="prototype/gems/gem-shot.mjs")
    ap.add_argument("--clip", default='.frame[data-panel="gems"] .gem-stage')
    ap.add_argument("--scale", default="2")
    ap.add_argument("--wait", default="5000")
    ap.add_argument("--size", default="1500x1200")
    a = ap.parse_args()

    values = [v.strip() for v in a.values.split(",") if v.strip()]
    os.makedirs(a.out, exist_ok=True)
    rows, base = [], None
    for v in values:
        d = os.path.join(a.out, "v" + v.replace(".", "_"))
        shutil.rmtree(d, ignore_errors=True)
        patch = json.dumps(patch_of(a.param, float(v)))
        ev = ("(function(){var G=window.GEM_OPTICS;G.set('%s',%s);var n=G.apply();%s;"
              "return String(n)+'|'+String(G.of('%s').%s);})()"
              % (a.stone, patch, POSE, a.stone, a.param))
        cmd = ["node", a.shot, a.url, d, "--scale", a.scale, "--wait", a.wait,
               "--size", a.size, "--clip", a.clip, "--eval", ev]
        r = subprocess.run(cmd, capture_output=True, text=True)
        clip = os.path.join(d, "clip-0.png")
        if not os.path.exists(clip):
            print("MISSING CAPTURE for %s\n%s" % (v, r.stdout[-500:]))
            return 2
        m = metrics(clip)
        if base is None:
            base = m["rgb"]
        rgb = m.pop("rgb")
        m["mean_d"] = float(np.abs(rgb - base).mean())
        m["value"] = v
        rows.append(m)

    inert = len({r["md5"] for r in rows}) == 1
    hdr = "| value | md5 | mean\\|Δ\\| | L50 | L95 | sat | px | plate % |"
    print(hdr)
    print("|---|---|---|---|---|---|---|---|")
    for r in rows:
        print("| %s | %s | %.2f | %.1f | %.1f | %.0f | %d | %.1f |"
              % (r["value"], r["md5"][:10], r["mean_d"], r["l50"], r["l95"], r["sat"], r["px"], r["plate"]))
    if inert:
        print("\nINERT KNOB — every value produced the same md5; the parameter never reached the program.")
    json.dump({"param": a.param, "stone": a.stone, "inert": inert,
               "rows": [{k: r[k] for k in r if k != "rgb"} for r in rows]},
              open(os.path.join(a.out, "sweep.json"), "w"), indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
