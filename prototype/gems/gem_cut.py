"""ADAM/SHARED — prototype/gems/gem_cut.py · portable round-brilliant cut (mirror)."""
# [plan:2026-10-03_144222-gem-realism-round2.md#phase-9] · Task 19 parity twin of gem-cut.js.
# — Data: CUT dims + CATEGORIES (token, hue, spin, ior = real refractive index) · key order mirrors the JS core —
# — Cut: octagon table · 8 star · 8 bezel kites · 16 upper-girdle triangles · ROUND 48-segment girdle ·
#   8 pavilion mains (pentagon kites) · 16 lower-girdle triangles · small culet octagon —
#   16 flat facets on a round outline, every facet exactly one plane, closed + manifold —
#   star = star-tip position along the bezel (0 = table edge, 1 = girdle) —
# — Girdle: THICK at the 16 facet junctions, THIN between them. Every ring azimuth takes its y from
#   that azimuth's own facet plane cut by the cylinder r = girdle (taper scales the dip, minBand floors
#   it), so the 3 strips of one facet are coplanar and the facet merges to ONE plane. The chamfer strips
#   survive as a 0.2 × local-half-thickness inset of the crown/pavilion attachment rings —
# — Mirror: same vertex order + same expressions as the JS core; parity_check.py asserts 1e-9 —
import math, re

CUT = {"facets": 16, "girdle": 1.0, "table": 0.555, "crown": 0.305, "pavilion": 0.8845,
       "band": 0.05, "star": 0.5, "lower": 0.8206, "culet": 0.012, "taper": 0.3, "minBand": 0.4}
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
    S, n = 3, 16 * 3                                    # segments per facet · ring segments (48)
    tp = cut["taper"]                                   # 0 = flat band, 1 = full facet-plane dip
    tab_r, r_cu = g * cut["table"], g * cut["culet"]
    c22 = math.cos(math.pi / 8)
    y_tab = h + cut["crown"]                            # table plane
    r_mid = (tab_r + (g - tab_r) * cut["star"]) / c22   # on the bezel plane → bezel kite stays flat
    y_mid = h + cut["crown"] * (1.0 - cut["star"]) * tp  # star tip, squashed toward the girdle plane
    d_low = cut["pavilion"] * cut["lower"]              # lower-girdle meet depth (pavilion plane is fixed)
    pav = cut["pavilion"] - h
    meet_r = (pav * g + (g - r_cu * c22) * (h - d_low)) / (pav * c22)  # mains' own intersect → flat main

    pos = []

    def ring(count, rad, y, off=0.0):
        start = len(pos)
        for i in range(count):
            a = (i / count + off) * math.pi * 2
            pos.append([math.cos(a) * rad, y, math.sin(a) * rad])
        return start

    tab = ring(8, tab_r, y_tab)                         # 0: octagon table
    mid = ring(8, r_mid, y_mid, 0.5 / 8)                # 8: star tips (bezel shoulders)
    low = ring(8, meet_r, -d_low, 0.5 / 8)              # 16: lower-girdle meet points
    cu = ring(8, r_cu, -cut["pavilion"], 0.5 / 8)       # 24: culet octagon

    def plane(a, b, c):
        """(n, d) with n·x + d = 0 for the triangle a,b,c."""
        u = [b[i] - a[i] for i in range(3)]
        w = [c[i] - a[i] for i in range(3)]
        nx = u[1] * w[2] - u[2] * w[1]
        ny = u[2] * w[0] - u[0] * w[2]
        nz = u[0] * w[1] - u[1] * w[0]
        L = math.sqrt(nx * nx + ny * ny + nz * nz)
        return [nx / L, ny / L, nz / L], -(nx * a[0] + ny * a[1] + nz * a[2]) / L

    def yat(pl, r, phi):                               # plane height on the cylinder r at azimuth phi
        return (-pl[1] - r * (pl[0][0] * math.cos(phi) + pl[0][2] * math.sin(phi))) / pl[0][1]

    cols = []                                           # one column of GT · BT · BB · GB per azimuth
    for i in range(n):
        phi = (i / n) * math.pi * 2
        kf = i // S                                     # 22.5° facet index (0..15)
        k = kf // 2                                     # 45° sector → its star-tip apex
        a0, a1 = kf * math.pi / 8, (kf + 1) * math.pi / 8
        ac = (k + 0.5) * math.pi / 4
        crown = plane([r_mid * math.cos(ac), y_mid, r_mid * math.sin(ac)],
                      [g * math.cos(a0), h, g * math.sin(a0)],
                      [g * math.cos(a1), h, g * math.sin(a1)])
        pavl = plane([meet_r * math.cos(ac), -d_low, meet_r * math.sin(ac)],
                     [g * math.cos(a0), -h, g * math.sin(a0)],
                     [g * math.cos(a1), -h, g * math.sin(a1)])
        top, bot = yat(crown, g, phi), yat(pavl, g, phi)
        if top - bot < cut["minBand"] * 2 * h:           # floor: never pinch below minBand·band
            my = (top + bot) / 2
            top, bot = my + cut["minBand"] * h, my - cut["minBand"] * h
        c = 0.2 * (top - bot) / 2                        # chamfer = 0.2 of the LOCAL half-thickness
        cp, sp = math.cos(phi), math.sin(phi)
        cols.append([[cp * (g - c), yat(crown, g - c, phi), sp * (g - c)],   # GT: on the crown plane
                     [cp * g, top - c, sp * g],                              # BT: band top
                     [cp * g, bot + c, sp * g],                              # BB: band bottom
                     [cp * (g - c), yat(pavl, g - c, phi), sp * (g - c)]])   # GB: on the pavilion plane
    GT = len(pos)
    BT, BB, GB = GT + n, GT + 2 * n, GT + 3 * n
    for ri in range(4):
        for i in range(n):
            pos.append(cols[i][ri])

    cells = []

    def tri(a, b, c):
        cells.append([a, b, c])

    for i in range(1, 7):                               # table octagon (6 tris)
        tri(tab, tab + i + 1, tab + i)
    for k in range(8):                                  # crown: 1 star + 2 bezel + 2*S upper-girdle
        t0, t1 = tab + k, tab + (k + 1) % 8
        s, s0 = mid + k, mid + (k + 7) % 8
        m = GT + 2 * S * k
        tri(t0, t1, s)
        tri(t0, s, m)
        tri(t0, m, s0)
        for q in range(2 * S):
            tri(s, GT + (2 * S * k + q + 1) % n, GT + (2 * S * k + q) % n)
    for i in range(n):                                  # girdle: bevel · band · bevel, 48 segments
        j = (i + 1) % n
        tri(GT + i, GT + j, BT + j)
        tri(GT + i, BT + j, BT + i)
        tri(BT + i, BT + j, BB + j)
        tri(BT + i, BB + j, BB + i)
        tri(BB + i, BB + j, GB + j)
        tri(BB + i, GB + j, GB + i)
    for k in range(8):                                  # pavilion: 2*S lower-girdle + 3 main
        b0 = GB + 2 * S * k
        p, pl = low + k, low + (k + 7) % 8
        c, cl = cu + k, cu + (k + 7) % 8
        for q in range(2 * S):
            tri(GB + (2 * S * k + q) % n, GB + (2 * S * k + q + 1) % n, p)
        tri(b0, p, c)
        tri(b0, c, cl)
        tri(b0, cl, pl)
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
