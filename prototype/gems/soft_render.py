"""ADAM/GEMS — prototype/gems/soft_render.py · numpy z-buffer renderer adapter."""
# [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · software twin of gem3d.js: the same
# camera fit and the same material numbers (gem_optics.py), rasterised on the CPU.
# — Camera: orthographic, ~15° elevation, 3/4 azimuth · per-face Newell normals, flat facets —
# — Optics: the view ray is refracted at the entry facet, marched THICK through the stone,
# —   Beer-Lambert attenuated and sampled on the stage backdrop the sheet puts behind the gem —
import numpy as np

from gem_optics import (DISP, THICK, TRANS, aces, attenuation, bilin, lin, refract, srgb,
                        stage, surface, unit)

SS = 2                                   # supersample factor (box-filtered back down)


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


def render(positions, cells, base, ior=1.545, bg=None, size=400, ss=SS, fit=0.86, elev=15.0,
           azim=-34.0):
    """Z-buffer one gem → (rgb HxWx3 0-1, coverage HxW 0-1): the light stage seen through it."""
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
    tint, back = attenuation(base), lin(stage(W, bg))   # transmittance · linear stage radiance
    surf = np.array([surface(n, base, ior, -F) for n in norms])
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
        through = np.zeros((y1 - y0, x1 - x0, 3))
        for j, k in enumerate(DISP):               # one refraction per channel → dispersion
            t = refract(-F, norms[fi], 1.0 / (ior * k))
            through[..., j] = bilin(back, gx + THICK * sc * float(t @ R),
                                    gy - THICK * sc * float(t @ U))[..., j]
        zbuf[y0:y1, x0:x1][hit] = zz[hit]
        rgb[y0:y1, x0:x1][hit] = (TRANS * through * tint + surf[fi])[hit]
        mask[y0:y1, x0:x1][hit] = 1.0
    box = (H // ss, ss, W // ss, ss)
    m = mask.reshape(box).mean((1, 3))
    c = rgb.reshape(box + (3,)).mean((1, 3)) / np.maximum(m[..., None], 1e-6)
    return srgb(aces(c)), m
