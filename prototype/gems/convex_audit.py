"""ADAM/SHARED — prototype/gems/convex_audit.py · the gate cut_audit does not have.

The analytic interior tracer (gem-shader ent()) assumes the cut is a CONVEX polyhedron:
"the nearest facet plane with t > 0 is the next real facet". That holds only when every
vertex lies at or behind every facet plane. cut_audit checks manifold/winding/planarity and
passes on a re-entrant girdle, so run this whenever a CUT number changes.

Run: python3 prototype/gems/convex_audit.py [--json out.json]   (exits 1 on any violation)
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gem_cut import CUT, gem_cut  # noqa: E402

EPS = 1e-3          # penetration tolerance, world units (stone radius = 1)
MERGE_DOT = 0.99999985   # ~0.03 deg: two triangles on the same facet plane
MERGE_D = 2e-3


def plane(a, b, c):
    """Outward facet plane through a triangle. The origin is inside the stone, so outward ⇔ d < 0;
    a triangle centroid lies ON its own plane and therefore cannot give the sign."""
    u = [b[i] - a[i] for i in range(3)]
    v = [c[i] - a[i] for i in range(3)]
    n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    L = math.sqrt(sum(x * x for x in n))
    if L < 1e-12:
        return None
    n = [x / L for x in n]
    d = -(n[0] * a[0] + n[1] * a[1] + n[2] * a[2])
    if d > 0:
        n, d = [-x for x in n], -d
    return n, d


def audit(cut=CUT):
    pos, cells = gem_cut(cut)
    planes = []
    for tri in cells:
        p = plane(pos[tri[0]], pos[tri[1]], pos[tri[2]])
        if p is None:
            continue
        for q in planes:
            if (q[0][0] * p[0][0] + q[0][1] * p[0][1] + q[0][2] * p[0][2]) > MERGE_DOT and abs(q[1] - p[1]) < MERGE_D:
                break
        else:
            planes.append(p)

    worst, violations, outside = 0.0, 0, 0
    for v in pos:
        n_out = 0
        for n, d in planes:
            s = n[0] * v[0] + n[1] * v[1] + n[2] * v[2] + d
            if s > EPS:
                n_out += 1
                worst = max(worst, s)
        violations += n_out
        if n_out:
            outside += 1
    return dict(verts=len(pos), tris=len(cells), facet_planes=len(planes),
                vertex_plane_violations=violations, verts_outside=outside,
                max_penetration=round(worst, 4), convex=violations == 0)


def main():
    res = audit(CUT)
    print(json.dumps(res))
    out = None
    if "--json" in sys.argv:
        out = sys.argv[sys.argv.index("--json") + 1]
        with open(out, "w") as f:
            json.dump(res, f, indent=1)
    if not res["convex"]:
        print("FAIL not convex: %d violations, %d/%d verts outside, max penetration %.4f"
              % (res["vertex_plane_violations"], res["verts_outside"], res["verts"], res["max_penetration"]))
        sys.exit(1)
    print("CONVEX OK planes=%d verts=%d tris=%d" % (res["facet_planes"], res["verts"], res["tris"]))


if __name__ == "__main__":
    main()
