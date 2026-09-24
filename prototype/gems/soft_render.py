"""ADAM/GEMS — prototype/gems/soft_render.py · numpy z-buffer renderer adapter."""
import numpy as np

SS = 2                                 # supersample factor (box-filtered back down)
ENV_LO = np.array([0.05, 0.06, 0.09])  # studio floor — what downward facets mirror
ENV_HI = np.array([1.80, 1.80, 1.80])  # HDR softbox above — upward facets mirror it
KEY = np.array([-0.18, 0.96, 0.20])    # key softbox overhead (doubles as the glint)
FILL = np.array([0.62, -0.25, 0.74])   # weak fill from front-right
LAMP = np.array([0.35, -0.78, 0.52])   # bounce card under the stone → interior glow
F0, DISP = 0.05, np.array([-0.06, 0.0, 0.06])  # fresnel base + dispersive "fire"


def unit(v):
    """Normalize a 3-vector (zero-safe)."""
    n = float(np.linalg.norm(v))
    return v / n if n > 1e-12 else v


def camera(elev=15.0, azim=-34.0):
    """Orthographic basis (right, up, forward) — a slightly elevated 3/4 view."""
    e, a = np.radians(elev), np.radians(azim)
    f = -unit(np.array([np.cos(e) * np.sin(a), np.sin(e), np.cos(e) * np.cos(a)]))
    r = unit(np.cross([0.0, 1.0, 0.0], f))
    return r, np.cross(f, r), f


def facets(positions, cells):
    """Per-face outward normals + fan triangles → (normals, [(a, b, c, face)])."""
    P = np.asarray(positions, float)
    norms, tris = [], []
    for cell in cells:
        q = P[list(cell)]
        n = np.zeros(3)
        for k in range(len(q)):                    # Newell area vector (n-gon safe)
            n = n + np.cross(q[k], q[(k + 1) % len(q)])
        n = unit(n)
        if np.dot(n, q.mean(axis=0)) < 0.0:        # force outward (convex meshes)
            n = -n
        norms.append(n)
        for k in range(1, len(cell) - 1):
            tris.append((cell[0], cell[k], cell[k + 1], len(norms) - 1))
    return np.array(norms), tris


def shade(n, base, view):
    """Flat-facet material: Lambert + Blinn-Phong + fresnel rim over a 2-tone env."""
    v = unit(view)
    ndv = max(float(np.dot(n, v)), 0.0)
    refl = 2.0 * ndv * n - v                       # mirror direction → studio env
    t = np.clip((refl[1] + 0.02) / 0.30 + DISP, 0.0, 1.0)   # horizon + dispersion
    env = ENV_LO + (ENV_HI - ENV_LO) * (t * t * (3.0 - 2.0 * t))
    fres = F0 + (1.0 - F0) * (1.0 - ndv) ** 5
    tint = base / max(float(base.max()), 1e-6)
    lk, lf, ll = unit(KEY), unit(FILL), unit(LAMP)
    diff = 0.55 * max(float(np.dot(n, lk)), 0.0) + 0.20 * max(float(np.dot(n, lf)), 0.0)
    glow = max(float(np.dot(n, ll)), 0.0) ** 1.4   # light carried through the stone
    spec = max(float(np.dot(n, unit(lk + v))), 0.0) ** 14 * 4.0
    col = base * (0.26 + 1.35 * diff + 1.10 * glow)
    col = col + env * (0.24 + 0.60 * fres) * (0.35 + 0.65 * tint)
    col = col + 0.14 * fres + spec * (0.75 + 0.25 * fres)   # white glints + rim
    return 1.0 - np.exp(-col * 1.7)                # soft highlight roll-off


def render(positions, cells, base, size=400, ss=SS, fit=0.86, elev=15.0, azim=-34.0):
    """Z-buffer one gem → (rgb HxWx3 0-1, coverage HxW 0-1), supersampled + box-filtered."""
    P = np.asarray(positions, float)
    norms, tris = facets(positions, cells)
    R, U, F = camera(elev, azim)
    view = P @ np.stack([R, U, F], axis=1)         # world → camera space
    W = H = int(size * ss)
    lo, hi = view[:, :2].min(0), view[:, :2].max(0)
    ctr, ext = (lo + hi) / 2.0, float(np.max(hi - lo)) or 1.0
    sc = (W * fit) / ext
    sp = np.stack([(view[:, 0] - ctr[0]) * sc + W / 2.0,
                   H / 2.0 - (view[:, 1] - ctr[1]) * sc], axis=1)
    cols = np.array([shade(n, base, -F) for n in norms])
    zbuf, rgb, mask = np.full((H, W), np.inf), np.zeros((H, W, 3)), np.zeros((H, W))
    for a, b, c, fi in tris:
        p = sp[[a, b, c]]
        lim = np.stack([np.floor(p.min(0)), np.ceil(p.max(0)) + 2]).astype(int)
        (x0, x1), (y0, y1) = np.clip(lim, 0, [W, H]).T
        gx, gy = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
        (ax, ay), (bx, by), (dx, dy) = p
        den = (by - dy) * (ax - dx) + (dx - bx) * (ay - dy)
        if abs(den) < 1e-9:
            continue
        w0 = ((by - dy) * (gx - dx) + (dx - bx) * (gy - dy)) / den
        w1 = ((dy - ay) * (gx - dx) + (ax - dx) * (gy - dy)) / den
        w2 = 1.0 - w0 - w1
        zz = w0 * view[a, 2] + w1 * view[b, 2] + w2 * view[c, 2]
        hit = (w0 >= 0.0) & (w1 >= 0.0) & (w2 >= 0.0) & (zz < zbuf[y0:y1, x0:x1])
        if not hit.any():
            continue
        zbuf[y0:y1, x0:x1][hit] = zz[hit]
        rgb[y0:y1, x0:x1][hit] = cols[fi]
        mask[y0:y1, x0:x1][hit] = 1.0
    box = (H // ss, ss, W // ss, ss)
    m = mask.reshape(box).mean((1, 3))
    c = rgb.reshape(box + (3,)).mean((1, 3)) / np.maximum(m[..., None], 1e-6)
    return np.clip(c, 0.0, 1.0), m
