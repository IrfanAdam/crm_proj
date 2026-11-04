"""ADAM/SHARED — prototype/gems/gem_cut.py · portable round-brilliant cut (mirror)."""
# [plan:2026-10-03_144222-gem-realism-round2.md#phase-9] · Task 19 parity twin of gem-cut.js.
# — Data: CUT dims + CATEGORIES (token, hue, spin, ior = real refractive index) · key order mirrors the JS core —
# — Cut: octagon table · 8 star · 8 bezel kites · 16 upper-girdle triangles · thin 16-gon girdle band ·
#   8 pavilion mains (kites) · 16 lower-girdle triangles · small culet octagon — 116 triangles —
# — Mirror: same vertex order + same expressions as the JS core; parity_check.py asserts 1e-9 —
import math, re

CUT = {"facets": 16, "girdle": 1.0, "table": 0.55, "crown": 0.32, "pavilion": 0.86,
       "band": 0.055, "star": 0.775, "starDrop": 0.5, "lower": 0.72, "culet": 0.06}
CATEGORIES = {
    "sapphire": {"token": "--primitive-sapphire-ui-400", "hue": 0, "spin": 0.35, "ior": 1.77},
    "citrine": {"token": "--primitive-citrine-400", "hue": 38, "spin": 0.3, "ior": 1.545},
    "amethyst": {"token": "--primitive-amethyst-400", "hue": 265, "spin": 0.4, "ior": 1.545},
    "redberyl": {"token": "--primitive-red-beryl-400", "hue": 310, "spin": 0.5, "ior": 1.577},
}
ALIASES = {"red-beryl": "redberyl"}   # legacy kebab key (JS exposes the same as a property)
FALLBACK = {"sapphire": "#218aea", "citrine": "#ffb01e", "amethyst": "#a54cff", "redberyl": "#ea005e"}


def gem_cut(cut=CUT):
    """Build the round brilliant → (positions, cells); every cell is a triangle index triple."""
    g, h = cut["girdle"], cut["band"] / 2.0             # girdle radius · band half-height
    tab_r, r_cu = g * cut["table"], g * cut["culet"]
    y_tab = h + cut["crown"]                            # table plane
    y_mid = h + cut["crown"] * (1.0 - cut["starDrop"])  # star tip / bezel shoulder
    d_low = cut["pavilion"] * cut["lower"]              # lower-girdle meet depth
    pav = cut["pavilion"] - h

    def cone(depth):                                    # radius of the ideal pavilion cone
        return g + (r_cu - g) * (depth - h) / pav

    pos = []

    def ring(count, rad, y, off=0.0):
        start = len(pos)
        for i in range(count):
            a = (i / count + off) * math.pi * 2
            pos.append([math.cos(a) * rad, y, math.sin(a) * rad])
        return start

    tab = ring(8, tab_r, y_tab)                         # 0: octagon table
    mid = ring(8, g * cut["star"], y_mid, 0.5 / 8)      # 8: star tips (bezel shoulders)
    gt = ring(16, g, h)                                 # 16: girdle top, 16 shared vertices
    gb = ring(16, g, -h)                                # 32: girdle bottom
    low = ring(8, cone(d_low), -d_low, 0.5 / 8)         # 48: lower-girdle meet points
    cu = ring(8, r_cu, -cut["pavilion"])                # 56: culet octagon

    cells = []

    def tri(a, b, c):
        cells.append([a, b, c])

    for i in range(1, 7):                               # table octagon (6 tris)
        tri(tab, tab + i + 1, tab + i)
    for k in range(8):                                  # crown: 1 star + 2 bezel + 2 upper-girdle
        t0, t1 = tab + k, tab + (k + 1) % 8
        s, s0 = mid + k, mid + (k + 7) % 8
        m, ml, mr = gt + 2 * k, gt + (2 * k + 1) % 16, gt + (2 * k + 2) % 16
        tri(t0, t1, s)
        tri(t0, s, m)
        tri(t0, m, s0)
        tri(s, ml, m)
        tri(s, mr, ml)
    for i in range(16):                                 # thin girdle band (two close rings)
        j = (i + 1) % 16
        tri(gt + i, gt + j, gb + j)
        tri(gt + i, gb + j, gb + i)
    for k in range(8):                                  # pavilion: 2 lower-girdle + 2 main (kite)
        b0, bl, br = gb + 2 * k, gb + (2 * k + 1) % 16, gb + (2 * k + 2) % 16
        p, pl, c = low + k, low + (k + 7) % 8, cu + k
        tri(b0, bl, p)
        tri(p, bl, br)
        tri(b0, p, c)
        tri(b0, c, pl)
    for i in range(1, 7):                               # culet facet octagon (6 tris)
        tri(cu, cu + i, cu + i + 1)
    return pos, cells


def resolve_colors(css_path):
    """Read exact token hexes from the built tokens.css (fall back if missing)."""
    try:
        css = open(css_path).read()
    except OSError:
        return dict(FALLBACK)
    out = {}
    for key, meta in CATEGORIES.items():
        m = re.search(re.escape(meta["token"]) + r"\s*:\s*(#[0-9a-fA-F]+)", css)
        out[key] = m.group(1) if m else FALLBACK[key]
    return out
