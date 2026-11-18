#!/usr/bin/env python3
"""ADAM/SHARED — prototype/gems/exitmap_gate.py · brute-force equivalence gate for the exit-facet candidate table.

[plan:2026-10-03_144222-gem-realism-round2.md#eval-m1] · lane L2 (proof). Independent of the bake: this file
re-derives the plane set from gem_cut.py + the JS dedupe and then ray-casts every trial by hand, so a bake
that is wrong in the same way as the runtime cannot pass it.

TABLE CONTRACT (frozen, do not rename)
  prototype/gems/exitmap.json  {grid:[nAz,nEl], cellBytes, facets, k, cutHash, cellOrder}
  prototype/gems/exitmap.bin   facets*nAz*nEl*cellBytes bytes; per facet, per el row, per az column:
                               k uint8 plane indices ASCENDING, zero padded, then one uint8 count.
  cellBytes == k+1.  facet index == plane index (170 planes).

WHAT IS CHECKED
  For each trial: a facet picked uniformly, a STRICTLY interior point on one of its merged triangles, and a
  direction uniformly inside a uniformly random grid cell. The trial then DROPS plane indices (the trial
  facet always, plus one uniformly random plane in --skip-mode random), ray-casts every remaining plane with
  the frozen scan semantics, and asserts the winning plane index is stored in that (facet, az cell, el cell)
  candidate set. Any mismatch is a contract violation, so the gate exits 1. Nothing is skipped or narrowed
  to make a table pass: the reported rate is the answer.

  Equality is exact index equality; arithmetic is float32 end to end (the GPU's highp float). The plane set
  is deduped in float64 over float32 vertices because that is exactly what gem-facets.js:30-51 does (JS
  numbers over a Float32Array); it is then cast to float32, which is what the shader receives.

USAGE
  python3 exitmap_gate.py --table prototype/gems/exitmap.json --samples 10000000 --skip-mode random
  python3 exitmap_gate.py --table prototype/gems/exitmap.json --samples 1000000 --skip-mode both --corrupt
  python3 exitmap_gate.py --build-synthetic --outdir <scratch> --grid 64x32 --ks 128,64,32,16,8 --top 96

WHAT THE TRIAL NEEDS TO BE FAIR (both learned from a 92 %-mismatch run against an honestly-baked table)
  · the start point must be STRICTLY INTERIOR. `interior_points` pushes each barycentric point 2e-3 along −n
    and verifies max(n·p + d) <= −1e-4. Left on the triangle (its centroid measures max(n·p+d) = −3.6e-9) the
    ray starts on the surface, the entry facet is rejected at t ≈ 0 or a far plane wins, and ~92 % of trials
    disagree with any table baked from interior points. Zero cell round-trip drift with a 92 % hole rate is
    the signature: it is the start point, not the mapping.
  · the table's cellOrder must be a real permutation of facet/az/el. A guessed layout reads 99.6 % of the
    cells from the wrong byte slot (measured: 86 700 of 87 040 cells differ between facet,el,az and
    facet,az,el). load_table now refuses an unrecognised label instead of defaulting to one.

WHAT THE CONTRACT IMPLIES FOR k (this cut, 32x16, 170 planes, entry mode, union of the top-R per
(point, direction) over the cell's direction samples)
  The winner is sensitive to WHICH interior point of the facet the ray starts at, so a cell's exact candidate
  set is far larger than a winner/runner-up pair — and the misses are thin (point, direction) slivers, not
  near-ties: every surviving failure has the true winner at rank 1 with a t-gap of 7e-4 … 2e-1 over the best
  stored plane. Measured at 10^5 trials (10^6 where noted):
    points  4 → k 34, 0.759 %      16 → k 41, 0.115 %      64 → k 47, 0.008 %      256 → k 49, 0.003 %
    ranks   8 at 64 points → k 57, 0.0010 % (10 of 10^6)      32 at 64 points → k 76, 0.0001 % (1 of 10^6)
    dirs    5x5 at 64 points → k 49, 0.005 %
  Interior points are the lever, ranks widen each draw's footprint, direction density buys little. The decay
  flattens (64 → 256 points buys only 2.7x) because a union of samples cannot resolve slivers: the single
  surviving 10^6 failure is a winner that owns 0.164 % of its facet's area at that direction, which 64
  uniform points miss 90 % of the time (2 800 points would hit it 99 % of the time). Closing 10^6 trials by
  sampling alone therefore needs ~10^3-10^4 points per facet and k ≈ 150.
  The only measured zero is the whole plane set: k = 170, 0 of 10^6 (14.9 MB at this grid, and the runtime
  scans 170 planes per bounce, i.e. no saving at all). Pin the start point to the stone origin instead and
  the same grid needs max 5 / mean 1.4, i.e. the k blow-up comes from the facet-wide start point, not the
  direction grid. The gate never relaxes it.

EXIT CODES
  0 = every sampled trial agreed · 1 = at least one mismatch (or --corrupt, by construction)
  2 = the gate could not run (bad table, bad plane count, no detectable corruption site)
"""

import argparse
import hashlib
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)

from gem_cut import CUT, gem_cut  # noqa: E402  (shared mirror of gem-cut.js)

F32 = np.float32
TAU = 2.0 * math.pi
DEG1 = math.cos(math.radians(1.0))     # gem-facets.js COS
DE = 4e-3                              # gem-facets.js DE
NORM_EPS = 1e-9                        # degenerate-triangle cut, gem-facets.js:37
DEN_EPS = 1e-6                         # scan: skip |n.d| below this
T_MIN = 2e-3                           # scan: accept only t greater than this
PLANE_COUNT = 170                      # frozen cut -> 170 planes
DEFAULT_CHUNK = 1 << 14


# ---------------------------------------------------------------------------- plane set
def plane_set(cut=CUT):
    """Reproduce gem-facets.js build() lines 30-51 and return the shader's float32 plane array.

    Returns (planes32 (F,4), stats). stats carries the triangle table grouped by plane: tri_flat (T,3,3),
    counts (F,), offs (F,), so a trial can start on any merged triangle of the facet it picked.
    """
    pos, cells = gem_cut(cut)
    V = np.asarray(pos, dtype=F32).astype(np.float64)      # Float32Array storage, JS float64 math
    ns, ds, groups = [], [], []
    degenerate = 0
    for c in cells:
        a, b, cc = V[c[0]], V[c[1]], V[c[2]]
        u = b - a
        w = cc - a
        n = np.array([u[1] * w[2] - u[2] * w[1],
                      u[2] * w[0] - u[0] * w[2],
                      u[0] * w[1] - u[1] * w[0]], dtype=np.float64)
        ln = math.hypot(n[0], n[1], n[2])
        if ln < NORM_EPS:
            degenerate += 1
            continue
        n = n / ln
        d = -(n[0] * a[0] + n[1] * a[1] + n[2] * a[2])
        if d > 0.0:                                        # origin inside the stone: outward => d < 0
            n = -n
            d = -d
        tri = (c[0], c[1], c[2])
        hit = -1
        for i in range(len(ns)):
            if float(ns[i][0] * n[0] + ns[i][1] * n[1] + ns[i][2] * n[2]) > DEG1 and abs(ds[i] - d) < DE:
                hit = i                                    # first match wins, first-seen order
                break
        if hit >= 0:
            groups[hit].append(tri)
        else:
            ns.append(n)
            ds.append(d)
            groups.append([tri])

    n64 = np.asarray(ns, dtype=np.float64).reshape(len(ns), 3)
    d64 = np.asarray(ds, dtype=np.float64)
    planes32 = np.concatenate([n64, d64[:, None]], axis=1).astype(F32)

    counts = np.array([len(g) for g in groups], dtype=np.int64)
    offs = np.zeros(len(groups), dtype=np.int64)
    if len(groups) > 1:
        offs[1:] = np.cumsum(counts)[:-1]
    tri_flat = np.zeros((int(counts.sum()), 3, 3), dtype=F32)
    for pi, group in enumerate(groups):
        for j, t in enumerate(group):
            tri_flat[offs[pi] + j] = [V[t[0]], V[t[1]], V[t[2]]]
    stats = {"triangles": len(cells), "degenerate": degenerate, "planes": len(ns),
             "counts": counts, "offs": offs, "tri_flat": tri_flat}
    return planes32, stats


# ---------------------------------------------------------------------------- scan
def scan(d, p, planes, skip_a=None, skip_b=None):
    """Frozen scan semantics, vectorised over rows, float32 throughout.

    d, p: (M,3) float32. planes: (F,4) float32. skip_a/skip_b: (M,) int64 plane indices to drop.
    Returns (M,) int64 winner index, -1 where no plane is acceptable.
    """
    n3 = np.ascontiguousarray(planes[:, :3])
    pd = np.ascontiguousarray(planes[:, 3])
    den = d @ n3.T                                          # (M,F) float32
    pn = p @ n3.T
    with np.errstate(divide="ignore", invalid="ignore", over="ignore"):
        t = -(pn + pd) / den
    valid = (np.abs(den) >= F32(DEN_EPS)) & (t > F32(T_MIN))
    valid &= np.isfinite(t)
    rows = np.arange(d.shape[0])
    if skip_a is not None:
        valid[rows, skip_a] = False
    if skip_b is not None:
        valid[rows, skip_b] = False
    t = np.where(valid, t, F32(np.inf))
    w = np.argmin(t, axis=1)                                # first minimum = strict-less-than tie rule
    no = ~np.isfinite(t[rows, w])
    return np.where(no, -1, w).astype(np.int64)


def scan_top(d, p, planes, top):
    """The `top` nearest acceptable planes per row, ascending in t (same skip/finite rules as scan).

    Returns (idx (M,top) int64, t (M,top) float32) with t = +inf where a slot is unused.
    """
    n3 = np.ascontiguousarray(planes[:, :3])
    pd = np.ascontiguousarray(planes[:, 3])
    den = d @ n3.T
    pn = p @ n3.T
    with np.errstate(divide="ignore", invalid="ignore", over="ignore"):
        t = -(pn + pd) / den
    valid = (np.abs(den) >= F32(DEN_EPS)) & (t > F32(T_MIN))
    valid &= np.isfinite(t)
    t = np.where(valid, t, F32(np.inf))
    F = planes.shape[0]
    kk = int(min(top, F))
    if kk < F:
        idx = np.argpartition(t, kk - 1, axis=1)[:, :kk]
    else:
        idx = np.tile(np.arange(F), (d.shape[0], 1))
    tt = np.take_along_axis(t, idx, axis=1)
    order = np.argsort(tt, axis=1, kind="stable")
    return np.take_along_axis(idx, order, axis=1), np.take_along_axis(tt, order, axis=1)



def cells_of(d, nAz, nEl):
    """Direction -> (az cell, el cell) per the frozen formula, clamped into range."""
    az = np.arctan2(d[:, 2], d[:, 0]).astype(F32)
    az = np.where(az < F32(0), az + F32(TAU), az)
    iaz = np.floor((az * F32(nAz)) / F32(TAU)).astype(np.int64)
    np.clip(iaz, 0, nAz - 1, out=iaz)
    el = np.arcsin(np.clip(d[:, 1], F32(-1), F32(1))).astype(F32)
    iel = np.floor(((el + F32(math.pi / 2)) * F32(nEl)) / F32(math.pi)).astype(np.int64)
    np.clip(iel, 0, nEl - 1, out=iel)
    return iaz, iel


def dir_in_cell(caz, cel, faz, fel, nAz, nEl):
    """Direction at fractional position (faz, fel) inside cell (caz, cel)."""
    az = (np.asarray(caz, dtype=np.float64) + faz) * (TAU / nAz)
    el = -math.pi / 2.0 + (np.asarray(cel, dtype=np.float64) + fel) * (math.pi / nEl)
    return np.stack([np.cos(el) * np.cos(az), np.sin(el), np.cos(el) * np.sin(az)], axis=1).astype(F32)


def interior_points(rng, m, gid_f, stats, planes):
    """STRICTLY interior start points: a uniformly chosen merged triangle of the facet, Dirichlet(1)
    barycentrics, then pushed in along the facet normal until every plane has n·p + d <= -1e-4.

    A point left ON the triangle is on the solid's surface. The exit scan then rejects the entry facet at
    t ~ 0 and returns a far plane for every direction that leaves the solid through that facet — i.e. about
    half of all trials — so a table baked from interior points can never match a surface-point gate. The
    inset must be re-derived here, independently of the bake, or this gate stops being a check.
    """
    counts, offs, tri_flat = stats["counts"], stats["offs"], stats["tri_flat"]
    local = (rng.random(m) * counts[gid_f]).astype(np.int64)
    np.minimum(local, counts[gid_f] - 1, out=local)
    tri = tri_flat[offs[gid_f] + local]
    g = rng.exponential(1.0, (m, 3)).astype(F32)
    gsum = g.sum(axis=1, keepdims=True)
    p = ((g[:, 0:1] * tri[:, 0, :] + g[:, 1:2] * tri[:, 1, :] + g[:, 2:3] * tri[:, 2, :]) / gsum).astype(F32)
    return push_inside(p, planes[gid_f, :3], planes)


def push_inside(p, nrm, planes, floor=F32(-1e-4)):
    """Slide each point along −nrm by 2e-3 / 1e-3 / 5e-4 until it is strictly inside every plane.

    Returns the moved points; raises it the stone has no interior at that site (a real geometry fault).
    """
    n3 = np.ascontiguousarray(planes[:, :3])
    pd = np.ascontiguousarray(planes[:, 3])
    q = p.copy()
    need = np.ones(p.shape[0], dtype=bool)
    for eps in (F32(2e-3), F32(1e-3), F32(5e-4)):
        cand = (p - nrm * eps).astype(F32)
        res = (cand @ n3.T + pd).max(axis=1)
        ok = need & (res <= floor)
        q[ok] = cand[ok]
        need &= ~ok
        if not need.any():
            break
    if need.any():
        raise SystemExit("gate: %d trial point(s) could not be pushed strictly inside the solid" % int(need.sum()))
    return q


# ---------------------------------------------------------------------------- table io
ORDER_STOPWORDS = {"major", "minor", "order", "cell", "cells", "row", "rows", "then",
                   "fast", "fastest", "slow", "slowest", "inner", "outer", "dim", "dims"}


def parse_order(raw):
    names = {"facet": "facet", "facets": "facet", "f": "facet", "face": "facet",
             "az": "az", "naz": "az", "azimuth": "az", "a": "az",
             "el": "el", "nel": "el", "elevation": "el", "e": "el"}
    toks = []
    if isinstance(raw, str):
        for chunk in raw.replace(">", ",").replace("_", ",").replace("-", ",").replace(" ", ",").split(","):
            chunk = chunk.strip().lower()
            if chunk and chunk not in ORDER_STOPWORDS:
                toks.append(names.get(chunk))
    elif isinstance(raw, (list, tuple)):
        for chunk in raw:
            toks.append(names.get(str(chunk).strip().lower()))
    if len(toks) != 3 or any(t is None for t in toks) or len(set(toks)) != 3:
        return ("facet", "el", "az"), False      # never used: load_table refuses an unrecognised order
    return tuple(toks), True


def load_table(json_path):
    with open(json_path, "r") as fh:
        meta = json.load(fh)
    missing = [key for key in ("grid", "cellBytes", "facets", "k", "cellOrder") if key not in meta]
    if missing:
        raise SystemExit("table json is missing keys: %s" % ", ".join(missing))
    nAz, nEl = int(meta["grid"][0]), int(meta["grid"][1])
    k = int(meta["k"])
    cell_bytes = int(meta["cellBytes"])
    facets = int(meta["facets"])
    order, recognised = parse_order(meta.get("cellOrder"))
    if not recognised:
        raise SystemExit("cellOrder %r is not a permutation of facet/az/el — refusing to guess the byte "
                         "layout (a wrong guess reads %d of %d cells from the wrong slot)"
                         % (meta.get("cellOrder"), nAz * nEl - (1 if nAz * nEl else 0), nAz * nEl))
    if cell_bytes != k + 1:
        raise SystemExit("cellBytes %d != k+1 (%d)" % (cell_bytes, k + 1))
    if not 1 <= k <= 254:
        raise SystemExit("k %d outside 1..254" % k)
    if nAz < 1 or nEl < 1:
        raise SystemExit("degenerate grid %dx%d" % (nAz, nEl))
    bin_path = os.path.splitext(os.path.abspath(json_path))[0] + ".bin"
    if not os.path.exists(bin_path):
        alt = os.path.join(os.path.dirname(os.path.abspath(json_path)), "exitmap.bin")
        if os.path.exists(alt):
            bin_path = alt
    if not os.path.exists(bin_path):
        raise SystemExit("no .bin next to %s" % json_path)
    raw = np.fromfile(bin_path, dtype=np.uint8)
    need = facets * nAz * nEl * cell_bytes
    if raw.size != need:
        raise SystemExit("%s is %d bytes, contract wants %d (%d facets x %d az x %d el x %d)"
                         % (bin_path, raw.size, need, facets, nAz, nEl, cell_bytes))
    dims = {"facet": facets, "az": nAz, "el": nEl}
    cells = raw.reshape(tuple(dims[name] for name in order) + (cell_bytes,))
    return {"meta": meta, "nAz": nAz, "nEl": nEl, "k": k, "cellBytes": cell_bytes,
            "facets": facets, "order": order, "order_recognised": recognised,
            "dims": dims, "cells": cells, "flat": cells.reshape(-1, cell_bytes),
            "bin": bin_path, "json": os.path.abspath(json_path)}


def gather(table, facet, iel, iaz):
    idx = {"facet": facet, "el": iel, "az": iaz}
    return table["cells"][tuple(idx[name] for name in table["order"])]


def count_unsorted(table):
    """Cells whose stored indices are not strictly ascending, or whose count exceeds k."""
    k = table["k"]
    sel = table["flat"][:, :k]
    cnt = table["flat"][:, k].astype(np.int64)
    if k < 2:
        return int(np.count_nonzero(cnt > k))
    steps = np.diff(sel, axis=1) > 0                        # (cells, k-1)
    inside = np.arange(k - 1)[None, :] < (cnt - 1)[:, None] # steps that must be ascending
    bad_rows = (~(steps | ~inside)).any(axis=1)
    return int(np.count_nonzero(bad_rows) + np.count_nonzero(cnt > k))


def cut_hash():
    """sha256 of every cut source a table can legitimately claim: the JS cut, and the Python mirror the bake
    hashes. A table is only verifiable if its cutHash equals one of these."""
    out = {}
    for rel in ("src/components/GemReward/gem-cut.js", "prototype/gems/gem-cut.js", "prototype/gems/gem_cut.py"):
        path = os.path.join(ROOT, rel)
        if os.path.exists(path):
            with open(path, "rb") as fh:
                out[rel] = hashlib.sha256(fh.read()).hexdigest()
    return out


# ---------------------------------------------------------------------------- sweep
def sweep(table, planes, stats, mode, samples, seed=20261118, chunk=DEFAULT_CHUNK, quiet=False):
    """`samples` trials in one skip mode. Returns a result dict including the first three failing tuples."""
    nAz, nEl, k, F = table["nAz"], table["nEl"], table["k"], table["facets"]
    rng = np.random.default_rng(seed)
    rows_k = np.arange(k)
    fails = no_win = cell_drift = short_set = over_k = empty_cells = 0
    truncated_fails = missing_fails = 0
    examples = []
    done = 0
    while done < samples:
        m = int(min(chunk, samples - done))
        facet = rng.integers(0, F, m)
        p = interior_points(rng, m, facet, stats, planes)
        caz = rng.integers(0, nAz, m)
        cel = rng.integers(0, nEl, m)
        d = dir_in_cell(caz, cel, rng.random(m), rng.random(m), nAz, nEl)
        iaz, iel = cells_of(d, nAz, nEl)
        cell_drift += int(np.count_nonzero((iaz != caz) | (iel != cel)))
        skip_b = rng.integers(0, F, m).astype(np.int64) if mode == "random" else None
        w = scan(d, p, planes, facet, skip_b)
        no_win += int(np.count_nonzero(w < 0))
        sel = gather(table, facet, iel, iaz)
        cnt = sel[:, k].astype(np.int64)
        over_k += int(np.count_nonzero(cnt > k))
        empty_cells += int(np.count_nonzero(cnt == 0))
        short_set += int(np.count_nonzero(cnt < k))
        safe_w = np.where(w < 0, 0, w)
        hit = ((sel[:, :k] == safe_w[:, None]) & (rows_k[None, :] < cnt[:, None])).any(axis=1)
        bad = (w >= 0) & (~hit)
        nb = int(np.count_nonzero(bad))
        if nb:
            fails += nb
            full = cnt >= k
            truncated_fails += int(np.count_nonzero(bad & full))
            missing_fails += int(np.count_nonzero(bad & (~full)))
            for i in np.nonzero(bad)[0]:
                if len(examples) >= 3:
                    break
                examples.append({"facet": int(facet[i]), "az": int(iaz[i]), "el": int(iel[i]),
                                 "winner": int(w[i]), "count": int(cnt[i])})
        done += m
        if not quiet and samples >= 8 * chunk and done % (chunk * 32) == 0:
            print("  %s: %d / %d trials, %d failing" % (mode, done, samples, fails), file=sys.stderr)
    return {"mode": mode, "samples": samples, "fails": fails,
            "rate": fails / float(samples) if samples else 0.0,
            "truncated_fails": truncated_fails, "missing_fails": missing_fails,
            "no_win": no_win, "cell_roundtrip_mismatch": cell_drift,
            "count_lt_k": short_set, "count_gt_k": over_k, "empty_cells": empty_cells,
            "examples": examples}


def report(res):
    print("[%s] samples %d  mismatches %d  rate %.6f%%"
          % (res["mode"], res["samples"], res["fails"], 100.0 * res["rate"]))
    print("    mismatches: count>=k (table truncated) %d · count<k (table hole) %d"
          % (res["truncated_fails"], res["missing_fails"]))
    print("    no acceptable plane %d · cell round-trip drift %d · count<k cells %d · count>k %d · empty cells %d"
          % (res["no_win"], res["cell_roundtrip_mismatch"], res["count_lt_k"], res["count_gt_k"],
             res["empty_cells"]))
    if res["examples"]:
        print("    first failing tuples (facet, az cell, el cell, winner):")
        for e in res["examples"]:
            print("      (%d, %d, %d, %d)   stored count %d"
                  % (e["facet"], e["az"], e["el"], e["winner"], e["count"]))


# ---------------------------------------------------------------------------- corrupt mode
def corrupt_apply(table, planes, stats):
    """Perturb exactly one stored entry, deterministically. Returns (info, corrupted flat buffer).

    Picks the first (facet, el, az) in raster order whose stored set really does contain the brute-force
    winner for that cell's centre direction from the facet centroid; removes that winner and inserts the
    smallest absent plane index, so a check at that exact site must fail afterwards.
    """
    nAz, nEl, k, F = table["nAz"], table["nEl"], table["k"], table["facets"]
    gid = np.arange(F * nEl * nAz)
    gid_az = gid % nAz
    gid_el = (gid // nAz) % nEl
    gid_f = gid // (nAz * nEl)
    tri = stats["tri_flat"][stats["offs"][gid_f]]
    p = ((tri[:, 0, :] + tri[:, 1, :] + tri[:, 2, :]) / F32(3.0)).astype(F32)
    p = push_inside(p, planes[gid_f, :3], planes)
    d = dir_in_cell(gid_az, gid_el, 0.5, 0.5, nAz, nEl)
    w = scan(d, p, planes, None, None)
    sel = gather(table, gid_f, gid_el, gid_az)
    cnt = sel[:, k].astype(np.int64)
    safe = np.where(w < 0, 0, w)
    hit = ((sel[:, :k] == safe[:, None]) & (np.arange(k)[None, :] < cnt[:, None])).any(axis=1)
    cand = np.nonzero((w >= 0) & hit & (cnt >= 1))[0]
    if cand.size == 0:
        raise SystemExit("corrupt mode found no cell whose stored set contains the true winner")
    key = gid_el[cand].astype(np.int64) * (nAz * F) + gid_az[cand].astype(np.int64) * F + gid_f[cand]
    pick = int(cand[int(np.argmin(key))])                   # raster order: el, then az, then facet
    f0, a0, e0, w0 = int(gid_f[pick]), int(gid_az[pick]), int(gid_el[pick]), int(w[pick])
    have = [int(v) for v in sel[pick, :cnt[pick]]]
    repl = next((i for i in range(F) if i not in have), None)
    drop = repl is None                                    # a full set: remove the winner instead
    new_set = [i for i in have if i != w0] + ([] if drop else [repl])
    new_set = sorted(dict.fromkeys(new_set))[:k]
    if w0 in new_set:
        raise SystemExit("internal: corruption did not remove the true winner")
    flat = table["flat"].copy()
    coords = tuple({"facet": f0, "az": a0, "el": e0}[name] for name in table["order"])
    row = int(np.ravel_multi_index(coords, tuple(table["dims"][name] for name in table["order"])))
    slot = have.index(w0)
    flat[row, :] = 0
    flat[row, :len(new_set)] = new_set
    flat[row, k] = len(new_set)
    info = {"facet": f0, "az": a0, "el": e0, "winner": w0, "replacement": repl,
            "was": have, "now": new_set, "row": row, "slot": slot, "drop": drop,
            "byte_offset": row * table["cellBytes"] + slot}
    return info, flat


def write_corrupt_copy(table, info, flat, outdir):
    os.makedirs(outdir, exist_ok=True)
    bin_path = os.path.join(outdir, "exitmap.bin")
    flat.astype(np.uint8).tofile(bin_path)
    meta = dict(table["meta"])
    meta["corrupt"] = {"facet": info["facet"], "az": info["az"], "el": info["el"],
                       "replaced": info["winner"], "with": info["replacement"],
                       "byteOffset": info["byte_offset"]}
    json_path = os.path.join(outdir, "exitmap.json")
    with open(json_path, "w") as fh:
        json.dump(meta, fh, indent=1)
    return json_path, bin_path


def forced_probe(table, planes, stats, facet, az, el):
    """The exact trial a corruption site is chosen with: facet centroid -> that cell's centre direction.

    Returns (winner, az cell, el cell, stored count, winner present).
    """
    tri = stats["tri_flat"][stats["offs"][facet]]
    p = ((tri[0] + tri[1] + tri[2]) / F32(3.0)).astype(F32).reshape(1, 3)
    p = push_inside(p, planes[facet, :3], planes)
    d = dir_in_cell(np.array([az]), np.array([el]), 0.5, 0.5, table["nAz"], table["nEl"])
    w = int(scan(d, p, planes, np.array([facet]), None)[0])
    iaz, iel = cells_of(d, table["nAz"], table["nEl"])
    sel = gather(table, np.array([facet]), iel, iaz)[0]
    k = table["k"]
    cnt = int(sel[k])
    present = bool(w >= 0 and (sel[:k][:cnt] == w).any())
    return w, int(iaz[0]), int(iel[0]), cnt, present


# ---------------------------------------------------------------------------- synthetic table
def build_synthetic(outdir, nAz, nEl, ks, seed=20261118, fracs=(1e-3, 0.25, 0.5, 0.75, 0.999),
                    point_draws=2, top=32):
    """Brute-force truth for a synthetic table, written at each requested k. No bake involved.

    The candidate set of a cell is the union over dense (point, direction) draws of the `top` nearest planes
    by t, not just the winner: the winner of a sqrt-ray is sensitive to which interior point of the facet the
    ray starts at, so a list that only holds observed winners still misses winners under a finer sweep (a
    top-1 50-draw sweep measured a 1.65% hole rate against this gate). Unioning near ties makes the set a
    SUPERSET of every winner — which is exactly what the contract asks the list to be — and its size is the k
    an exact table needs.
    """
    planes, stats = plane_set()
    F = stats["planes"]
    G = F * nEl * nAz
    gid = np.arange(G)
    gid_az = gid % nAz
    gid_el = (gid // nAz) % nEl
    gid_f = gid // (nAz * nEl)
    rng = np.random.default_rng(seed)
    bits = np.zeros((G, F), dtype=bool)                     # per cell: union of near-tie planes
    wins = np.zeros(0, dtype=np.int32)                      # (cell, winner) code per draw, for ranking
    trials = 0
    for faz in fracs:
        for fel in fracs:
            for _ in range(point_draws):
                p = interior_points(rng, G, gid_f, stats, planes)
                d = dir_in_cell(gid_az, gid_el, faz, fel, nAz, nEl)
                idx, tt = scan_top(d, p, planes, top)
                live = np.isfinite(tt)
                bits[gid[:, None], idx] |= live
                wins = np.concatenate([wins, (gid[live[:, 0]] * F + idx[live[:, 0], 0]).astype(np.int32)])
                trials += int(G)
    rows, cols = np.nonzero(bits)                            # C order: already grouped by cell
    sizes = np.diff(np.searchsorted(rows, np.arange(G + 1)))
    print("[synthetic] truth sweep %d trials over %d (facet, cell) pairs, top-%d by t · %d (cell, plane) pairs"
          % (trials, G, top, rows.size))
    print("[synthetic] candidate-set size per cell: max %d mean %.2f · cells >16 %d · >8 %d · >32 %d"
          % (int(sizes.max()), float(sizes.mean()), int((sizes > 16).sum()), int((sizes > 8).sum()),
             int((sizes > 32).sum())))
    codes, freq = np.unique(wins, return_counts=True)       # how often each (cell, plane) actually wins
    member_codes = rows.astype(np.int64) * F + cols
    pos = np.searchsorted(codes, member_codes)
    freq_m = np.where(codes[np.minimum(pos, codes.size - 1)] == member_codes, freq[np.minimum(pos, codes.size - 1)], 0)
    print("[synthetic] winners observed per cell: %d of %d (cell, plane) pairs win at least once; max "
          "win count %d" % (codes.size, rows.size, int(freq.max())))
    hashes = cut_hash()
    rel = next((r for r in ("prototype/gems/gem_cut.py", "src/components/GemReward/gem-cut.js",
                            "prototype/gems/gem-cut.js") if r in hashes), None)
    ch = hashes.get(rel)
    written = []
    for k in ks:
        k = int(k)
        path = os.path.join(outdir, "exitmap_k%d" % k)
        os.makedirs(path, exist_ok=True)
        if sizes.max() <= k:
            m_rows, m_cols = rows, cols                   # exact: every candidate fits, already ascending
        else:                                             # a real table must choose: most frequent winners first
            cap = int(freq_m.max()) + 1
            key = (rows.astype(np.int64) << 33) | ((cap - freq_m).astype(np.int64) << 8) | cols
            order = np.argsort(key, kind="stable")
            sr, sc = rows[order], cols[order]
            rank = np.arange(sr.size) - np.searchsorted(sr, np.arange(G))[sr]
            keep = rank < k
            sr, sc = sr[keep], sc[keep]
            asc = np.argsort((sr.astype(np.int64) << 33) | sc, kind="stable")
            m_rows, m_cols = sr[asc], sc[asc]             # contract: stored indices ascending
        arr = np.zeros((G, k + 1), dtype=np.uint8)
        b = np.searchsorted(m_rows, np.arange(G + 1))
        slot = np.arange(m_rows.size) - b[m_rows]
        arr[m_rows, slot] = m_cols
        arr[:, k] = np.diff(b)
        arr.tofile(os.path.join(path, "exitmap.bin"))
        meta = {"grid": [nAz, nEl], "cellBytes": k + 1, "facets": F, "k": k,
                "cutHash": ch or "no-gem-cut-js", "cutFile": rel, "cellOrder": "facet,el,az",
                "note": "synthetic truth from exitmap_gate.py --build-synthetic (brute force, not a bake)"}
        with open(os.path.join(path, "exitmap.json"), "w") as fh:
            json.dump(meta, fh, indent=1)
        written.append(os.path.join(path, "exitmap.json"))
        print("[synthetic] k=%2d  %s  truncated cells %d (kept most frequent winners)"
              % (k, os.path.join(path, "exitmap.json"), int((sizes > k).sum())))
    return written, sizes, stats


def build_full(outdir, nAz, nEl):
    """Write a table whose every cell holds the whole plane set (k = F). Under the frozen contract this is the
    only candidate list with zero structural holes: the start point may be anywhere on the facet, so almost
    every plane can win in some (point, direction) sliver of a cell (measured mean 88 of 170 distinct planes
    per cell at 64x32). Useful as the gate's clean-pass fixture and as the bound on where the k curve tops out.
    """
    planes, stats = plane_set()
    F = stats["planes"]
    G = F * nEl * nAz
    arr = np.zeros((G, F + 1), dtype=np.uint8)
    arr[:, :F] = np.arange(F, dtype=np.uint8)
    arr[:, F] = F
    path = os.path.join(outdir, "exitmap_full")
    os.makedirs(path, exist_ok=True)
    arr.tofile(os.path.join(path, "exitmap.bin"))
    hashes = cut_hash()
    rel = next((r for r in ("prototype/gems/gem_cut.py", "src/components/GemReward/gem-cut.js",
                            "prototype/gems/gem-cut.js") if r in hashes), None)
    ch = hashes.get(rel)
    meta = {"grid": [nAz, nEl], "cellBytes": F + 1, "facets": F, "k": F,
            "cutHash": ch or "no-gem-cut-js", "cutFile": rel, "cellOrder": "facet,el,az",
            "note": "all-plane candidate list from exitmap_gate.py --build-full (contract's zero-hole bound)"}
    with open(os.path.join(path, "exitmap.json"), "w") as fh:
        json.dump(meta, fh, indent=1)
    print("[synthetic] full  k=%d  %s" % (F, os.path.join(path, "exitmap.json")))
    return os.path.join(path, "exitmap.json")


# ---------------------------------------------------------------------------- cli
def main(argv=None):
    ap = argparse.ArgumentParser(description="brute-force equivalence gate for the exit-facet candidate table")
    ap.add_argument("--table", default=os.path.join(HERE, "exitmap.json"))
    ap.add_argument("--samples", type=int, default=1000000)
    ap.add_argument("--skip-mode", choices=("entry", "random", "both"), default="random")
    ap.add_argument("--corrupt", action="store_true")
    ap.add_argument("--corrupt-out", default="/Users/irfan/.hermes/cache/scratch/gem-r1/gate/corrupt")
    ap.add_argument("--seed", type=int, default=20261118)
    ap.add_argument("--chunk", type=int, default=DEFAULT_CHUNK)
    ap.add_argument("--build-synthetic", action="store_true")
    ap.add_argument("--build-full", action="store_true",
                    help="write an all-plane (k = 170) fixture: the contract's zero-hole bound")
    ap.add_argument("--outdir", default="/Users/irfan/.hermes/cache/scratch/gem-r1/gate/synthetic")
    ap.add_argument("--grid", default="64x32")
    ap.add_argument("--ks", default="16,8")
    ap.add_argument("--top", type=int, default=32,
                    help="near-tie planes unioned into each synthetic cell set (must be >= the largest k)")
    ap.add_argument("--point-draws", type=int, default=2,
                    help="interior-point draws per (az, el) fraction pair when building the synthetic truth")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)

    if args.build_synthetic:
        nAz, nEl = (int(v) for v in args.grid.lower().split("x"))
        ks = [int(v) for v in args.ks.split(",") if v.strip()]
        build_synthetic(args.outdir, nAz, nEl, ks, seed=args.seed, top=args.top,
                        point_draws=args.point_draws)
        return 0

    if args.build_full:
        nAz, nEl = (int(v) for v in args.grid.lower().split("x"))
        build_full(args.outdir, nAz, nEl)
        return 0

    planes, stats = plane_set()
    print("[planes] %d planes from %d triangles (%d degenerate)"
          % (stats["planes"], stats["triangles"], stats["degenerate"]))
    if stats["planes"] != PLANE_COUNT:
        print("[planes] FAIL: expected exactly %d planes, got %d" % (PLANE_COUNT, stats["planes"]))
        return 2

    if not os.path.exists(args.table):
        print("[table] FAIL: %s does not exist (the bake lane has not landed a table yet)" % args.table)
        return 2
    table = load_table(args.table)
    print("[table] %s" % table["json"])
    print("[table] %s · grid %dx%d · facets %d · k %d · cellBytes %d · cellOrder %s%s"
          % (table["bin"], table["nAz"], table["nEl"], table["facets"], table["k"], table["cellBytes"],
             ",".join(table["order"]),
             "" if table["order_recognised"] else " (unrecognised, defaulted)"))
    claimed = table["meta"].get("cutHash")
    hashes = cut_hash()
    if claimed and hashes:
        hit = [rel for rel, h in hashes.items() if claimed in (h, "sha256:" + h)]
        print("[cut] table %s · %s" % (claimed, ("matches " + hit[0]) if hit
                                       else "matches NO cut source (%s)" % ", ".join(sorted(hashes))))
    else:
        print("[cut] not checkable (table %r, sources %s)" % (claimed, sorted(hashes)))

    if table["facets"] != stats["planes"]:
        print("[table] FAIL: facets %d != plane count %d (facet index must equal plane index)"
              % (table["facets"], stats["planes"]))
        return 2

    unsorted = count_unsorted(table)
    print("[table] cells with non-ascending stored indices or count>k: %d of %d"
          % (unsorted, table["flat"].shape[0]))

    modes = ("entry", "random") if args.skip_mode == "both" else (args.skip_mode,)

    if args.corrupt:
        info, flat = corrupt_apply(table, planes, stats)
        w0, c0az, c0el, cnt0, present0 = forced_probe(table, planes, stats,
                                                      info["facet"], info["az"], info["el"])
        print("[corrupt] clean table forced trial: facet %d az %d el %d -> winner %d, set of %d, present %s"
              % (info["facet"], info["az"], info["el"], w0, cnt0, present0))
        if not present0 or w0 != info["winner"]:
            print("[corrupt] FAIL: the chosen site does not pass on the clean table, cannot attribute a "
                  "mismatch to the perturbation")
            return 2
        json_path, bin_path = write_corrupt_copy(table, info, flat, args.corrupt_out)
        if info["drop"]:
            print("[corrupt] facet %d az %d el %d: dropped plane %d, count %d -> %d (%s byte offset %d, "
                  "slot %d)" % (info["facet"], info["az"], info["el"], info["winner"], len(info["was"]),
                                len(info["now"]), os.path.basename(bin_path), info["byte_offset"],
                                info["slot"]))
        else:
            print("[corrupt] facet %d az %d el %d: plane %d -> %d (%s byte offset %d, slot %d)"
                  % (info["facet"], info["az"], info["el"], info["winner"], info["replacement"],
                     os.path.basename(bin_path), info["byte_offset"], info["slot"]))
        print("[corrupt] set was %d indices %s%s, now %d indices %s%s"
              % (len(info["was"]), info["was"][:10], "…" if len(info["was"]) > 10 else "",
                 len(info["now"]), info["now"][:10], "…" if len(info["now"]) > 10 else ""))
        print("[corrupt] wrote %s" % json_path)
        cor = load_table(json_path)
        w1, c1az, c1el, cnt1, present1 = forced_probe(cor, planes, stats, info["facet"], info["az"], info["el"])
        print("[corrupt] corrupted copy forced trial: winner %d, set of %d, present %s"
              % (w1, cnt1, present1))
        if present1:
            print("[corrupt] FAIL: the forced trial still passes on the corrupted copy")
            return 2
        bad = 0
        for mode in modes:
            res = sweep(cor, planes, stats, mode, args.samples, seed=args.seed, chunk=args.chunk,
                        quiet=args.quiet)
            report(res)
            bad += res["fails"]
        print("[verdict] FAIL (corrupted table: forced trial misses winner %d; sweep mismatches %d)"
              % (w1, bad))
        return 1

    bad = 0
    for mode in modes:
        res = sweep(table, planes, stats, mode, args.samples, seed=args.seed, chunk=args.chunk,
                    quiet=args.quiet)
        report(res)
        bad += res["fails"]
    bad += unsorted
    print("[verdict] %s" % ("FAIL" if bad else "PASS"))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
