#!/usr/bin/env python3
"""audit.py — the round-10 gem audit as one reproducible command.

    python3 prototype/gems/audit.py CAPTUREDIR --stone sapphire --out OUTDIR/audit.json

Computes the four axes of the frozen round-10 audit and prints a compact table:
  P  photo     12 pose cells (2 stones x 3 tilts x 2 spins) against the photographed-stone gates
  S  structure flat plate, proxy r, fringe, straight segments, speckle, coherence (+ jaggedness, clip)
  C  colour    Pearson r(sat,L), achromatic %, mean sat
  V  vision    echoed from the thresholds file (a human read, never measured here)
  R  composite 0.40 P + 0.30 S + 0.15 C + 0.15 V

Every threshold, target, band, weight and detector parameter is read from
audit-thresholds.json — nothing numeric about the gates lives in this file.

CAPTUREDIR layout (either works):
  <dir>/rubric/<stone>/<role>.png + meta.json      and  <dir>/photo/<stone>/<cell>.png
  <dir>/rubric/runs/<stone>/<role>.png             and  <dir>/photo/shots/<stone>/<cell>.png
Also: --refs DIR recomputes the gem-appearance population for the four reference
stones, and --appearance FILE re-checks a stored record against it (the ±1 gate).
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
W = np.array([0.2126, 0.7152, 0.0722])
ROLES = ('front', 'repeat', 'txoff', 'dispoff', 'chart', 'dark', 'nogem', 'proxy', 'noproxy')
COLOUR_KEYS = ('pearson_sat_L', 'achro_pct', 'mean_sat')


# --------------------------------------------------------------------------- io
def load_rgb(path):
    return np.asarray(Image.open(path).convert('RGB'), dtype=np.float64)


def load_thresholds(path):
    with open(path) as f:
        return json.load(f)


def find_dir(root, candidates):
    for rel in candidates:
        p = os.path.join(root, rel) if rel else root
        if os.path.isdir(p):
            return p
    return None


def rubric_dir(root, stone):
    return find_dir(root, [f'rubric/{stone}', f'rubric/runs/{stone}', f'rubric/runs/{stone.lower()}',
                           stone, f'runs/{stone}', ''])


def photo_dir(root, stone):
    return find_dir(root, [f'photo/{stone}', f'photo/shots/{stone}', f'shots/{stone}', stone, ''])


# ------------------------------------------------------------------ photo cells
def stone_mask(a, n):
    mx, mn = a.max(2), a.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6) * 255.0, 0.0)
    m = ((sat > n['mask_sat']) | (mx < n['mask_dark_max'])) & (mx > n['mask_floor'])
    k = int(n['opening_px'])
    m = ndi.binary_opening(m, np.ones((k, k)))
    lab, cnt = ndi.label(m, np.ones((3, 3)))
    if cnt == 0:
        return m
    sizes = ndi.sum(m, lab, range(1, cnt + 1))
    return ndi.binary_fill_holes(lab == (int(np.argmax(sizes)) + 1))


def hue_deg(a):
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mx, mn = a.max(-1), a.min(-1)
    d = np.maximum(mx - mn, 1e-9)
    h = np.zeros_like(mx)
    rc = mx == r
    gc = (mx == g) & ~rc
    bc = (mx == b) & ~rc & ~gc
    h[rc] = ((g[rc] - b[rc]) / d[rc]) % 6
    h[gc] = (b[gc] - r[gc]) / d[gc] + 2
    h[bc] = (r[bc] - g[bc]) / d[bc] + 4
    return h * 60.0


def photo_row(a, name, n):
    m = stone_mask(a, n)
    L = a @ W
    mx, mn = a.max(2), a.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6) * 255.0, 0.0)
    sel = m & (sat > n['hue_sat_min']) & (L < n['hue_L_max'])
    npx = max(int(m.sum()), 1)
    hr = np.deg2rad(hue_deg(a)[sel])
    cm = float(np.rad2deg(np.arctan2(np.sin(hr).mean(), np.cos(hr).mean())) % 360.0) if sel.sum() else 0.0
    return {
        'file': name, 'n': npx,
        'L50': round(float(np.percentile(L[m], 50)), 2),
        'L95': round(float(np.percentile(L[m], 95)), 2),
        'sat': round(float(np.median(sat[m])), 2),
        'hue': round(cm, 2),
        'achro': round(100.0 * float((m & (sat < n['achro_sat_max']) & (L > n['achro_L_min'])).sum()) / npx, 2),
        'glint': round(100.0 * float((m & (L > n['glint_L'])).sum()) / npx, 2),
    }


def cell_file(d, tilt, spin):
    tag = {0: '0', 0.55: '055', -0.55: 'm055'}.get(round(tilt, 2), str(tilt).replace('.', ''))
    hits = []
    for pat in (f'*-t{tag}-s{spin}.png', f't{tag}-s{spin}.png'):
        hits += glob.glob(os.path.join(d, pat))
    hits = sorted({h for h in hits if not os.path.basename(h).startswith('.')})
    pref = [h for h in hits if os.path.basename(h).startswith('main-')]
    return (pref or hits or [None])[0]


def pose_stamp(d, png, stone):
    """Pose read-back: per-cell meta.json first, then a shots index (round-10 layout)."""
    if png is None:
        return None
    side = png[:-4] + '.meta.json'
    if os.path.exists(side):
        with open(side) as f:
            return json.load(f)
    for idx in ('shots.json', 'main-shots.json'):
        for cand in (os.path.join(os.path.dirname(d.rstrip('/')), idx),
                     os.path.join(os.path.dirname(d.rstrip('/')), 'shots', idx),
                     os.path.join(d, idx)):
            if not os.path.exists(cand):
                continue
            with open(cand) as f:
                rows = json.load(f)
            base = os.path.basename(png)
            for r in rows:
                if os.path.basename(r.get('file', '')) == base and r.get('cat') == stone:
                    return r.get('meta')
    return None


def check_pose(stamp, tilt, spin, tol):
    if not stamp:
        return {'stamped': False, 'ok': False, 'why': 'no pose stamp'}
    rot = stamp.get('rot') or []
    x = rot[0].get('x') if rot else stamp.get('rotation_x')
    y = rot[0].get('y') if rot else stamp.get('rotation_y')
    want_y = spin * np.pi / 180.0
    ok_x = x is not None and abs(x - tilt) <= tol['rotation_x']
    ok_y = y is not None and abs(y - want_y) <= tol['rotation_y']
    return {'stamped': True, 'ok': bool(ok_x and ok_y), 'rotation_x': x, 'rotation_y': y,
            'tilt': stamp.get('tilt'), 'tiltT': stamp.get('tiltT'), 'spin': stamp.get('spin'),
            'canvas': stamp.get('canvas'), 'why': 'rotation mismatch' if not (ok_x and ok_y) else ''}


def photo_axis(t, root, stones):
    pt = t['photo']
    gates = pt['gates']
    rows, per = [], {}
    npass = ngate = ngtot = 0
    for stone in stones:
        tg = pt['targets'][stone]
        achro_max = gates['achro_max'][stone]
        gband = gates['glints_band'][stone]
        d = photo_dir(root, stone)
        mine = []
        for cell in t['capture']['photo_cells']:
            tilt, spin = cell['tilt'], cell['spin']
            png = cell_file(d, tilt, spin) if d else None
            pose = check_pose(pose_stamp(d, png, stone), tilt, spin, t['capture']['pose']['tolerance'])
            if png is None:
                mine.append({'stone': stone, 'tilt': tilt, 'spin': spin, 'file': None,
                             'verdict': 'NOT MEASURED', 'pose': pose})
                continue
            m = photo_row(load_rgb(png), os.path.basename(png), pt['recipe']['numbers'])
            dhue = abs(m['hue'] - tg['hue']) % 360.0
            dhue = min(dhue, 360.0 - dhue)
            g = {
                'L50': abs(m['L50'] - tg['L50']) <= gates['L50']['abs'],
                'L95': abs(m['L95'] - tg['L95']) <= gates['L95']['abs'],
                'sat': abs(m['sat'] - tg['sat']) <= gates['sat']['abs'],
                'hue': dhue <= gates['hue']['abs_deg'],
                'achro': m['achro'] <= achro_max,
                'glint': gband[0] <= m['glint'] <= gband[1],
            }
            ok = all(g.values()) and pose['ok']
            npass += 1 if ok else 0
            ngate += sum(1 for v in g.values() if v)
            ngtot += 6
            mine.append({'stone': stone, 'tilt': tilt, 'spin': spin, 'file': m['file'], 'measured': m,
                         'delta': {'L50': round(m['L50'] - tg['L50'], 2),
                                   'L95': round(m['L95'] - tg['L95'], 2),
                                   'sat': round(m['sat'] - tg['sat'], 2),
                                   'hue': round(dhue, 2),
                                   'achro': round(m['achro'] - tg['achro'], 2),
                                   'glint': round(m['glint'] - tg['glints'], 2)},
                         'pass': g, 'verdict': 'PASS' if ok else 'FAIL', 'pose': pose})
        tilts = [r['measured']['L50'] for r in mine if r['spin'] == 0 and 'measured' in r]
        spread = round(max(tilts) - min(tilts), 2) if len(tilts) == 3 else None
        spread_ok = spread is not None and spread <= gates['spread_max']
        per[stone] = {'stone': stone, 'dir': d, 'targets': tg, 'cells': mine, 'spread': spread,
                      'spread_gate': gates['spread_max'], 'spread_pass': spread_ok}
        rows.extend(mine)
    return {
        'stones': per, 'cells': rows, 'targets': pt['targets'],
        'cells_pass': npass, 'cells_total': len(rows),
        'cell_gates_pass': ngate, 'cell_gates_total': ngtot,
        'spread_gates_pass': sum(1 for s in per.values() if s['spread_pass']),
        'spread_gates_total': len(per),
        'score': round(10.0 * npass / max(len(rows), 1), 2),
    }


# -------------------------------------------------------------------- structure
def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return (x * x + y * y) <= r * r + 1e-9


def sat255(a):
    mx, mn = a.max(-1), a.min(-1)
    return np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-12), 0.0) * 255.0


def largest(m):
    l, n = ndi.label(m, np.ones((3, 3), bool))
    if n == 0:
        return m
    sizes = np.bincount(l.ravel())
    sizes[0] = 0
    return l == int(sizes.argmax())


def lab_l8(a):
    c = a / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    M = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = (lin @ M.T) / np.array([0.95047, 1.0, 1.08883])
    eps, k = 216.0 / 24389.0, 24389.0 / 27.0
    f = np.where(xyz > eps, np.cbrt(xyz), (k * xyz + 16.0) / 116.0)
    return (116.0 * f[..., 1] - 16.0) * 2.55


def box(img, k):
    return ndi.uniform_filter(img, size=k, mode='nearest')


def tensor(img, sp, st):
    g = ndi.gaussian_filter(img, sp, mode='nearest')
    ix, iy = np.gradient(g, axis=1), np.gradient(g, axis=0)
    jxx = ndi.gaussian_filter(ix * ix, st, mode='nearest')
    jyy = ndi.gaussian_filter(iy * iy, st, mode='nearest')
    jxy = ndi.gaussian_filter(ix * iy, st, mode='nearest')
    half = 0.5 * (jxx + jyy)
    rad = np.sqrt((0.5 * (jxx - jyy)) ** 2 + jxy ** 2)
    l1, l2 = half + rad, np.maximum(half - rad, 0.0)
    return (l1 - l2) / (l1 + l2 + 1e-12)


def gradmag(img, sp):
    g = ndi.gaussian_filter(img, sp, mode='nearest')
    gx, gy = np.gradient(g, axis=1), np.gradient(g, axis=0)
    return gx, gy, np.hypot(gx, gy)


def nms(gx, gy, g, thr):
    ang = (np.degrees(np.arctan2(gy, gx)) + 180.0) % 180.0
    gp = np.pad(g, 1, mode='constant')
    keep = np.zeros_like(g, bool)

    def shift(dy, dx):
        return gp[1 + dy:1 + dy + g.shape[0], 1 + dx:1 + dx + g.shape[1]]

    b0 = (ang < 22.5) | (ang >= 157.5)
    b1 = (ang >= 22.5) & (ang < 67.5)
    b2 = (ang >= 67.5) & (ang < 112.5)
    b3 = (ang >= 112.5) & (ang < 157.5)
    for mask, (dy1, dx1), (dy2, dx2) in ((b0, (0, -1), (0, 1)), (b1, (-1, 1), (1, -1)),
                                         (b2, (-1, 0), (1, 0)), (b3, (-1, -1), (1, 1))):
        keep |= mask & (g >= shift(dy1, dx1)) & (g > shift(dy2, dx2))
    return keep & (g >= thr)


def chains(ridge):
    l, n = ndi.label(ridge, np.ones((3, 3), bool))
    ys, xs = np.nonzero(ridge)
    out = []
    if len(ys) == 0:
        return out
    by = {}
    for y, x in zip(ys, xs):
        by.setdefault(l[y, x], []).append((x, y))
    for pts in by.values():
        rem = set(pts)
        cur = min(rem, key=lambda p: (p[1], p[0]))
        rem.discard(cur)
        seq = [cur]
        while rem:
            cx, cy = cur
            near = [(p, (p[0] - cx) ** 2 + (p[1] - cy) ** 2) for p in rem
                    if abs(p[0] - cx) <= 1 and abs(p[1] - cy) <= 1]
            if near:
                nxt = min(near, key=lambda t: t[1])[0]
            else:
                cand = [p for p in rem if min(abs(p[0] - cx), abs(p[1] - cy)) == 0
                        and max(abs(p[0] - cx), abs(p[1] - cy)) <= 2]
                if cand:
                    nxt = min(cand, key=lambda p: (p[0] - cx) ** 2 + (p[1] - cy) ** 2)
                else:
                    out.append(np.asarray(seq, float))
                    cur = min(rem, key=lambda p: (p[1], p[0]))
                    rem.discard(cur)
                    seq = [cur]
                    continue
            rem.discard(nxt)
            seq.append(nxt)
            cur = nxt
        out.append(np.asarray(seq, float))
    return [c for c in out if len(c) >= 3]


def fit_resid(p):
    q = p - p.mean(0)
    w, v = np.linalg.eigh(q.T @ q / max(len(p), 1))
    d = v[:, -1]
    nrm = np.array([-d[1], d[0]])
    return np.abs(q @ nrm).max()


def segments(poly, cfg):
    out, n, i = [], len(poly), 0
    while i < n - 2:
        j, best = i + 2, None
        while j <= n:
            seg = poly[i:j]
            if fit_resid(seg) > cfg['max_resid_px']:
                break
            best = (j, float(np.hypot(*(seg[-1] - seg[0]))), seg)
            j += 1
        if best is None:
            i += 1
            continue
        j, ln, seg = best
        if ln >= cfg['min_len_px'] and len(seg) / (ln + 1.0) >= cfg['min_fill']:
            out.append((j, ln))
            i = max(j - 1, i + 1)
        else:
            i += 1
    return out


def count_segments(ridge, mask, cfg):
    tot, segs = 0, []
    for c in chains(ridge & mask):
        for s in segments(c, cfg):
            segs.append(s)
            tot += s[1]
    return len(segs), float(tot)


def jaggedness(ridge, g, mask):
    gp = np.pad(g, 1, mode='edge')
    samples = {'v': [], 'h': []}
    for c in chains(ridge & mask):
        if np.ptp(c[:, 1]) + 1 >= np.ptp(c[:, 0]) + 1:
            fam, paxis = 'v', 1
        else:
            fam, paxis = 'h', 0
        par = c[:, paxis]
        upar, inv = np.unique(par, return_inverse=True)
        if len(upar) < 8 or len(upar) < 0.85 * len(c):
            continue
        pos = np.zeros(len(upar))
        for k in range(len(upar)):
            vals = []
            for x, y in c[inv == k]:
                xi, yi = int(x), int(y)
                if fam == 'v':
                    gm, g0, gpp = gp[yi + 1, xi], gp[yi + 1, xi + 1], gp[yi + 1, xi + 2]
                else:
                    gm, g0, gpp = gp[yi, xi + 1], gp[yi + 1, xi + 1], gp[yi + 2, xi + 1]
                den = gm - 2 * g0 + gpp
                off = 0.0 if abs(den) < 1e-9 else 0.5 * (gm - gpp) / den
                vals.append((x if fam == 'v' else y) + float(np.clip(off, -0.5, 0.5)))
            pos[k] = np.mean(vals)
        samples[fam].append(np.abs(pos[2:] - 2 * pos[1:-1] + pos[:-2]))
    allv = np.concatenate(samples['v'] + samples['h']) if (samples['v'] or samples['h']) else np.array([np.nan])
    return float(np.median(allv)), float(np.percentile(allv, 90))


def support_blocks(mask, k):
    h, w = mask.shape
    ok = np.zeros_like(mask)
    for y in range(0, h - k + 1, k):
        for x in range(0, w - k + 1, k):
            if mask[y:y + k, x:x + k].all():
                ok[y:y + k, x:x + k] = True
    return ok


def shuffle_blocks(L, sup, rng, k):
    h, w = L.shape
    pos = [(y, x) for y in range(0, h - k + 1, k) for x in range(0, w - k + 1, k)
           if sup[y:y + k, x:x + k].all()]
    blocks = [L[y:y + k, x:x + k].copy() for y, x in pos]
    order = rng.permutation(len(blocks))
    out = L.copy()
    for (y, x), oi in zip(pos, order):
        out[y:y + k, x:x + k] = blocks[oi]
    return out


def structure_axis(t, root, stone):
    st = t['structure']
    cfg = st['recipe']
    g = st['gates']
    d = rubric_dir(root, stone)
    need = ('front', 'proxy', 'noproxy', 'txoff', 'dark')
    paths = {n: (os.path.join(d, n + '.png') if d else None) for n in need}
    missing = [n for n, p in paths.items() if not p or not os.path.exists(p)]
    if missing:
        return {'stone': stone, 'dir': d, 'missing': missing, 'verdict': 'NOT MEASURED'}
    img = {n: load_rgb(paths[n]) for n in need}
    L = {n: lab_l8(img[n]) for n in need}
    num = cfg['numbers']
    tx = largest(ndi.binary_fill_holes(sat255(img['txoff']) > num['sil_sat']))
    dk = largest(ndi.binary_fill_holes(sat255(img['dark']) > num['dark_sat']))
    iou_pre = float((tx & dk).sum() / max((tx | dk).sum(), 1))
    mint = ndi.binary_erosion(tx, disk(int(num['erode_radius'])))
    Lf = L['front']
    sd7 = np.sqrt(np.maximum(box(Lf * Lf, 7) - box(Lf, 7) ** 2, 0.0))
    hp = Lf - box(Lf, 5)
    coh = tensor(Lf, cfg['coherence']['sigma_pre'], cfg['coherence']['sigma_t'])
    gx, gy, G = gradmag(Lf, cfg['coherence']['sigma_pre'])
    ridge = nms(gx, gy, G, cfg['segments']['grad_thr'])
    m = mint
    npx = int(m.sum())
    lo, hi = cfg['plate_windows'][0]
    plate = float(((sd7 < num['plate_sd']) & (Lf >= lo) & (Lf <= hi) & m).sum() / npx)
    lo2, hi2 = cfg['plate_windows'][1]
    broad = float(((sd7 < num['plate_sd']) & (Lf >= lo2) & (Lf <= hi2) & m).sum() / npx)
    speck = float(((np.abs(hp) > num['speckle_hp']) & (coh < num['speckle_coh']) & m).sum() / npx)
    edge = (G >= num['edge_grad']) & m
    ctrl = m & (ndi.distance_transform_edt(~edge) > num['ctrl_dist'])
    rb = np.abs(img['front'][..., 0] - img['front'][..., 2])
    fringe = float(rb[edge].mean() - rb[ctrl].mean())
    sup = support_blocks(m, cfg['segments']['null_block'])
    nseg, _ = count_segments(ridge, m, cfg['segments'])
    nseg_s, _ = count_segments(ridge, sup & m, cfg['segments'])
    rng = np.random.default_rng(cfg['segments']['null_seed'])
    nulls = []
    for _ in range(cfg['segments']['null_draws']):
        Ln = shuffle_blocks(Lf, sup & m, rng, cfg['segments']['null_block'])
        gxn, gyn, gn = gradmag(Ln, cfg['coherence']['sigma_pre'])
        cn, _ = count_segments(nms(gxn, gyn, gn, cfg['segments']['grad_thr']), sup & m, cfg['segments'])
        nulls.append(cn)
    nulls = np.asarray(nulls, float)
    z = float((nseg_s - nulls.mean()) / (nulls.std(ddof=1) + 1e-9))
    a, b = hp[m], (L['proxy'] - box(L['proxy'], 5))[m]
    r_proxy = float(np.corrcoef(a, b)[0, 1])
    c = (L['noproxy'] - box(L['noproxy'], 5))[m]
    r_noproxy = float(np.corrcoef(a, c)[0, 1])
    jag_med, jag_p90 = jaggedness(ridge, G, m)
    vals = {
        'plate_pct': round(100.0 * plate, 2), 'broad_plate_pct': round(100.0 * broad, 2),
        'speckle_pct': round(100.0 * speck, 2), 'fringe_delta': round(fringe, 2),
        'segments': nseg_s, 'seg_z': round(z, 2), 'coherence': round(float(coh[m].mean()), 4),
        'r_proxy': round(r_proxy, 4), 'r_noproxy': round(r_noproxy, 4),
        'jag_median_px': round(jag_med, 4), 'jag_p90_px': round(jag_p90, 4),
        'mask_iou_pre_erode': round(iou_pre, 4), 'interior_px': npx,
        'null_mean': round(float(nulls.mean()), 2), 'null_sd': round(float(nulls.std(ddof=1)), 2),
    }
    verdict = {
        'plate': vals['plate_pct'] <= g['plate_max_pct'],
        'proxy_r': vals['r_proxy'] >= g['proxy_r_min'],
        'fringe': g['fringe_band'][0] <= vals['fringe_delta'] <= g['fringe_band'][1],
        'segments': vals['seg_z'] >= g['seg_z_min'],
        'speckle': vals['speckle_pct'] <= g['speckle_max_pct'],
        'coherence': vals['coherence'] >= g['coherence_min'],
        'broad_plate': vals['broad_plate_pct'] <= g['broad_plate_max_pct'],
        'jaggedness': vals['jag_p90_px'] <= g['jag_p90_max_px'],
    }
    w = st['weights']
    vs = st['verdicts']
    score = 0.0
    half = []
    for k, wt in w.items():
        if verdict[k]:
            v = vs['pass']
        elif k == 'fringe' and vals['fringe_delta'] < g['fringe_band'][0]:
            v = vs['half']
            half.append(k)
        else:
            v = vs['fail']
        score += wt * v
    return {'stone': stone, 'dir': d, 'values': vals, 'pass': verdict, 'half': half,
            'score': round(score / 10.0, 2), 'weighted_pts': round(score, 1)}


# ----------------------------------------------------------------------- colour
def colour_axis(t, root, stone):
    d = rubric_dir(root, stone)
    if not d:
        return {'stone': stone, 'verdict': 'NOT MEASURED'}
    fp, tp = os.path.join(d, 'front.png'), os.path.join(d, 'txoff.png')
    if not (os.path.exists(fp) and os.path.exists(tp)):
        return {'stone': stone, 'verdict': 'NOT MEASURED'}
    cn = t['colour']['recipe']['numbers']
    a = load_rgb(fp).astype(np.float32)
    m = largest(ndi.binary_fill_holes(sat255(load_rgb(tp).astype(np.float32)) > cn['sil_sat']))
    mi = ndi.binary_erosion(m, np.ones((int(cn['erode_px']), int(cn['erode_px']))), iterations=int(cn['erode_iter']))
    L = a @ W
    sat = sat255(a)
    x, y = L[mi], sat[mi]
    r = float(np.corrcoef(x, y)[0, 1])
    achro = float((mi & (sat < cn['achro_sat_max']) & (L > cn['achro_L_min'])).sum() / max(mi.sum(), 1) * 100.0)
    mean_sat = float(y.mean())
    ck = t['colour']['checks']
    verdict = {'pearson_sat_L': r <= ck['pearson_max'], 'achro_pct': achro <= ck['achro_max_pct'],
               'mean_sat': mean_sat >= ck['mean_sat_min']}
    return {'stone': stone, 'values': {'pearson_sat_L': round(r, 3), 'achro_pct': round(achro, 2),
                                       'mean_sat': round(mean_sat, 1)},
            'pass': verdict, 'score': round(10.0 * sum(verdict.values()) / 3.0, 2)}


# ------------------------------------------------------------------------ sheet
def sheet_axis(t, root, stone, outdir, peer=None):
    d = rubric_dir(root, stone)
    if not d:
        return {'verdict': 'NOT MEASURED'}
    dest = os.path.join(outdir, f'score-{stone}.json')
    cmd = [sys.executable, os.path.join(HERE, 'score.py'), d, '--color', stone, '--out', dest, '--quiet']
    if peer:
        cmd += ['--peer', peer]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if not os.path.exists(dest):
        return {'verdict': 'NOT MEASURED', 'error': (res.stderr or res.stdout)[-400:]}
    with open(dest) as f:
        s = json.load(f)
    return {'run_dir': d, 'peer': peer, 'total_of_110': s.get('total_of_110'),
            'total_of_10': s.get('total_of_10'),
            'criteria': [{'id': c['id'], 'score': c['score']} for c in s.get('criteria', [])],
            'notes': s.get('notes', [])}


# ------------------------------------------------------------------- appearance
def crystal_mask(a, spec):
    """Crystal-core population: hue window (wraps through 0), sat floor, L window,
    then the largest connected component. Named per record via `mask: 'crystal'`."""
    h = hue_deg(a)
    lo, hi = spec['hue']
    inside = (h >= lo) | (h <= hi) if lo > hi else (h >= lo) & (h <= hi)
    L = a @ W
    m = inside & (sat255(a) > spec['sat_min']) & (L > spec['L'][0]) & (L < spec['L'][1])
    return largest(ndi.binary_fill_holes(ndi.binary_opening(m, np.ones((3, 3)))))


def crystal_spec(txt, stone):
    blk = re.search(r'\b' + stone + r':\s*\{(.*?)\n\}', txt, re.S)
    if not blk or "mask: 'crystal'" not in blk.group(1):
        return None
    q = re.search(r'crystal:\s*\{\s*hue:\s*\[([0-9.]+),\s*([0-9.]+)\],\s*sat_min:\s*([0-9.]+),'
                  r'\s*L:\s*\[([0-9.]+),\s*([0-9.]+)\]', blk.group(1))
    if not q:
        return None
    v = [float(x) for x in q.groups()]
    return {'hue': [v[0], v[1]], 'sat_min': v[2], 'L': [v[3], v[4]]}


def appearance_row(path, n, crystal=None):
    a = load_rgb(path)
    m = crystal_mask(a, crystal) if crystal else stone_mask(a, n)
    L = a @ W
    sat = sat255(a)
    sel = m if crystal else (m & (sat > n['hue_sat_min']) & (L < n['hue_L_max']))
    npx = max(int(m.sum()), 1)
    hr = np.deg2rad(hue_deg(a)[sel])
    cm = float(np.rad2deg(np.arctan2(np.sin(hr).mean(), np.cos(hr).mean())) % 360.0) if sel.sum() else 0.0
    return {'n': npx, 'hue': round(cm, 2), 'sat': round(float(np.median(sat[m])) / 255.0, 4),
            'l50': round(float(np.percentile(L[m], 50)), 2),
            'l95': round(float(np.percentile(L[m], 95)), 2),
            'achromatic': round(float((m & (sat <= n['achro_sat_max'])).sum()) / npx, 4),
            'glints': round(float((m & (L > n['glint_L'])).sum()) / npx, 4)}


def appearance(t, refs, module=None):
    txt = open(module).read() if module and os.path.exists(module) else ''
    out = {}
    for stone, fname in t['appearance']['files'].items():
        p = os.path.join(refs, fname)
        if os.path.exists(p):
            out[stone] = appearance_row(p, t['appearance']['recipe']['numbers'], crystal_spec(txt, stone))
    if txt:
        tol = t['appearance']['tolerance']
        checks = []
        for stone, rec in out.items():
            blk = re.search(r'\b' + stone + r':\s*\{(.*?)\n\}', txt, re.S)
            if not blk:
                checks.append({'stone': stone, 'error': 'record not found'})
                continue
            body = blk.group(1)
            for fld, key, sc, unit in (('hue', 'hue', 1.0, 'deg'), ('sat', 'sat', 255.0, 'sat'),
                                       ('l50', 'l50', 1.0, 'L'), ('l95', 'l95', 1.0, 'L'),
                                       ('achromatic', 'achromatic', 100.0, 'pp'),
                                       ('glints', 'glints', 100.0, 'pp')):
                mm = re.search(r'\b' + fld + r':\s*([0-9.]+)', body)
                if not mm:
                    checks.append({'stone': stone, 'field': fld, 'error': 'missing'})
                    continue
                stored = float(mm.group(1))
                delta = abs(stored - rec[key]) * sc
                lim = {'deg': tol['hue_deg'], 'sat': tol['sat_255_units'], 'L': tol['L_levels'],
                       'pp': tol['fraction_pp']}[unit]
                checks.append({'stone': stone, 'field': fld, 'stored': stored, 'recomputed': rec[key],
                               'delta': round(delta, 4), 'limit': lim, 'ok': delta <= lim})
        out['_module_check'] = {'module': module, 'checks': checks,
                                'pass': all(c.get('ok') for c in checks if 'ok' in c)}
    return out


# ------------------------------------------------------------------------- main
def fmt(x, n=2):
    return '  n/a' if x is None else f'{x:.{n}f}'


def main(argv=None):
    ap = argparse.ArgumentParser(description='round-10 gem audit')
    ap.add_argument('capturedir', nargs='?', default=None)
    ap.add_argument('--stone', default='sapphire')
    ap.add_argument('--out', default=None)
    ap.add_argument('--thresholds', default=os.path.join(HERE, 'audit-thresholds.json'))
    ap.add_argument('--refs', default=None, help='recompute the gem-appearance population from this refs dir')
    ap.add_argument('--appearance', default=None, help='gem-appearance.js to re-check (with --refs)')
    ap.add_argument('--no-sheet', action='store_true')
    ap.add_argument('--quiet', action='store_true')
    args = ap.parse_args(argv)
    t = load_thresholds(args.thresholds)

    if args.refs:
        res = appearance(t, args.refs, args.appearance)
        if args.out:
            os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
            with open(args.out, 'w') as f:
                json.dump(res, f, indent=2, sort_keys=True)
                f.write('\n')
        print(json.dumps(res, indent=2, sort_keys=True))
        mc = res.get('_module_check')
        return 0 if (mc is None or mc['pass']) else 1

    if not args.capturedir:
        ap.error('CAPTUREDIR is required (or use --refs)')
    outdir = os.path.dirname(os.path.abspath(args.out)) if args.out else os.getcwd()
    os.makedirs(outdir, exist_ok=True)
    stones = [s for s in args.stone.split(',') if s]
    gate_stone = stones[0]

    P = photo_axis(t, args.capturedir, stones)
    S = {s: structure_axis(t, args.capturedir, s) for s in stones}
    C = {s: colour_axis(t, args.capturedir, s) for s in stones}
    if args.no_sheet:
        sheet = {'verdict': 'SKIPPED'}
    else:
        sheet = {}
        for s in stones:
            peer = next((rubric_dir(args.capturedir, o) for o in stones if o != s), None)
            sheet[s] = sheet_axis(t, args.capturedir, s, outdir, peer)
    w = t['composite']['weights']
    p_score = P['score']
    s_score = S[gate_stone].get('score')
    ck = [v for s in stones for v in C[s].get('pass', {}).values()]
    c_score = round(10.0 * sum(1 for v in ck if v) / len(ck), 2) if ck else None
    v_score = round(sum(float(t['vision']['scores'][s]) for s in stones) / len(stones), 2)
    comps = {'P': p_score, 'S': s_score, 'C': c_score, 'V': v_score}
    have = {k: v for k, v in comps.items() if v is not None}
    R = round(sum(w[k] * v for k, v in have.items()), 2) if len(stones) > 1 and len(have) == len(w) else None
    payload = {
        'stones': stones, 'gate_stone': gate_stone, 'capturedir': os.path.abspath(args.capturedir),
        'thresholds': os.path.abspath(args.thresholds),
        'photo': P, 'structure': S, 'colour': C,
        'vision': {'scores': {s: t['vision']['scores'][s] for s in stones}, 'score': v_score,
                   'source': t['vision']['source']},
        'sheet': sheet,
        'composite': {'weights': w, 'parts': comps, 'R': R, 'frozen': t['composite']['frozen']},
    }
    if args.out:
        with open(args.out, 'w') as f:
            json.dump(payload, f, indent=2, sort_keys=True)
            f.write('\n')

    print(f'\n== round-10 audit · {",".join(stones)} ==')
    print(f'{"cell":<18}{"L50":>7}{"L95":>7}{"sat":>7}{"hue":>7}{"achro":>7}{"glint":>7}  verdict')
    for r in P['cells']:
        tag = f'{r["stone"][:3]} {r["tilt"]}@{r["spin"]}'
        if 'measured' not in r:
            print(f'{tag:<18}{"  n/a":>7}  NOT MEASURED')
            continue
        m = r['measured']
        print(f'{tag:<18}{m["L50"]:>7.1f}{m["L95"]:>7.1f}{m["sat"]:>7.1f}{m["hue"]:>7.1f}'
              f'{m["achro"]:>7.2f}{m["glint"]:>7.2f}  {r["verdict"]}'
              f'{"" if r["pose"]["ok"] else " (pose " + r["pose"]["why"] + ")"}')
    for s in stones:
        sp = P['stones'][s]
        print(f'{"spread " + s:<18}{fmt(sp["spread"]):>7}  gate <= {sp["spread_gate"]}  '
              f'{"PASS" if sp["spread_pass"] else "FAIL"}')
    print(f'P  {P["cells_pass"]}/{P["cells_total"]} cells · {P["cell_gates_pass"]}/{P["cell_gates_total"]}'
          f' cell gates · spreads {P["spread_gates_pass"]}/{P["spread_gates_total"]}  ->  {P["score"]}/10')
    for s in stones:
        st = S[s]
        if 'values' not in st:
            print(f'S  {s}: NOT MEASURED')
            continue
        v = st['values']
        print(f'S  {s}: plate {v["plate_pct"]}% · broad {v["broad_plate_pct"]}% · speckle {v["speckle_pct"]}% · '
              f'fringe {v["fringe_delta"]:+.1f} · z {v["seg_z"]} · coh {v["coherence"]} · '
              f'r_proxy {v["r_proxy"]:+.3f} · jag p90 {v["jag_p90_px"]}')
        print(f'   verdicts ' + ' '.join(
            f'{k}={"H" if k in st.get("half", []) else ("P" if b else "F")}' for k, b in st['pass'].items())
              + f'  ->  {st["score"]}/10' + ('  (gate stone)' if s == gate_stone else ''))
    for s in stones:
        c = C[s]
        if 'values' in c:
            v = c['values']
            print(f'C  {s}: r(sat,L) {v["pearson_sat_L"]} · achro {v["achro_pct"]}% · '
                  f'mean sat {v["mean_sat"]}  ->  {c["score"]}/10')
    for s in stones:
        sh = sheet.get(s) if isinstance(sheet, dict) else None
        if sh and sh.get('total_of_110') is not None:
            print(f'   sheet {s} {sh["total_of_110"]}/110 ({sh["total_of_10"]})  criteria '
                  + '/'.join(str(c['score']) for c in sh['criteria']))
    print(f'V  {v_score} (vision read, echoed)   C {c_score}   S {s_score} (gate stone)')
    print(f'R  {fmt(R, 2)}   (frozen {t["composite"]["frozen"]["R"]})'
          if R is not None else 'R  n/a   (composite needs both stones and all four axes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
