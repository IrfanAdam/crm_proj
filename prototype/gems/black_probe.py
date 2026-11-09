#!/usr/bin/env python3
"""black_probe.py — the E8/E9 material probe (Task 45), one command, photo + render.

Ports the frozen r18 parent meter (`tools/measure_black.py`, the official numbers
behind the lane-q table and the `7799c05` state) into the repo and adds the
round-19 populations: `grey_ex%` (clip-excluded silver), the 7x7 plate detector,
and the photo side measured with the same metric recipe on the reference photos.

    python3 prototype/gems/black_probe.py RUNDIR [--refs DIR] [--stones a,b,c,d]
                                            [--appearance FILE] [--json OUT]

RUNDIR layout (written by the capture driver):
    <run>/_nogem/n<W>-t<TAG>/clip-0.png      width twin per width and tilt
    <run>/<stone>/c<W>-t<TAG>/clip-0.png     one dir per stone per pose

TAG: `0`, `m015` (-0.15), `0p55` (0.55), `m055`. A nogem twin is matched by
width, then by tilt (exact, else nearest). Pose mismatch is reported, never
silently paired: with a `stamp.json` in the cell dir its tilt/stone is checked
against the dir name and a mismatch is a hard error.

Mask (render, frozen from r18): |L(head) - L(nogem)| > 6, 3x3 closing, holes
filled, largest connected component. Not cropped to the canvas rect, matching
the meter every published number used; `stone_px` is printed beside every row
so a contaminated population cannot pass as a stone.
Mask (photo, frozen from audit-thresholds.json): (sat>25 | max<120) & max>8,
3x3 opening, largest 8-connected component, holes filled.

Populations (both sides):
  L10/L20/L25/L40/L60   % of stone below that luma
  grey%                  sat<22 & L>55              (plain silver; includes clip)
  grey_ex%               sat<22 & 55<L<250          (E9 veto; clip-excluded)
  sat_med                whole-mask median sat, 0..255
  L50/L95                whole-mask L percentiles
  clip                   % L>=254.5
  plate                  % with L in 40..80 and 7x7 sd < 6   (E8 structure)
  hp_sigma               std(L - box3(L))                     (E8 structure)
  rim_core               median 6-px rim / median 10-px core  (E8 grounding)
  crown/band/pav L25,L40 row-band split at the widest row (diagnostic)

Numeric gates live in audit-thresholds.json and the plan's frozen round-19
table; this file carries the meter, not the verdict. Exit 0 on a completed
measurement, 2 on an invalid cell.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
W = np.array([0.2126, 0.7152, 0.0722])
STONES = ('sapphire', 'citrine', 'amethyst', 'redberyl')
TAG_RE = re.compile(r'n?(\d{3,4})-t(m?\d+(?:p\d+)?)$')


def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)


def lum(a):
    return a @ W


def sat255(a):
    mx, mn = a.max(2), a.min(2)
    return (mx - mn) / np.maximum(mx, 1) * 255.0


def tile_mask(head, nog):
    m = np.abs(lum(head) - lum(nog)) > 6
    m = ndi.binary_closing(m, iterations=3)
    m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    if n == 0:
        return m
    sizes = ndi.sum(m, lab, range(1, n + 1))
    return lab == (int(np.argmax(sizes)) + 1)


def photo_mask(a, n):
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


def largest(m):
    lab, n = ndi.label(m)
    if n == 0:
        return m
    sizes = ndi.sum(m, lab, range(1, n + 1))
    return lab == (int(np.argmax(sizes)) + 1)


def crystal_mask(a, spec):
    """Named crystal-core population (redberyl): hue window wraps through 0."""
    h = hue_deg(a)
    lo, hi = spec['hue']
    inside = (h >= lo) | (h <= hi) if lo > hi else (h >= lo) & (h <= hi)
    L = lum(a)
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


def box3(x):
    return ndi.convolve(x, np.ones((3, 3), np.float32) / 9.0, mode='nearest')


def sd7(x):
    """7x7 local standard deviation (nan-free, nearest edge)."""
    k = 7
    mean = ndi.uniform_filter(x, k, mode='nearest')
    sq = ndi.uniform_filter(x * x, k, mode='nearest')
    return np.sqrt(np.maximum(sq - mean * mean, 0))


def metrics(a, st):
    L, sat = lum(a), sat255(a)
    n = max(int(st.sum()), 1)
    ys, xs = np.where(st)
    y0, y1 = int(ys.min()), int(ys.max())
    widest = int(np.argmax(st.sum(1)))
    core = ndi.binary_erosion(st, iterations=10, border_value=0)
    rim = st & ~ndi.binary_erosion(st, iterations=6, border_value=0)
    hp = L - box3(L)
    flat = st & (L > 40) & (L < 80) & (sd7(L) < 6)
    pct = lambda m: round(100.0 * float((m & st).sum()) / n, 2)

    def band(lo, hi, thr):
        mm = st[lo:hi]
        return round(100.0 * float(((L[lo:hi] < thr) & mm).sum()) / max(int(mm.sum()), 1), 2)

    return {
        'stone_px': n, 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
        'L10': pct(L < 10), 'L20': pct(L < 20), 'L25': pct(L < 25),
        'L40': pct(L < 40), 'L60': pct(L < 60),
        'grey': round(100.0 * float(((sat < 22) & (L > 55) & st).sum()) / n, 2),
        'grey_ex': round(100.0 * float(((sat < 22) & (L > 55) & (L < 250) & st).sum()) / n, 2),
        'sat_med': round(float(np.median(sat[st])), 1),
        'L50': round(float(np.percentile(L[st], 50)), 1),
        'L95': round(float(np.percentile(L[st], 95)), 1),
        'clip': pct(L >= 254.5),
        'plate': pct(flat),
        'hp_sigma': round(float(hp[st].std()), 2),
        'rim_core': round(float(np.median(L[rim]) / max(np.median(L[core]), 1e-6)), 3),
        'crown_L25': band(y0, widest - 70, 25), 'band_L25': band(widest - 55, widest + 40, 25),
        'pav_L25': band(widest + 60, y1, 25),
        'crown_L40': band(y0, widest - 70, 40), 'band_L40': band(widest - 55, widest + 40, 40),
        'pav_L40': band(widest + 60, y1, 40),
    }


def parse_tilt(tag):
    if tag.startswith('m'):
        return -float(tag[1:]) / 100.0
    if 'p' in tag:
        a, b = tag.split('p')
        return float(a + '.' + b)
    return float(tag)


def parse_cell(name):
    m = TAG_RE.search(name)
    return (int(m.group(1)), parse_tilt(m.group(2))) if m else (None, None)


def discover(run):
    cells, nogs = [], []
    for p in glob.glob(os.path.join(run, '*', '*', 'clip-0.png')):
        cell = os.path.basename(os.path.dirname(p))
        stone = os.path.basename(os.path.dirname(os.path.dirname(p)))
        w, t = parse_cell(cell)
        if w:
            (nogs if stone == '_nogem' else cells).append(
                {'stone': stone, 'cell': cell, 'png': p, 'w': w, 'tilt': t})
    return cells, nogs


def pick_nog(nogs, w, tilt):
    same = [n for n in nogs if n['w'] == w]
    if not same:
        return None
    return min(same, key=lambda n: abs(n['tilt'] - tilt))


def load_records(path):
    txt = open(path).read()
    out = {}
    for stone in STONES:
        blk = re.search(rf"{stone}:\s*\{{(.*?)\n\s*\}},", txt, re.S)
        if not blk:
            continue
        def f(k):
            m = re.search(rf"{k}:\s*([0-9.]+)", blk.group(1))
            return float(m.group(1)) if m else None
        out[stone] = {'sat': round((f('sat') or 0) * 255.0, 1), 'L50': f('l50'), 'L95': f('l95'),
                      'hue': f('hue')}
    return out


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument('run')
    p.add_argument('--refs', default=os.path.join(HERE, '../../.hermes/tmp/round6/refs'))
    p.add_argument('--stones', default=','.join(STONES))
    p.add_argument('--appearance', default=os.path.join(HERE, '../../src/components/GemReward/gem-appearance.js'))
    p.add_argument('--json')
    p.add_argument('--no-photo', action='store_true')
    a = p.parse_args(argv)
    run = os.path.abspath(a.run)
    thr_path = os.path.join(HERE, 'audit-thresholds.json')
    thr = json.load(open(thr_path))
    pthr = thr['photo']['recipe']['numbers']
    files = thr.get('appearance', {}).get('files', {})
    app_txt = open(a.appearance).read() if os.path.exists(a.appearance) else ''
    recs = load_records(a.appearance) if app_txt else {}

    rows, bad = [], []
    cells, nogs = discover(run)
    for c in sorted(cells, key=lambda x: (x['stone'], x['w'], x['tilt'])):
        nog = pick_nog(nogs, c['w'], c['tilt'])
        if not nog:
            bad.append(f"{c['stone']}/{c['cell']}: no nogem twin at {c['w']}px")
            continue
        stamp_p = os.path.join(os.path.dirname(c['png']), 'stamp.json')
        if os.path.exists(stamp_p):
            st = json.load(open(stamp_p))
            if st.get('gem') not in (None, c['stone']):
                bad.append(f"{c['stone']}/{c['cell']}: stamp says gem={st.get('gem')}")
                continue
            if st.get('tilt') is not None and abs(float(st['tilt']) - c['tilt']) > 1e-6:
                bad.append(f"{c['stone']}/{c['cell']}: stamp tilt {st['tilt']} != dir {c['tilt']}")
                continue
        m = metrics(load(c['png']), tile_mask(load(c['png']), load(nog['png'])))
        m.update({'kind': 'render', 'stone': c['stone'], 'pose': c['cell'],
                  'w': c['w'], 'tilt': c['tilt'], 'nogem': nog['cell']})
        rows.append(m)

    photos = []
    if not a.no_photo:
        for stone in a.stones.split(','):
            cands = [files.get(stone), f'{stone}.jpg', f'{stone}_cat.jpg']
            ref = next((os.path.join(a.refs, c) for c in cands if c and os.path.exists(os.path.join(a.refs, c))), None)
            if not ref:
                bad.append(f'photo {stone}: no reference in {a.refs}')
                continue
            a_ref = load(ref)
            spec = crystal_spec(app_txt, stone)
            m = crystal_mask(a_ref, spec) if spec else photo_mask(a_ref, pthr)
            photos.append({'kind': 'photo', 'stone': stone, 'pose': os.path.basename(ref),
                           'tilt': None, 'mask': 'crystal' if spec else 'photo', **metrics(a_ref, m)})

    cols = ('L10', 'L20', 'L25', 'L40', 'sat_med', 'L50', 'L95', 'clip', 'grey_ex', 'plate', 'hp_sigma', 'rim_core')
    print(f"black_probe · run={run}")
    print(f"mask render: |dL(nogem)|>6 · closing3 · fill · largest CC   "
          f"mask photo: sat>25|max<120 & max>8 · open3 · largest")
    print('')
    print(f"{'stone':10s}{'pose':12s}{'px':>7s}" + ''.join(f'{c:>9s}' for c in cols))
    for r in photos + rows:
        print(f"{r['stone']:10s}{r['pose']:12s}{r['stone_px']:7d}" +
              ''.join(f"{r[c]:>9.2f}" if isinstance(r[c], float) else f"{r[c]:>9d}" for c in cols))
    print('')
    if recs:
        print(f"{'stone':10s}{'sat_rec':>9s}{'sat_dev':>9s}{'L50_rec':>9s}{'L50_dev':>9s}")
        for r in rows:
            rec = recs.get(r['stone'])
            if rec and rec.get('sat'):
                print(f"{r['stone']:10s}{rec['sat']:>9.1f}{r['sat_med'] - rec['sat']:>+9.1f}"
                      f"{(rec['L50'] if rec['L50'] is not None else float('nan')):>9.1f}"
                      f"{(r['L50'] - rec['L50']) if rec['L50'] is not None else float('nan'):>+9.1f}")
        print('')
    if bad:
        print(f'INVALID CELLS ({len(bad)}):', file=sys.stderr)
        for b in bad:
            print('  ' + b, file=sys.stderr)
    if a.json:
        json.dump({'run': run, 'thresholds': thr_path, 'records': recs,
                   'photos': photos, 'render': rows, 'invalid': bad},
                  open(a.json, 'w'), indent=1)
        print(f'wrote {a.json}')
    return 2 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
