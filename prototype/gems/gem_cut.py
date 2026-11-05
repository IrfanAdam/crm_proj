"""ADAM/SHARED — prototype/gems/gem_cut.py · portable round-brilliant cut (mirror)."""
# [plan:2026-10-03_144222-gem-realism-round2.md#phase-9] · Task 19 parity twin of gem-cut.js.
# — Data: CUT dims + CATEGORIES (token, hue, spin, ior = real refractive index) · key order mirrors the JS core —
# — Cut: octagon table · 8 star · 8 bezel kites · 16 upper-girdle triangles · ROUND 48-segment girdle ·
#   8 pavilion mains (pentagon kites) · 16 lower-girdle triangles · small culet octagon —
#   16 flat facets on a round outline, every facet exactly one plane, closed + manifold —
#   tipPhi = star-tip AZIMUTH offset from its own table corner (deg; 22.5 = the mirror-kite case) ·
#   bezelT = the WIDE star-tip's station along the bezel (0 table → 1 girdle) · tipVar = alternating ± fraction ·
#   star = legacy star-tip position along the bezel (superseded by tipPhi/bezelT, kept for the shared CUT token set) ·
#   lower = lower-girdle meet depth × pavilion.
# — Definition is by FACET PLANE: the 16 crown planes run through the star tip and the two girdle
#   junctions at (g, +h); the 16 pavilion planes through the lower-girdle meet and the junctions at
#   (g, −h). Every girdle vertex that touches a facet is that facet's plane cut at its own radius, so
#   a facet is ONE plane by construction.
# — TIP AZIMUTH is the GIA orientation degree of freedom. With the tips at a constant azimuth offset
#   phi from their table corner (phi ≠ 22.5) the two bezel triangles of a kite are NOT coplanar for a
#   naive height, so the 8 tip heights are SOLVED: det(S_k−T, M−T, S_{k−1}−T) = 0 is linear in the two
#   tip heights of bezel k → an 8×8 cyclic system (Gaussian elimination; pure Python = JS mirror).
#   phi > 22.5 puts the angularly-wide tip up-table and the narrow one toward the girdle, which no
#   fixed ±22.5° star tip can do. Bezel kite fold is solved to ~1e-12°.
# — Girdle SCULPT: the bevel width w(φ) runs 16-fold — narrow at the 16 facet junctions (thick band),
#   wide at the 16 mid-facet columns (thin band). Each bevel is a CONE from an apex on the axis, so a
#   bevel quad is EXACTLY planar for any w(φ). Band wall = the two r = girdle rings → 48-gon silhouette.
# — Mirror: same vertex order + same expressions as the JS core; parity_check.py asserts 1e-9 —
import math, re

CUT = {"facets": 16, "girdle": 1.0, "table": 0.555, "crown": 0.305, "pavilion": 0.8845,
       "band": 0.05, "star": 0.5, "lower": 0.80, "culet": 0.012,
       "bevelMin": 0.0012, "bevelMax": 0.0097, "bevelApex": 0.55,
       "tipPhi": 22.8, "bezelT": 0.383, "tipVar": 0.0}
CATEGORIES = {
    "sapphire": {"token": "--primitive-sapphire-ui-400", "hue": 0, "spin": 0.35, "ior": 1.77},
    "citrine": {"token": "--primitive-citrine-400", "hue": 38, "spin": 0.3, "ior": 1.545},
    "amethyst": {"token": "--primitive-amethyst-400", "hue": 265, "spin": 0.4, "ior": 1.545},
    "redberyl": {"token": "--primitive-red-beryl-400", "hue": 310, "spin": 0.5, "ior": 1.577},
}
ALIASES = {"red-beryl": "redberyl"}   # legacy kebab key (JS exposes the same as a property)
FALLBACK = {"sapphire": "#218aea", "citrine": "#ffb01e", "amethyst": "#a54cff", "redberyl": "#ea005e"}


def _solve8(A, B, C):
    """Solve the cyclic system A[k]·y[k] + B[k]·y[k−1] = C[k] (k = 0..7) by Gaussian elimination."""
    n = 8
    M = [[0.0] * (n + 1) for _ in range(n)]
    for k in range(n):
        M[k][k] += A[k]
        M[k][(k - 1) % n] += B[k]
        M[k][n] = C[k]
    for col in range(n):
        piv = col
        for r in range(col + 1, n):
            if abs(M[r][col]) > abs(M[piv][col]):
                piv = r
        if abs(M[piv][col]) < 1e-15:
            raise ValueError("singular tip-height system (phi = 22.5° is the degenerate case)")
        M[col], M[piv] = M[piv], M[col]
        pv = M[col][col]
        for r in range(col + 1, n):
            f = M[r][col] / pv
            if f != 0.0:
                for cc in range(col, n + 1):
                    M[r][cc] -= f * M[col][cc]
    y = [0.0] * n
    for r in range(n - 1, -1, -1):
        s = M[r][n]
        for cc in range(r + 1, n):
            s -= M[r][cc] * y[cc]
        y[r] = s / M[r][r]
    return y


def gem_cut(cut=CUT):
    """Build the round brilliant → (positions, cells); every cell is a triangle index triple."""
    g, h = cut["girdle"], cut["band"] / 2.0             # girdle radius · band half-height
    S, n = 3, 16 * 3                                    # segments per facet · ring segments (48)
    tab_r, r_cu = g * cut["table"], g * cut["culet"]
    c8 = math.cos(math.pi / 8)
    y_tab = h + cut["crown"]                            # table plane
    d_low = cut["pavilion"] * cut["lower"]              # lower-girdle meet depth
    pav = cut["pavilion"] - h
    meet_r = (pav * g + (g - r_cu * c8) * (h - d_low)) / (pav * c8)  # meet ON the main plane
    b_min, b_max = cut["bevelMin"], cut["bevelMax"]
    y_con = cut["bevelApex"] * g                         # bevel cone apex, on the axis
    phi_t = math.radians(cut["tipPhi"])                  # star-tip azimuth offset from its corner
    r_tip = (tab_r + (g - tab_r) * cut["bezelT"]) / math.cos(phi_t)   # wide tip's station along the bezel
    t_var = cut.get("tipVar", 0.0)
    r_tip = [r_tip * (1.0 + (t_var if k % 2 else -t_var)) for k in range(8)]

    pos = []

    def ring(count, rad, y, off=0.0):
        start = len(pos)
        for i in range(count):
            a = (i / count + off) * math.pi * 2
            pos.append([math.cos(a) * rad, y, math.sin(a) * rad])
        return start

    def plane(a, b, c):
        """(n, d) with n·x + d = 0 for the triangle a,b,c."""
        u = [b[i] - a[i] for i in range(3)]
        w = [c[i] - a[i] for i in range(3)]
        nx = u[1] * w[2] - u[2] * w[1]
        ny = u[2] * w[0] - u[0] * w[2]
        nz = u[0] * w[1] - u[1] * w[0]
        L = math.sqrt(nx * nx + ny * ny + nz * nz)
        return [nx / L, ny / L, nz / L], -(nx * a[0] + ny * a[1] + nz * a[2]) / L

    def yat(pl, r, phi):                               # facet plane height at (r, azimuth)
        return (-pl[1] - r * (pl[0][0] * math.cos(phi) + pl[0][2] * math.sin(phi))) / pl[0][1]

    r_jun = g - b_min                                    # junction column: girdle height, bevel inset

    def crown_planes(ty):
        """The 16 crown planes: tip k + the two junction COLUMNS of each 22.5° half.
        Both neighbours of a junction share that column's exact 3D point, so the fan of every
        half-facet is one plane for ANY tip azimuth (the ±22.5° family only hid this)."""
        out = []
        for kf in range(16):
            k = kf // 2
            a0, a1 = kf * math.pi / 8, (kf + 1) * math.pi / 8
            ac = k * math.pi / 4 + phi_t
            out.append(plane([r_tip[k] * math.cos(ac), ty[k], r_tip[k] * math.sin(ac)],
                             [r_jun * math.cos(a0), h, r_jun * math.sin(a0)],
                             [r_jun * math.cos(a1), h, r_jun * math.sin(a1)]))
        return out

    def tip_heights():
        """Coplanarity of (T_k, S_k, M_k, S_{k−1}) → 8 linear equations for the 8 tip heights.
        M_k is the junction column at azimuth 45k° (radius g − bevelMin, height h), so the system is
        EXACTLY linear: det(S_k−T, M−T, S_{k−1}−T) = 0 → A[k]·y[k] + B[k]·y[k−1] = C[k]."""
        cph, sph = math.cos(phi_t), math.sin(phi_t)
        cps, sps = math.cos(math.pi / 4 - phi_t), math.sin(math.pi / 4 - phi_t)
        d_tab = r_jun - tab_r
        e = h - y_tab
        A = [0.0] * 8
        B = [0.0] * 8
        C = [0.0] * 8
        for k in range(8):
            rk, rp = r_tip[k], r_tip[k - 1]
            a, c = rk * cph - tab_r, rk * sph
            p, s = rp * cps - tab_r, -rp * sps
            A[k] = d_tab * s
            B[k] = -c * d_tab
            C[k] = a * e * s - c * e * p + (A[k] + B[k]) * y_tab
        return _solve8(A, B, C)

    y_tip = tip_heights()                               # SOLVED star-tip heights (per k)
    tab = ring(8, tab_r, y_tab)                         # 0: octagon table
    mid = len(pos)                                      # 8: star tips (bezel shoulders), azimuth 45k+phi
    for k in range(8):
        ac = k * math.pi / 4 + phi_t
        pos.append([r_tip[k] * math.cos(ac), y_tip[k], r_tip[k] * math.sin(ac)])
    low = ring(8, meet_r, -d_low, 0.5 / 8)              # 16: lower-girdle meet points
    cu = ring(8, r_cu, -cut["pavilion"], 0.5 / 8)       # 24: culet octagon

    pls = crown_planes(y_tip)
    cols = []                                           # one column of GT · BT · BB · GB per azimuth
    for i in range(n):
        phi = (i / n) * math.pi * 2
        kf = i // S                                     # 22.5° facet index (0..15)
        k = kf // 2                                     # 45° sector → its star-tip / meet apex
        ac = (k + 0.5) * math.pi / 4
        cp, sp = math.cos(phi), math.sin(phi)
        crown = pls[kf]
        pavl = plane([meet_r * math.cos(ac), -d_low, meet_r * math.sin(ac)],
                     [g * math.cos(kf * math.pi / 8), -h, g * math.sin(kf * math.pi / 8)],
                     [g * math.cos((kf + 1) * math.pi / 8), -h, g * math.sin((kf + 1) * math.pi / 8)])
        # 16-fold bevel width: 0 at the 16 facet junctions (22.5°k), 1 at the mid-facet columns
        w = b_min + (b_max - b_min) * (1.0 - math.cos(16.0 * phi)) / 2.0
        rt = g - w
        gy = h if i % S == 0 else yat(crown, rt, phi)   # junction columns: exactly the shared point
        py = yat(pavl, rt, phi)
        cols.append([[rt * cp, gy, rt * sp],                    # GT: crown facet attachment
                     [g * cp, y_con + (g / rt) * (gy - y_con), g * sp],    # BT: bevel cone → r = girdle
                     [g * cp, -y_con + (g / rt) * (py + y_con), g * sp],   # BB: bevel cone → r = girdle
                     [rt * cp, py, rt * sp]])                   # GB: pavilion facet attachment
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
