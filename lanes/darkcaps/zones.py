"""darkcaps zones.py — isolate flat dark-navy cap zones (crown top / pavilion bottom).
Mask: dark.png sat>20, largest 8-connected component, holes filled, eroded 3px.
Caps: interior pixels with L<90 AND local 7x7 std<8, 8-connected components,
      split top-third vs bottom-third of the mask bbox.
Also: slab fraction per gem-optics skill (interior L in 40..80 with 7x7 std<6).
Usage: python3 lanes/darkcaps/zones.py lanes/darkcaps/sapphire [front2.png ...]
  first positional arg is a run dir (uses front.png + dark.png); extra args are
  additional front images (e.g. probes) scored against the same dark mask.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi


def load_rgb(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float64)


def luma(a):
    return 0.2126 * a[:, :, 0] + 0.7152 * a[:, :, 1] + 0.0722 * a[:, :, 2]


def sat255(a):
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    return np.where(mx > 0, (mx - mn) / np.maximum(mx, 1) * 255.0, 0.0)


def local_std(l, k=7):
    m = ndi.uniform_filter(l, size=k)
    m2 = ndi.uniform_filter(l * l, size=k)
    return np.sqrt(np.maximum(m2 - m * m, 0.0))


def build_mask(dark_rgb):
    seed = sat255(dark_rgb) > 20.0
    lab, n = ndi.label(seed, structure=np.ones((3, 3)))
    if n == 0:
        return None, 'empty seed'
    sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
    comp = lab == (1 + int(np.argmax(sizes)))
    filled = ndi.binary_fill_holes(comp)
    eroded = ndi.binary_erosion(filled, structure=np.ones((3, 3)), iterations=3)
    if eroded.sum() == 0:
        return None, 'mask empty after erode'
    return eroded, None


def zone_split(mask):
    ys, _ = np.nonzero(mask)
    y0, y1 = ys.min(), ys.max()
    h = y1 - y0 + 1
    return y0 + h / 3.0, y0 + 2.0 * h / 3.0, y0, y1


def cap_zones(front_rgb, mask):
    L = luma(front_rgb)
    s7 = local_std(L, 7)
    flat_dark = (L < 90.0) & (s7 < 8.0) & mask
    lab, n = ndi.label(flat_dark, structure=np.ones((3, 3)))
    cut1, cut2, y0, y1 = zone_split(mask)
    out = {}
    for name, sel in (('top', slice(y0, int(cut1)),), ('bot', slice(int(cut2), y1 + 1),)):
        rows = np.zeros_like(mask)
        rows[sel, :] = True
        zm = flat_dark & rows
        zl = L[zm]
        out[name] = {
            'frac_of_stone': float(zm.sum() / mask.sum()),
            'px': int(zm.sum()),
            'p5': float(np.percentile(zl, 5)) if zl.size else None,
            'p50': float(np.percentile(zl, 50)) if zl.size else None,
            'std': float(zl.std()) if zl.size else None,
            'components': int(np.unique(lab[zm]).size) if zm.sum() else 0,
        }
    L_in = L[mask]
    slab = ((L >= 40.0) & (L <= 80.0) & (s7 < 6.0) & mask).sum() / mask.sum()
    return {
        'zones': out,
        'stone_px': int(mask.sum()),
        'interior': {'p5': float(np.percentile(L_in, 5)), 'p50': float(np.percentile(L_in, 50)), 'std': float(L_in.std())},
        'slab_frac': float(slab),
    }


def analyze(run_dir, extra=()):
    dark = load_rgb(os.path.join(run_dir, 'dark.png'))
    mask, err = build_mask(dark)
    if mask is None:
        return {'run': run_dir, 'error': err}
    fronts = [os.path.join(run_dir, 'front.png')] + list(extra)
    res = {'run': run_dir, 'stone_px': int(mask.sum())}
    for f in fronts:
        try:
            res[os.path.basename(f)] = cap_zones(load_rgb(f), mask)
        except Exception as e:  # noqa: BLE001
            res[os.path.basename(f)] = {'error': 'open: %s' % e}
    return res


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--out=')]
    out = next((a[6:] for a in sys.argv[1:] if a.startswith('--out=')), None)
    run_dir = args[0]
    extra = args[1:]
    res = analyze(run_dir, extra)
    if 'error' in res and 'stone_px' not in res:
        print(json.dumps(res, indent=1))
        return 1
    for k, v in res.items():
        if k in ('run', 'stone_px') or 'error' in v:
            continue
        print('== %s  (img %s, stone %d px)' % (res['run'], k, res['stone_px']))
        print('   interior L: p5=%.1f p50=%.1f std=%.1f | slab_frac=%.3f' % (
            v['interior']['p5'], v['interior']['p50'], v['interior']['std'], v['slab_frac']))
        for z in ('top', 'bot'):
            zr = v['zones'][z]
            print('   cap-%s: frac=%.3f px=%d p5=%s p50=%s std=%s comps=%d' % (
                z, zr['frac_of_stone'], zr['px'],
                ('%.1f' % zr['p5']) if zr['p5'] is not None else 'n/a',
                ('%.1f' % zr['p50']) if zr['p50'] is not None else 'n/a',
                ('%.2f' % zr['std']) if zr['std'] is not None else 'n/a',
                zr['components']))
    json.dump(res, open(out or os.path.join(run_dir, 'zones.json'), 'w'), indent=1)
    print('wrote %s' % (out or os.path.join(run_dir, 'zones.json')))
    return 0


if __name__ == '__main__':
    sys.exit(main())
