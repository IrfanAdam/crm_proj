#!/usr/bin/env python3
"""collar_probe.py — girdle-collider striation + crown/pavilion sigma (Task 45/42).

Ports lane r18/p's `band.py` (the projected-girdle mask and its residual/step
statistics) into the repo and adds the two baseline numbers the round-19 gate
compares against: the same residual sigma measured over the CROWN and PAVILION
row bands of the stone mask.

    python3 prototype/gems/collar_probe.py --head CELLDIR --nogem NOGEMDIR
                                           [--proj PROJ.json] [--json OUT]

  band_sigma   projected 48-wall girdle band, residual L - box1d(L, 9), per scanline
               (this is lane-p's number: 11.31 on the r18 build)
  crown_sigma  same residual over rows y0 .. widest-70 of the stone mask
  pav_sigma    same residual over rows widest+60 .. y1
  band_sigma_row  residual over rows widest-55 .. widest+40 (no projection needed,
               so it can be computed on any cell; comparability with lane-p needs
               the projected number)

Masks: stone = |L(head) - L(nogem)| > 6, closing 3, holes filled, largest CC.
Band pixels come from the cut's own radius-1 ring projected in-page (proj.json),
mapped onto the stone mask bbox, eroded 3 px and restricted to the visible
silhouette band, exactly as lane-p measured it.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

W = np.array([0.2126, 0.7152, 0.0722])


def lum(a):
    return a @ W


def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)


def stone_mask(head, nog):
    m = np.abs(lum(head) - lum(nog)) > 6
    m = ndi.binary_closing(m, iterations=3)
    m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    if n == 0:
        return m
    s = ndi.sum(m, lab, range(1, n + 1))
    return lab == (int(np.argmax(s)) + 1)


def runs(row, min_len=6):
    xs = np.where(row)[0]
    if xs.size == 0:
        return []
    brk = np.where(np.diff(xs) > 1)[0]
    out, s = [], 0
    for e in list(brk) + [xs.size - 1]:
        out.append((xs[s], xs[e] + 1))
        s = e + 1
    return [r for r in out if r[1] - r[0] >= min_len]


def stats(L, sel):
    res, step, val = [], [], []
    for y in range(sel.shape[0]):
        for a, b in runs(sel[y]):
            v = L[y, a:b]
            k = ndi.uniform_filter1d(v, 9, mode='nearest')
            res.append((v - k)[2:-2])
            step.append(np.abs(np.diff(v)))
            val.append(v)
    if not res:
        return None
    r, s, v = np.concatenate(res), np.concatenate(step), np.concatenate(val)
    return {'sigma': round(float(r.std()), 2), 'step': round(float(s.mean()), 2),
            'mean_L': round(float(v.mean()), 1), 'p10_L': round(float(np.percentile(v, 10)), 1),
            'p50_L': round(float(np.percentile(v, 50)), 1),
            'contrast_pct': round(100.0 * float(r.std()) / max(float(v.mean()), 1e-6), 2),
            'px': int(v.size)}


def band_mask(proj, st, h, w):
    ys, xs = np.where(st)
    mb = (xs.min(), ys.min(), xs.max(), ys.max())
    bb = proj['bbox']
    sx = (mb[2] - mb[0]) / (bb[2] - bb[0])
    sy = (mb[3] - mb[1]) / (bb[3] - bb[1])
    img = Image.new('L', (w, h), 0)
    dr = ImageDraw.Draw(img)
    for t in proj['tris']:
        pts = [(mb[0] + (p[0] - bb[0]) * sx, mb[1] + (bb[3] - p[1]) * sy) for p in t]
        dr.polygon(pts, fill=255)
    m = np.asarray(img) > 0
    m = m & ndi.binary_erosion(st, iterations=3)
    m = m & ~ndi.binary_erosion(st, iterations=28)
    clean = np.zeros_like(m)
    for y in range(m.shape[0]):
        for a, b in runs(m[y]):
            clean[y, a:b] = m[y, a:b]
    return clean


def row_band(st, lo, hi):
    m = np.zeros_like(st)
    m[max(0, lo):max(0, hi)] = st[max(0, lo):max(0, hi)]
    return m


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--head', required=True)
    ap.add_argument('--nogem', required=True)
    ap.add_argument('--proj', default='')
    ap.add_argument('--json', default='')
    ap.add_argument('--label', default='')
    a = ap.parse_args(argv)
    head = load(os.path.join(a.head, 'clip-0.png'))
    nog = load(os.path.join(a.nogem, 'clip-0.png'))
    L = lum(head)
    st = stone_mask(head, nog)
    ys, xs = np.where(st)
    y0, y1 = int(ys.min()), int(ys.max())
    widest = int(np.argmax(st.sum(1)))
    rec = {'label': a.label or os.path.basename(a.head.rstrip('/')), 'stone_px': int(st.sum()),
           'widest_row': widest,
           'crown': stats(L, row_band(st, y0, widest - 70)),
           'band_row': stats(L, row_band(st, widest - 55, widest + 40)),
           'pavilion': stats(L, row_band(st, widest + 60, y1))}
    if a.proj and os.path.exists(a.proj):
        proj = json.load(open(a.proj))
        bm = band_mask(proj, st, head.shape[0], head.shape[1])
        rec['band'] = stats(L, bm)
        rec['band_px'] = int(bm.sum())
        rec['band_pct_of_stone'] = round(100.0 * bm.sum() / max(int(st.sum()), 1), 2)
        bys, bxs = np.where(bm)
        if bys.size:
            rec['band_bbox'] = [int(bxs.min()), int(bys.min()), int(bxs.max()), int(bys.max())]
    rec['crown_sigma'] = rec['crown']['sigma'] if rec['crown'] else None
    rec['pav_sigma'] = rec['pavilion']['sigma'] if rec['pavilion'] else None
    rec['band_sigma'] = rec['band']['sigma'] if 'band' in rec and rec['band'] else None
    print(json.dumps(rec, indent=1))
    if a.json:
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        json.dump(rec, open(a.json, 'w'), indent=1)
    return 0


if __name__ == '__main__':
    sys.exit(main())
