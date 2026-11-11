#!/usr/bin/env python3
"""pav_probe.py — the D1 pavilion meter: bottom-half band table of a stone cell.

Defect D1 is "erratic aberration on the lower pavilion". This probe isolates the
pavilion (rows from the widest row of the stone mask down to its tip), splits it
into 8 equal row bands and prints, per band, the numbers that separate a clean
gradient pavilion from a stippled/unstable one:

    L med       band median luma         (0..255)
    sat med     band median saturation
    hue mean    circular mean over hue px (sat>60 & L<220); population printed
    sd7 med     median 7x7 local sd      (E8 plate structure)
    hp sigma    std(L - box3x3(L))       (high-pass residual)
    step        band L med minus previous band's (None on the first band)

Whole pavilion: unique 8-bit L levels, stipple proxy (% |L-box3(L)| > 12), and
the band carrying the largest |adjacent step|.

    python3 prototype/gems/pav_probe.py --head CELLDIR --nogem NOGEMDIR
                                        [--adj ADJCELL] [--map PNG] [--json OUT]
                                        [--label NAME]
    python3 prototype/gems/pav_probe.py --self-test DIR [--json OUT]

Mask (frozen, same as black_probe/collar_probe): |L(head) - L(nogem)| > 6,
3x3 closing, holes filled, largest connected component, restricted to the
canvas rect (a `rect`/`canvas_rect`/`clip_rect` [x,y,w,h] in the cell's
meta.json/stamp.json if present, else the whole image — a clip-0.png capture is
the canvas rect). Head/twin shape mismatch is a hard error, never a rescore.

`--adj ADJCELL` is the tilt -0.14 twin of a -0.15 cell: same-size diff over the
same stone mask and pavilion rows, reporting static share (|dL| <= 1), unstable
share (|dL| >= 8), mean |dL| and a 2D map PNG of dL.

Exit 0 on a completed measurement, 2 on an invalid cell, 3 on a failed
self-test assertion.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

W = np.array([0.2126, 0.7152, 0.0722])
NB = 8
HUE_SAT, HUE_LMAX = 60.0, 220.0


def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)


def lum(a):
    return a @ W


def sat255(a):
    mx, mn = a.max(2), a.min(2)
    return (mx - mn) / np.maximum(mx, 1e-6) * 255.0


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


def box3(x):
    return ndi.convolve(x, np.ones((3, 3), np.float32) / 9.0, mode='nearest')


def sd7(x):
    mean = ndi.uniform_filter(x, 7, mode='nearest')
    sq = ndi.uniform_filter(x * x, 7, mode='nearest')
    return np.sqrt(np.maximum(sq - mean * mean, 0))


def stone_mask(head, nog):
    m = np.abs(lum(head) - lum(nog)) > 6
    m = ndi.binary_closing(m, iterations=3)
    m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    if n == 0:
        return m
    s = ndi.sum(m, lab, range(1, n + 1))
    return lab == (int(np.argmax(s)) + 1)


def canvas_rect(cell_dir, h, w):
    """Canvas rect [x,y,w,h] from the cell's sidecars, else the whole image."""
    for name in ('meta.json', 'stamp.json', 'cell.json'):
        p = os.path.join(cell_dir, name)
        if not os.path.exists(p):
            continue
        try:
            js = json.load(open(p))
        except Exception:
            continue
        for k in ('rect', 'canvas_rect', 'clip_rect', 'clip'):
            v = js.get(k)
            if isinstance(v, (list, tuple)) and len(v) == 4:
                return tuple(int(x) for x in v), name + ':' + k
        cv = js.get('canvas')
        if isinstance(cv, dict) and all(k in cv for k in ('x', 'y', 'w', 'h')):
            return (int(cv['x']), int(cv['y']), int(cv['w']), int(cv['h'])), name + ':canvas'
        fps = js.get('fps')
        if isinstance(fps, str):
            try:
                st = json.loads(fps)
            except Exception:
                st = {}
            bw, bh = st.get('bw'), st.get('bh')
            if bw and bh and (int(bw), int(bh)) == (w, h):
                return (0, 0, w, h), name + ':fps(bw/bh)'
    return (0, 0, w, h), 'image'


def rect_mask(shape, rect):
    x, y, w, h = rect
    m = np.zeros(shape, bool)
    m[max(0, y):max(0, y + h), max(0, x):max(0, x + w)] = True
    return m


def circ_hue(h, sel):
    if int(sel.sum()) == 0:
        return None
    ang = np.deg2rad(h[sel])
    return round(float(np.rad2deg(np.arctan2(np.sin(ang).mean(), np.cos(ang).mean())) % 360.0), 1)


def measure(head, st, rect):
    """Pavilion band table. `st` is the stone mask already clipped to `rect`."""
    L, sat, h = lum(head), sat255(head), hue_deg(head)
    hp = L - box3(L)
    sd = sd7(L)
    rows = np.where(st.any(1))[0]
    if rows.size == 0:
        return None
    y1 = int(rows[-1])
    widest = int(np.argmax(st.sum(1)))
    pav0 = min(widest, y1)
    H = y1 - pav0 + 1
    edges = [pav0 + int(round(i * H / NB)) for i in range(NB)] + [y1 + 1]
    edges = [max(pav0, min(e, y1 + 1)) for e in edges]
    edges[-1] = y1 + 1
    hue_sel = (sat > HUE_SAT) & (L < HUE_LMAX)

    bands, prev = [], None
    for i in range(NB):
        lo, hi = edges[i], max(edges[i], edges[i + 1])
        sel = st[lo:hi]
        n = int(sel.sum())
        rec = {'band': i, 'rows': [lo, hi], 'px': n,
               'L_med': None, 'sat_med': None, 'hue_mean': None, 'hue_px': 0,
               'hue_share': 0.0, 'sd7_med': None, 'hp_sigma': None, 'step': None}
        if n:
            Lb = L[lo:hi][sel]
            hs = hue_sel[lo:hi] & sel
            rec.update({'L_med': round(float(np.median(Lb)), 1),
                        'sat_med': round(float(np.median(sat[lo:hi][sel])), 1),
                        'hue_mean': circ_hue(h[lo:hi], hs), 'hue_px': int(hs.sum()),
                        'hue_share': round(100.0 * float(hs.sum()) / n, 1),
                        'sd7_med': round(float(np.median(sd[lo:hi][sel])), 2),
                        'hp_sigma': round(float(hp[lo:hi][sel].std()), 2),
                        'step': None if prev is None else round(float(np.median(Lb) - prev), 1)})
            prev = float(np.median(Lb))
        bands.append(rec)

    pv = np.zeros_like(st)
    pv[pav0:y1 + 1] = st[pav0:y1 + 1]
    pn = int(pv.sum())
    steps = [(b['band'], b['step']) for b in bands if b['step'] is not None]
    mx = max(steps, key=lambda s: abs(s[1])) if steps else (None, None)
    tot = {
        'px': pn, 'rows': [pav0, y1], 'height': H,
        'levels_u8': int(np.unique(np.clip(np.round(L[pv]), 0, 255).astype(np.uint8)).size) if pn else 0,
        'stipple_pct': round(100.0 * float((np.abs(hp[pv]) > 12).sum()) / max(pn, 1), 2),
        'max_step_band': mx[0], 'max_step': mx[1],
        'hue_px': int((hue_sel & pv).sum()),
        'hue_share': round(100.0 * float((hue_sel & pv).sum()) / max(pn, 1), 1),
    }
    widest_px = int(st[widest].sum())
    return {'stone_px': int(st.sum()), 'rect': list(rect), 'bbox': [int(min(np.where(st.any(0))[0])),
            int(rows[0]), int(max(np.where(st.any(0))[0])), y1],
            'widest_row': widest, 'widest_px': widest_px, 'bands': bands, 'pav': tot}


def dmap(dL, st, pav_rows, path, label):
    x, y, w, hh = 0, 0, dL.shape[1], dL.shape[0]
    m = np.zeros_like(st)
    m[pav_rows[0]:pav_rows[1] + 1] = st[pav_rows[0]:pav_rows[1] + 1]
    peak = max(4.0, float(np.percentile(np.abs(dL[m]), 99.5)) if m.any() else 4.0)
    t = np.clip(dL / peak, -1.0, 1.0)
    rgb = np.zeros(dL.shape + (3,), np.uint8)
    pos, neg = t >= 0, t < 0
    rgb[:, :, 0] = np.where(pos, 255, np.where(neg, 255 * (1 + t), 0))
    rgb[:, :, 1] = np.where(pos, 255 * (1 - t), np.where(neg, 255 * (1 + t), 0))
    rgb[:, :, 2] = np.where(pos, 255 * (1 - t), np.where(neg, 255, 0))
    rgb[~m] = (24, 24, 24)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    Image.fromarray(rgb).save(path)
    return {'map_png': os.path.abspath(path), 'map_scale': round(peak, 2), 'label': label}


def print_table(rec, dstat=None):
    print(f"mask: |dL(nogem)|>6 · closing3 · fill · largest CC · rect={tuple(rec['rect'])}")
    print(f"stone_px={rec['stone_px']}  widest_row={rec['widest_row']} "
          f"(widest_px={rec['widest_px']})  pavilion rows={rec['pav']['rows']}")
    print('')
    print(f"{'band':>4s}{'rows':>13s}{'px':>7s}{'L_med':>8s}{'sat_med':>8s}"
          f"{'hue_mean':>9s}{'hue_px':>7s}{'sd7_med':>8s}{'hp_sig':>7s}{'step':>7s}")
    dash = '-'
    for b in rec['bands']:
        def fmt(k):
            v = b[k]
            return f"{v:.1f}" if isinstance(v, (int, float)) else dash
        hue = f"{b['hue_mean']:.1f}" if b['hue_mean'] is not None else dash
        print(f"{b['band']:>4d}{str(b['rows'][0]) + '..' + str(b['rows'][1]):>13s}{b['px']:>7d}"
              f"{fmt('L_med'):>8s}{fmt('sat_med'):>8s}{hue:>9s}"
              f"{b['hue_px']:>7d}{fmt('sd7_med'):>8s}{fmt('hp_sigma'):>7s}{fmt('step'):>7s}")
    p = rec['pav']
    print('')
    print(f"pavilion px={p['px']} rows={p['rows'][0]}..{p['rows'][1]} (h={p['height']})  "
          f"levels_u8={p['levels_u8']}  stipple(|hp|>12)={p['stipple_pct']:.2f}%  "
          f"max_step={p['max_step']:+.1f} at band {p['max_step_band']}")
    print(f"hue population: sat>{HUE_SAT:.0f} & L<{HUE_LMAX:.0f} → "
          f"{p['hue_px']} px of pavilion ({p['hue_share']:.1f}%)")
    print("step series: " + ' '.join(
        f"b{b['band']}:{b['step']:+.1f}" for b in rec['bands'] if b['step'] is not None))
    if dstat:
        print(f"adj {dstat['adj']}: px={dstat['px']} static(|dL|<=1)={dstat['static_pct']:.1f}% "
              f"unstable(|dL|>=8)={dstat['unstable_pct']:.1f}% mean|dL|={dstat['mean_abs']:.2f} "
              f"max|dL|={dstat['max_abs']:.1f} → {dstat['map_png']}")


def resolve_cell(p):
    if os.path.isdir(p):
        for n in ('clip-0.png', 'full.png'):
            q = os.path.join(p, n)
            if os.path.exists(q):
                return q
        return None
    return p if os.path.exists(p) else None


def run(a):
    hp_ = resolve_cell(a.head)
    np_ = resolve_cell(a.nogem) if a.nogem else None
    if not hp_ or not np_:
        print(f'INVALID: missing cell png (head={a.head} nogem={a.nogem})', file=sys.stderr)
        return 2
    head, nog = load(hp_), load(np_)
    if head.shape != nog.shape:
        print(f'SHAPE MISMATCH: head {head.shape} vs nogem {nog.shape} '
              f'({hp_} vs {np_}) — refusing to score', file=sys.stderr)
        return 2
    cell_dir = os.path.dirname(hp_) if os.path.isdir(a.head) else os.path.dirname(os.path.abspath(a.head))
    rect, rsrc = canvas_rect(cell_dir, head.shape[0], head.shape[1])
    st = stone_mask(head, nog) & rect_mask(head.shape[:2], rect)
    rec = measure(head, st, rect)
    if rec is None:
        print(f'INVALID: empty stone mask for {a.head}', file=sys.stderr)
        return 2
    lab = a.label or os.path.basename(os.path.abspath(a.head.rstrip('/')))
    rec.update({'label': lab, 'head': os.path.abspath(hp_), 'nogem': os.path.abspath(np_),
                'rect_source': rsrc})
    dstat = None
    if a.adj:
        ap_ = resolve_cell(a.adj)
        if not ap_:
            print(f'INVALID: missing adj cell png ({a.adj})', file=sys.stderr)
            return 2
        adj = load(ap_)
        if adj.shape != head.shape:
            print(f'SHAPE MISMATCH: adj {adj.shape} vs head {head.shape} — refusing to diff',
                  file=sys.stderr)
            return 2
        dL = lum(adj) - lum(head)
        m = np.zeros_like(st)
        p0, p1 = rec['pav']['rows']
        m[p0:p1 + 1] = st[p0:p1 + 1]
        v = np.abs(dL[m])
        dstat = {'adj': os.path.abspath(ap_), 'px': int(m.sum()),
                 'same_size': list(adj.shape),
                 'static_pct': round(100.0 * float((v <= 1).sum()) / max(v.size, 1), 1),
                 'unstable_pct': round(100.0 * float((v >= 8).sum()) / max(v.size, 1), 1),
                 'mean_abs': round(float(v.mean()), 2), 'max_abs': round(float(v.max()), 2),
                 'dL_med': round(float(np.median(dL[m])), 2)}
        dstat.update(dmap(dL, st, rec['pav']['rows'],
                          a.map or os.path.join(os.path.dirname(os.path.abspath(a.json or '.')), lab + '-dmap.png'),
                          lab))
    print(f"pav_probe · {lab}  head={rec['head']}")
    print_table(rec, dstat)
    if a.json:
        rec['adj'] = dstat
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        json.dump(rec, open(a.json, 'w'), indent=1)
        print(f"wrote {a.json}")
    return 0


def self_test(d, js=None):
    """Synthetic vertical gradient, 8 flat 20-level steps, vs a flat twin."""
    os.makedirs(d, exist_ok=True)
    steps = [40 + 20 * i for i in range(NB)]
    h, w = 160, 64
    g = np.zeros((h, w, 3), np.float32)
    for i, v in enumerate(steps):
        g[i * h // NB:(i + 1) * h // NB] = v
    flat = np.zeros((h, w, 3), np.float32) + 8.0
    Image.fromarray(g.astype(np.uint8)).save(os.path.join(d, 'synth-head.png'))
    Image.fromarray(flat.astype(np.uint8)).save(os.path.join(d, 'synth-flat.png'))
    head, nog = load(os.path.join(d, 'synth-head.png')), load(os.path.join(d, 'synth-flat.png'))
    st = stone_mask(head, nog) & rect_mask(head.shape[:2], (0, 0, w, h))
    rec = measure(head, st, (0, 0, w, h))
    got = [b['L_med'] for b in rec['bands']]
    checks, ok = [], True
    # the frozen mask closes with iterations=3 and border_value=0, so a stone that
    # touches the canvas loses a 3-px border ring: expected px == (h-6)*(w-6)
    exp_px = (h - 6) * (w - 6)

    def ck(name, cond, detail):
        nonlocal ok
        ok = ok and bool(cond)
        checks.append({'check': name, 'pass': bool(cond), 'detail': detail})

    ck('mask == frame minus closing border ring', rec['stone_px'] == exp_px,
       f"{rec['stone_px']} == {exp_px} (=(h-6)*(w-6))")
    ck('pavilion rows span the mask to the tip',
       rec['pav']['rows'] == [3, h - 4] and rec['pav']['height'] == h - 6, str(rec['pav']['rows']))
    ck('8 band medians == construction', got == [float(v) for v in steps], f'got={got} want={steps}')
    ck('7 adjacent steps == +20', [b['step'] for b in rec['bands'][1:]] == [20.0] * 7,
       str([b['step'] for b in rec['bands'][1:]]))
    ck('max adjacent step == 20 at band 1', rec['pav']['max_step'] == 20.0 and rec['pav']['max_step_band'] == 1,
       f"band={rec['pav']['max_step_band']} step={rec['pav']['max_step']}")
    # hp_sigma per band is spec'd over all band pixels, so the two rows straddling
    # each 20-level seam contribute ~20/3 residual: bound is 6.7*sqrt(2/19) ~ 2.2
    ck('band hp sigma inside step-seam bound (<3.0)',
       all((b['hp_sigma'] or 0) < 3.0 for b in rec['bands']), str([b['hp_sigma'] for b in rec['bands']]))
    hp = lum(head) - box3(lum(head))
    seams = [20 * s for s in range(1, NB)]
    badrows = sorted({int(y) for y in np.where((np.abs(hp) > 0.5).any(1))[0]})
    exprows = sorted({r for s in seams for r in (s - 1, s)})
    ck('high-pass residual confined to the 14 construction-seam rows', badrows == exprows,
       f'rows={badrows} expected={exprows}')
    ck('flat bands: stipple share == 0', rec['pav']['stipple_pct'] == 0.0, str(rec['pav']['stipple_pct']))
    ck('unique u8 levels == 8', rec['pav']['levels_u8'] == NB, str(rec['pav']['levels_u8']))
    ck('synthetic pair is achromatic: hue population 0', rec['pav']['hue_px'] == 0 and
       all(b['hue_mean'] is None for b in rec['bands']), str(rec['pav']['hue_px']))

    print(f"pav_probe self-test · dir={d}")
    print_table(rec)
    print('')
    for c in checks:
        print(f"  [{'PASS' if c['pass'] else 'FAIL'}] {c['check']}  ({c['detail']})")
    print(f"self-test: {'PASS' if ok else 'FAIL'} ({sum(c['pass'] for c in checks)}/{len(checks)})")
    out = {'dir': d, 'construction': {'steps': steps, 'h': h, 'w': w, 'flat': 8},
           'bands': rec['bands'], 'pav': rec['pav'], 'checks': checks, 'pass': ok}
    json.dump(out, open(os.path.join(d, 'selftest.json'), 'w'), indent=1)
    if js:
        os.makedirs(os.path.dirname(os.path.abspath(js)), exist_ok=True)
        json.dump(out, open(js, 'w'), indent=1)
    return 0 if ok else 3


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--head')
    ap.add_argument('--nogem')
    ap.add_argument('--adj')
    ap.add_argument('--map')
    ap.add_argument('--json')
    ap.add_argument('--label', default='')
    ap.add_argument('--self-test', dest='self_test', metavar='DIR')
    a = ap.parse_args(argv)
    if a.self_test:
        return self_test(a.self_test, a.json)
    if not a.head or not a.nogem:
        ap.error('--head and --nogem are required (or use --self-test DIR)')
    return run(a)


if __name__ == '__main__':
    sys.exit(main())
