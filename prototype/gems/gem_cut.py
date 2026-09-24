"""ADAM/SHARED — prototype/gems/gem_cut.py · portable round-brilliant cut (mirror)."""
# [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · Task 18 parity twin of gem-cut.js.
# — Data: CUT dims + CATEGORIES (token, hue, spin) · key order mirrors the JS core —
# — Cut: octagon table · 8 star · 8 bezel kites · upper-girdle fan · thin girdle band (2
#   close rings) · 8 pavilion mains · 16 lower-girdle facets · tiny culet ring — triangles —
# — Mirror: same vertex order + same expressions as the JS core; parity_check.py asserts 1e-9 —
import math, re

CUT = {"facets": 48, "girdle": 1.0, "table": 0.55, "crown": 0.32, "pavilion": 0.86,
       "band": 0.055, "star": 0.74, "starDrop": 0.5, "lower": 0.15, "scallop": 0.75,
       "culet": 0.06}
CATEGORIES = {
    "sapphire": {"token": "--primitive-sapphire-ui-400", "hue": 0, "spin": 0.35},
    "citrine": {"token": "--primitive-citrine-400", "hue": 38, "spin": 0.3},
    "amethyst": {"token": "--primitive-amethyst-400", "hue": 265, "spin": 0.4},
    "redberyl": {"token": "--primitive-red-beryl-400", "hue": 310, "spin": 0.5},
}
ALIASES = {"red-beryl": "redberyl"}   # legacy kebab key (JS exposes the same as a property)
FALLBACK = {"sapphire": "#218aea", "citrine": "#ffb01e", "amethyst": "#a54cff", "redberyl": "#ea005e"}


def gem_cut(cut=CUT):
    """Build the round brilliant → (positions, cells); every cell is a triangle index triple."""
    n = max(16, cut["facets"] - cut["facets"] % 16)   # silhouette columns (16-fold symmetry)
    col, brk = n // 8, 16                             # columns/sector · lower-girdle facets
    g, h = cut["girdle"], cut["band"] / 2.0           # girdle radius · band half-height
    r_cu, tab_r = g * cut["culet"], g * cut["table"]
    d_e = cut["pavilion"] * cut["lower"]              # even: lower-girdle break depth
    d_o = d_e * (1.0 + cut["scallop"])                # odd: main-centre break (deeper)

    def cone(depth):                                  # radius of the ideal pavilion cone
        return g + (r_cu - g) * (depth - h) / (cut["pavilion"] - h)

    pos = []

    def ring(count, rad, y, off=0.0):
        start = len(pos)
        for i in range(count):
            a = (i / count + off) * math.pi * 2
            pos.append([math.cos(a) * rad, y, math.sin(a) * rad])
        return start

    tab = ring(8, tab_r, h + cut["crown"])            # 0: octagon table
    star = ring(8, g * cut["star"], h + cut["crown"] * (1.0 - cut["starDrop"]), 0.5 / 8)
    gt = ring(n, g, h)                                # 16: girdle top ring
    gb = ring(n, g, -h)                               # girdle bottom ring
    br = len(pos)                                     # lower-girdle break ring (16 points)
    for j in range(brk):
        a = (j / brk) * math.pi * 2
        depth = d_e if j % 2 == 0 else d_o
        rad = cone(depth)
        pos.append([math.cos(a) * rad, -depth, math.sin(a) * rad])
    cu = ring(8, r_cu, -cut["pavilion"])              # tiny culet octagon

    cells = []

    def tri(a, b, c):
        cells.append([a, b, c])

    for i in range(1, 7):                             # table octagon (6 tris)
        tri(tab, tab + i + 1, tab + i)
    for k in range(8):                                # crown: star + 2 bezel + girdle fan
        c1, s = tab + (k + 1) % 8, star + k
        i0, i1 = gt + k * col, gt + ((k + 1) % 8) * col
        tri(tab + k, c1, s)
        tri(tab + k, s, i0)
        tri(c1, i1, s)
        for m in range(col):
            tri(s, gt + (k * col + m + 1) % n, gt + (k * col + m) % n)
    for i in range(n):                                # thin girdle band (two close rings)
        j = (i + 1) % n
        tri(gt + i, gt + j, gb + j)
        tri(gt + i, gb + j, gb + i)
    per = n // brk                                    # girdle columns per lower-girdle facet
    for j in range(brk):                              # 16 lower-girdle facets
        for m in range(per):
            tri(br + j, gb + (j * per + m) % n, gb + (j * per + m + 1) % n)
        tri(gb + ((j + 1) * per) % n, br + (j + 1) % brk, br + j)
    for k in range(8):                                # 8 pavilion mains (kites, 3 tris each)
        a, b, c = br + (2 * k) % brk, br + (2 * k + 1) % brk, br + (2 * k + 2) % brk
        tri(cu + k, a, b)
        tri(cu + k, b, c)
        tri(cu + k, c, cu + (k + 1) % 8)
    for i in range(1, 7):                             # culet facet octagon (6 tris)
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
