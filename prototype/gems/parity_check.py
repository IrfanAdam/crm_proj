"""ADAM/SHARED — prototype/gems/parity_check.py · JS ⇄ Python cut parity gate."""
# [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · Task 18 mirror proof.
# Run: python3 prototype/gems/parity_check.py  (needs node; exits non-zero on any drift)
# — Eval: gem-cut.js as a classic script under a window shim → JSON dump —
# — Assert: vertex/triangle counts + cell indices + CATEGORIES match; max |Δposition| ≤ 1e-9 —
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
JS = "src/components/GemReward/gem-cut.js"
DUMP = ("const fs=require('fs');global.window={};eval(fs.readFileSync('" + JS + "','utf8'));"
        "const G=window.GEM_CUT;console.log(JSON.stringify({cut:G.gemCut(G.CUT),"
        "cats:G.CATEGORIES,alias:G.CATEGORIES['red-beryl']===G.CATEGORIES.redberyl}))")
TOL = 1e-9

sys.path.insert(0, HERE)
from gem_cut import CATEGORIES, gem_cut  # noqa: E402


def js_dump():
    """Eval the classic core under a window shim → parsed JSON (no bundler, no DOM)."""
    out = subprocess.run(["node", "-e", DUMP], cwd=ROOT, capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit("node dump failed:\n" + out.stderr.strip())
    return json.loads(out.stdout)


def main():
    js = js_dump()
    pos, cells = gem_cut()
    jp, jc = js["cut"]["positions"], js["cut"]["cells"]
    if (len(jp), len(jc)) != (len(pos), len(cells)):
        sys.exit("FAIL counts js=%d/%d py=%d/%d" % (len(jp), len(jc), len(pos), len(cells)))
    if jc != [list(c) for c in cells]:
        sys.exit("FAIL cell indices differ (js=%r py=%r)" % (jc[:3], [list(c) for c in cells[:3]]))
    if js["cats"] != CATEGORIES:
        sys.exit("FAIL CATEGORIES differ: %r" % (js["cats"],))
    if not js["alias"]:
        sys.exit("FAIL 'red-beryl' alias missing on GEM_CUT.CATEGORIES")
    delta = max(abs(a[i] - b[i]) for a, b in zip(jp, pos) for i in range(3))
    if delta > TOL:
        sys.exit("FAIL maxDelta=%.3e > %g" % (delta, TOL))
    print("PARITY OK verts=%d faces=%d maxDelta=%.3e" % (len(jp), len(jc), delta))


if __name__ == "__main__":
    main()
