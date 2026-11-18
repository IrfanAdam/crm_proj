"""ADAM/SHARED — prototype/gems/exitmap_bake.py · bake the F1b exit-facet candidate table."""
# [plan:2026-10-03_144222-gem-realism-round2.md#eval-m1] · L1 bake lane. Theory: AUDIT.md §5.4.
# — The stone is convex, so the exit facet of an interior ray is the argmin of t over the 170 planes and is
# —   PIECEWISE CONSTANT in direction (the spherical Voronoi cells of the plane normals). The bounce loop in
# —   gem-shader-ext.js tr() scans all 170 planes to compute a lookup; this bake stores that lookup as a
# —   conservatively-bounded candidate set per (entry facet, direction cell), scanned with the real argmin.
# — Exactness: a direction quantises to exactly one cell under the floor() rule in cell_of(), so the cell's
# —   OWN 5 sample directions (centre + 4 corners inset by 1 % of the cell) are the complete input for that
# —   cell — no neighbour block. Per (facet, cell, sample direction, interior point) the planes are sorted by
# —   ascending t under the shader's own den/t acceptance with the ENTRY FACET DROPPED (the shader's `i == skip`)
# —   and the first RANKS entries are kept (the winner plus RANKS-1 of drift, covering the shader's second
# —   skip); the stored set is the union over the 5 directions x the facet's interior points. The runtime scans
# —   the set in ASCENDING plane index with the shader's own strict `<`, so the same t, the same hi and the same
# —   normal come back — ties included, because the lower index is stored first.
# — t: n·p + d is PER PLANE (nrm @ p + dval). Using a single direction·point scalar there silently destroys the
# —   ordering for every plane and the table stores plausible-looking garbage; guard: the point-argmin misses
# —   line below must be 0 AND the gate must pass.
# — Arithmetic: numpy float32 everywhere (the GPU is highp float). The plane set reproduces the dedupe of
# —   gem-facets.js build() (lines 30-51) on gem_cut.py's triangles; the count must be 170 or this stops.
# — Output: exitmap.bin (facets · nAz · nEl · (k + 1) bytes, facet-major, then az, then el) + exitmap.json.
# — Usage: python3 exitmap_bake.py --grid 32x16 --ranks 32 --points 64 --dirs 1 --k 76 --out prototype/gems
# —        (the shipped table: k 76, 77 B/cell, 6.70 MB, 1 entry-mode miss in 10^6 trials. Points are the
# —         lever — 4 → 0.759 %, 16 → 0.115 %, 64 → 0.008 % at 10^5 — ranks widen each draw; the residual is
# —         THIN SLIVERS (measured: a winner owning 0.164 % of a facet needs ~2 800 points to be hit 99 % of
# —         the time), so no affordable k is exact. Only k = 170 measured 0 in 10^6.)
import argparse, hashlib, json, math, os, sys

sys.dont_write_bytecode = True                     # no __pycache__ inside the repo
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import gem_cut                                     # the Python mirror of the JS cut (parity_check.py asserts 1e-9)

PLANES_WANTED = 170                                # PLMAX in gem-shader-ext.js:16
COS1, DE = np.float32(math.cos(math.radians(1.0))), np.float32(4e-3)   # gem-facets.js:18
TWO_PI = np.float32(2.0 * math.pi)
PI = np.float32(math.pi)
HALF_PI = np.float32(math.pi / 2.0)
T_MIN = np.float32(2e-3)                           # shader: ti > 2e-3
DEN_EPS = np.float32(1e-6)                         # shader: abs(den) < 1e-6


def build_planes():
    """gem_cut triangles → (N, D, tri_of_facet): the dedupe of gem-facets.js build() in float32."""
    pos, cells = gem_cut.gem_cut()
    P = np.asarray(pos, dtype=np.float32)
    C = np.asarray(cells, dtype=np.int32)
    a, b, c = P[C[:, 0]], P[C[:, 1]], P[C[:, 2]]
    u, w = b - a, c - a
    n = np.cross(u, w).astype(np.float32)
    l = np.linalg.norm(n, axis=1).astype(np.float32)
    keep = l >= np.float32(1e-9)                   # drop degenerate triangles
    idx = np.flatnonzero(keep)
    n = (n[keep] / l[keep, None]).astype(np.float32)
    d = (-(n * a[keep]).sum(axis=1)).astype(np.float32)     # d = -(n·a)
    flip = d > 0                                   # origin is inside: outward normal is the one with d < 0
    n = np.where(flip[:, None], -n, n).astype(np.float32)
    d = np.where(flip, -d, d).astype(np.float32)
    N = np.zeros((len(n), 3), np.float32)
    D = np.zeros(len(n), np.float32)
    tri_of = [[] for _ in range(len(n))]
    count = 0
    for t in range(len(n)):
        hit = -1
        if count:
            ok = (N[:count] @ n[t] > COS1) & (np.abs(D[:count] - d[t]) < DE)   # 1° normal, 4e-3 offset
            win = np.flatnonzero(ok)
            if win.size:
                hit = int(win[0])                  # first match wins, first-seen order preserved
        if hit < 0:
            hit, count = count, count + 1
            N[hit], D[hit] = n[t], d[t]
        tri_of[hit].append(int(idx[t]))
    return N[:count], D[:count], tri_of, P, C


def interior_points(tris, P, C, q=4, rng=None):
    """Facet start points: the deterministic 4 (centroid + 3 barycentric 0.6/0.2/0.2) then `q`-4 uniform
    Dirichlet(1) draws over the facet's merged triangles — the same family the gate trials with."""
    a, b, c = P[C[tris, 0]], P[C[tris, 1]], P[C[tris, 2]]
    third = np.float32(1.0 / 3.0)
    pts = [(a[i] * third + b[i] * third + c[i] * third).astype(np.float32) for i in range(len(tris))]
    bw = (np.float32(0.6), np.float32(0.2), np.float32(0.2))
    for i in range(len(tris)):
        tri = (a[i], b[i], c[i])
        for k in range(3):
            pts.append((tri[k] * bw[0] + tri[(k + 1) % 3] * bw[1] + tri[(k + 2) % 3] * bw[2]).astype(np.float32))
    out, seen = [], set()
    for p in pts:
        key = (round(float(p[0]), 6), round(float(p[1]), 6), round(float(p[2]), 6))
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
        if len(out) == q:
            break
    if len(out) < q:                                   # top up with uniform draws (area-uniform over triangles)
        if rng is None:
            rng = np.random.default_rng(20261118)
        m = q - len(out)
        which = rng.integers(0, len(tris), m)
        g = rng.exponential(1.0, (m, 3)).astype(np.float32)
        g /= g.sum(axis=1, keepdims=True)
        for i in range(m):
            j = int(which[i])
            out.append((g[i, 0] * a[j] + g[i, 1] * b[j] + g[i, 2] * c[j]).astype(np.float32))
    return out


def push_inside(pts, nrm, N, D):
    """Nudge each surface point along −n until every plane has n·x + d < −1e-4 (strictly inside)."""
    out, fallback = [], 0
    for p in pts:
        for q, eps in enumerate((np.float32(2e-3), np.float32(1e-3), np.float32(5e-4))):
            x = (p - nrm * eps).astype(np.float32)
            if float(np.max(N @ x + D)) <= -1e-4:
                out.append(x)
                fallback += q > 0
                break
        else:
            raise SystemExit("interior point could not be pushed strictly inside the solid")
    return out, fallback


def sample_fracs(m):
    """Fractional positions inside a cell: the corners inset 1 %, the centre, and an m x m midpoint grid."""
    f = [0.01, 0.5, 0.99] + [(i + 0.5) / float(m) for i in range(m)]
    return np.unique(np.array(f, np.float32))


def cell_samples(n_az, n_el, m=1):
    """(nAz, nEl, S) sample (az, el) per cell: corner-inset + centre + midpoint grid, S = |fracs|^2."""
    daz = np.float32(TWO_PI / np.float32(n_az))
    dele = np.float32(PI / np.float32(n_el))
    fr = sample_fracs(m)
    fa, fe = np.meshgrid(fr, fr, indexing="ij")
    fa = fa.reshape(-1).astype(np.float32)
    fe = fe.reshape(-1).astype(np.float32)
    az = ((np.arange(n_az, dtype=np.float32)[:, None, None] + fa[None, None, :]) * daz)   # (nAz, 1, S)
    el = ((np.arange(n_el, dtype=np.float32)[None, :, None] + fe[None, None, :]) * dele - HALF_PI)
    az = np.broadcast_to(az, (n_az, n_el, fa.size)).astype(np.float32)
    el = np.broadcast_to(el, (n_az, n_el, fa.size)).astype(np.float32)
    return az, el


def dirs_of(az, el):
    """(az, el) → unit direction, object space: x = cos el cos az, y = sin el, z = cos el sin az."""
    ce = np.cos(el).astype(np.float32)
    return np.stack([(ce * np.cos(az)).astype(np.float32), np.sin(el).astype(np.float32),
                     (ce * np.sin(az)).astype(np.float32)], axis=-1).astype(np.float32)


def cell_of(d, n_az, n_el):
    """The runtime mapping: az ∈ [0,2π), el ∈ [−π/2,π/2]; cells floored and clamped."""
    az = np.arctan2(d[..., 2], d[..., 0]).astype(np.float32)
    az = np.where(az < 0, az + TWO_PI, az).astype(np.float32)
    el = np.arcsin(np.clip(d[..., 1], np.float32(-1), np.float32(1))).astype(np.float32)
    ia = np.floor(az * np.float32(n_az) / TWO_PI).astype(np.int32)
    je = np.floor((el + HALF_PI) * np.float32(n_el) / PI).astype(np.int32)
    return np.clip(ia, 0, n_az - 1), np.clip(je, 0, n_el - 1)


def facet_t(dirs, nrm, dval, p, skip=None):
    """(Ndir, Npl) float32 t of the shader's bounce test for one interior point, ∞ where it does not accept.

    The numerator is the plane's signed offset at the point, n·p + d, ONE PER PLANE. `skip` drops the entry
    facet exactly as the shader's `i == skip` does, so the RANKS slots count real candidates only.
    """
    den = (dirs @ nrm.T).astype(np.float32)
    s = (nrm @ p).astype(np.float32) + dval          # n·p + d per plane, float32 (dirs are unit)
    with np.errstate(divide="ignore", invalid="ignore"):
        t = (-s[None, :] / den).astype(np.float32)
    t[np.abs(den) < DEN_EPS] = np.inf                  # shader: den near 0 → skip
    t[t <= T_MIN] = np.inf                             # shader: ti > 2e-3
    if skip is not None:
        t[:, skip] = np.inf                            # shader: i == skip → continue
    return t


def cell_rows(n_az, n_el, s):
    """(nAz, nEl, s) direction-row ids of each cell's OWN samples — no neighbour cells (floor() is exact)."""
    base = ((np.arange(n_az, dtype=np.int64)[:, None] * n_el
             + np.arange(n_el, dtype=np.int64)[None, :]) * s)        # (nAz, nEl)
    return (base[..., None] + np.arange(s, dtype=np.int64)).astype(np.int64)


def k_table(sizes, upto):
    """Overflow table: for each k, how many (facet, cell) pairs have a union larger than k."""
    parts = []
    for kk in range(1, upto + 1):
        parts.append("k=%d:%d" % (kk, int(np.count_nonzero(sizes > kk))))
    return " ".join(parts)


def main():
    ap = argparse.ArgumentParser(description="bake the gem exit-facet candidate table (F1b)")
    ap.add_argument("--grid", default="32x16", help="nAz x nEl (default 32x16)")
    ap.add_argument("--k", type=int, default=8, help="candidate planes per (facet, cell) (default 8)")
    ap.add_argument("--ranks", type=int, default=4, help="planes kept per (direction, interior point) (default 4)")
    ap.add_argument("--points", type=int, default=4, help="interior start points per facet (default 4)")
    ap.add_argument("--dirs", type=int, default=1,
                    help="direction grid side per cell; 1 = centre + 4 inset corners + 4 inset edge midpoints")
    ap.add_argument("--out", default="prototype/gems", help="output directory")
    ap.add_argument("--chunk", type=int, default=17, help="facets per numpy chunk (memory cap)")
    ap.add_argument("--dry", action="store_true", help="probe only: never write artifacts")
    ap.add_argument("--quiet-table", action="store_true", help="suppress the k-vs-overflow table")
    args = ap.parse_args()
    n_az, n_el = (int(v) for v in args.grid.lower().split("x"))
    k, n_cells, R = args.k, n_az * n_el, args.ranks

    N, D, tri_of, P, C = build_planes()
    print("plane count %d" % len(N))
    if len(N) != PLANES_WANTED:
        raise SystemExit("plane count %d != %d — dedupe does not mirror gem-facets.js; stopping"
                         % (len(N), PLANES_WANTED))
    with open(os.path.join(HERE, "gem_cut.py"), "rb") as fh:
        cut_hash = hashlib.sha256(fh.read()).hexdigest()

    az, el = cell_samples(n_az, n_el, args.dirs)
    S = az.shape[2]
    dirs = dirs_of(az.reshape(-1), el.reshape(-1))          # row = (az-cell * nEl + el-cell) * S + sample
    ia, je = cell_of(dirs, n_az, n_el)
    want_i = np.repeat(np.arange(n_az), n_el * S)
    want_j = np.tile(np.repeat(np.arange(n_el), S), n_az)
    off = int(np.count_nonzero((ia != want_i) | (je != want_j)))
    if off:
        raise SystemExit("%d of %d sample directions do not map back to their own cell; stopping"
                         % (off, dirs.shape[0]))
    rows5 = cell_rows(n_az, n_el, S)

    table = np.zeros((len(N), n_cells, k + 1), np.uint8)
    sizes = np.zeros(len(N) * n_cells, np.int32)
    rng = np.random.default_rng(20261118)                    # only used to top up points beyond the 4 seeded
    miss, checked, npts_all, hist, fallback = 0, 0, 0, {}, 0
    for f0 in range(0, len(N), args.chunk):
        for f in range(f0, min(f0 + args.chunk, len(N))):
            pts, fb = push_inside(interior_points(tri_of[f], P, C, args.points, rng), N[f], N, D)
            fallback += fb
            npts_all += len(pts)
            hist[len(pts)] = hist.get(len(pts), 0) + 1
            # per (interior point, direction): the top-RANKS planes by ascending t, ties by ascending index
            idx_s, ok_s = [], []
            for p in pts:
                t = facet_t(dirs, N, D, p, skip=f)         # (Ndir, Npl) — entry facet dropped, as in the shader
                o = np.argsort(t, axis=1, kind="stable")[:, :R]
                idx_s.append(o.astype(np.uint8))
                ok_s.append(np.isfinite(np.take_along_axis(t, o, axis=1)))
            idx = np.stack(idx_s)                          # (Q, Ndir, R)
            ok = np.stack(ok_s)                            # (Q, Ndir, R) — False where t was ∞
            win = idx[:, :, 0]                             # each (point, direction) point's own argmin
            won_ok = ok[:, :, 0]
            for i in range(n_az):
                for j in range(n_el):
                    r = rows5[i, j]                            # the cell's own 5 sample directions only
                    u = np.unique(idx[:, r, :][ok[:, r, :]])   # union over directions x interior points
                    slot = i * n_el + j
                    sizes[f * n_cells + slot] = u.size
                    if u.size <= k:
                        table[f, slot, :u.size] = u
                        table[f, slot, k] = u.size
                        hit = np.zeros(len(N), bool)           # self-check: each own argmin is in the set
                        hit[u] = True
                        sub, sub_ok = win[:, r], won_ok[:, r]
                        miss += int(np.count_nonzero(~hit[sub] & sub_ok))
                        checked += int(np.count_nonzero(sub_ok))
    req = int(sizes.max()) if sizes.size else 0
    nbytes = len(N) * n_cells * (k + 1)
    print("grid %dx%d  ranks %d  points %d  dirs-m %d  samples/cell %d"
          % (n_az, n_el, R, args.points, args.dirs, S))
    print("k %d" % k)
    print("required_k %d" % req)
    print("union p50 %d  p90 %d  max %d" % (int(np.percentile(sizes, 50)), int(np.percentile(sizes, 90)), req))
    print("union hist %s" % dict(sorted({int(v): int(c) for v, c in
                                        zip(*np.unique(sizes, return_counts=True))}.items())))
    print("total cells %d" % (len(N) * n_cells))
    print("bytes %d" % nbytes)
    print("cutHash %s" % cut_hash)
    print("interior points %d (facets by count %s, deep-fallback %d)" % (npts_all, dict(sorted(hist.items())), fallback))
    print("point-argmin misses %d / %d" % (miss, checked))
    if not args.quiet_table:
        print("overflow-table %s" % k_table(sizes, req))
    if req > k:
        print("required_k %d exceeds k %d — no artifacts written; re-run with --k %d" % (req, k, req))
        return 1
    if args.dry:
        print("dry run — artifacts not written")
        return 0

    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "exitmap.bin"), "wb") as fh:
        fh.write(table.tobytes())
    meta = {"grid": [n_az, n_el], "cellBytes": k + 1, "facets": len(N), "k": k,
            "cutHash": cut_hash, "cellOrder": "facet,az,el"}
    with open(os.path.join(args.out, "exitmap.json"), "w") as fh:
        json.dump(meta, fh, indent=2)
        fh.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
