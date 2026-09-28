"""ADAM/GEMS — prototype/gems/hero_floor.py · hero floor, tent light + photon caustic."""
# [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · the light stage the gem sits on: a
# Lambertian floor, the gem_optics tent emitter (band + 7-lobe speckle, vectorised here for
# the ray march) as a deterministic golden-ratio photon beam, and the photon-mapped caustic
# pool the WebGL build fakes with a texture. No RNG anywhere.
# Export map: FLOOR_Y · ALB · GRID · SPAN · env() · tent() · photons() · caustic() · splat()
#   · blur() · exit_rad() · direct()
import numpy as np
from gem_optics import ENV_HI, ENV_LO, bilin

FLOOR_Y, GRID, SPAN = -0.86, 224, 3.6      # floor height · caustic cells/side · half-extent
ALB, AMB = np.array([0.60, 0.60, 0.62]), 0.02        # floor albedo · ambient studio bounce
SCALE, Y_LO, Y_HI = 0.16, 0.55, 1.0        # tent radiance scale · sampled band [y_lo, y_hi]
CELL, R2 = (2.0 * SPAN / GRID) ** 2, 0.7548776662466927    # cell area · R2 sequence stride

def env(d):
    """Vectorised gem_optics.envdir — studio shell + tent band + 7-lobe speckle."""
    b = np.exp(-((np.clip(d[:, 1], 0.0, 1.0) - 0.85) / 0.22) ** 2)
    s = np.clip(np.cos(np.arctan2(d[:, 2], d[:, 0]) * 7.0), 0.0, 1.0) ** 8
    return ENV_LO + ENV_HI * b[:, None] * (0.05 + 0.95 * s)[:, None]

def tent(n):
    """Deterministic tent directions + per-direction flux (radiance × solid angle)."""
    i = np.arange(n, dtype=float) + 0.5
    y = Y_LO + (Y_HI - Y_LO) * np.mod(i * 0.5698402909980532, 1.0)
    r, phi = np.sqrt(np.maximum(1.0 - y * y, 0.0)), np.mod(i * R2, 1.0) * 2.0 * np.pi
    d = np.stack([r * np.cos(phi), y, r * np.sin(phi)], 1)
    return d, env(d) * SCALE * 2.0 * np.pi * (Y_HI - Y_LO) / n

def photons(n_dir, n_pos, rad=1.05, top=3.0):
    """Tent photons → (origin, travel dir, flux); flux carries dω·dA / CELL."""
    d, f = tent(n_dir)
    i = np.arange(n_pos, dtype=float) + 0.5
    phi, r = np.mod(i * R2, 1.0) * 2.0 * np.pi, rad * np.sqrt(i / n_pos)
    e1 = np.stack([-d[:, 1], d[:, 0], np.zeros(len(d))], 1) / np.hypot(d[:, 0], d[:, 1])[:, None]
    o = (top * d)[:, None, :] + (r * np.cos(phi))[None, :, None] * e1[:, None, :] \
        + (r * np.sin(phi))[None, :, None] * np.cross(d, e1)[:, None, :]
    return o.reshape(-1, 3), -np.repeat(d, n_pos, 0), np.repeat(f, n_pos, 0) * np.pi * rad * rad / n_pos / CELL

def _cell(x, z):
    """World (x, z) → fractional grid coords + clamped integer cell corner."""
    g = (np.stack([x, z], 1) / SPAN * 0.5 + 0.5) * (GRID - 1)
    return g, np.clip(np.floor(g).astype(int), 0, GRID - 2)

def _bilin(grid, x, z):
    """Bilinear lookup of the caustic grid at world (x, z) → (N, 3) irradiance."""
    g, i0 = _cell(x, z)
    fx, fz = np.clip(g - i0, 0.0, 1.0).T
    a, b = grid[i0[:, 0], i0[:, 1]], grid[i0[:, 0] + 1, i0[:, 1]]
    c, e = grid[i0[:, 0], i0[:, 1] + 1], grid[i0[:, 0] + 1, i0[:, 1] + 1]
    return a + (b - a) * fx[:, None] + (c - a) * fz[:, None] + (a - b - c + e) * (fx * fz)[:, None]

def splat(grid, x, z, val):
    """Bilinear scatter-add of photon power into the caustic grid."""
    g, i0 = _cell(x, z)
    fx, fz = np.clip(g - i0, 0.0, 1.0).T
    for a in (0, 1):
        for b in (0, 1):
            np.add.at(grid, (i0[:, 0] + a, i0[:, 1] + b), val * (1 - fx, fx)[a][:, None] * (1 - fz, fz)[b][:, None])

def blur(grid, passes=2):
    """Separable 1-2-3-2-1 smoothing → a soft pool (rolls; the grid edge stays empty)."""
    for _ in range(passes):
        for ax in (0, 1):
            grid = sum(w * np.roll(grid, o - 2, axis=ax) for o, w in enumerate((1, 2, 3, 2, 1))) / 9.0
    return grid

def exit_rad(o, d, caustic, direct, bg, fade=(1.6, 3.2)):
    """Radiance where a ray lands: Lambertian floor below the horizon, stage card above."""
    t = (FLOOR_Y - o[:, 1]) / np.where(d[..., 1] < -1e-6, d[..., 1], 1.0)
    ok = (d[..., 1] < -1e-6) & (t > 0.0)
    px, pz = o[:, 0] + t * d[..., 0], o[:, 2] + t * d[..., 2]
    col = ALB[None, :] / np.pi * (AMB + direct + _bilin(caustic, px, pz))
    mix = np.clip((np.hypot(px, pz) - fade[0]) / (fade[1] - fade[0]), 0.0, 1.0) ** 2
    u, v = (0.5 + 0.34 * d[..., 0]) * (bg.shape[1] - 1.0), (0.5 - 0.34 * d[..., 1]) * (bg.shape[0] - 1.0)
    far = bilin(bg, (0.5 + px / 4.0) * (bg.shape[1] - 1.0), (0.5 - pz / 4.0) * (bg.shape[0] - 1.0))
    return np.where(ok[:, None], col * (1.0 - mix[:, None]) + far * mix[:, None], bilin(bg, u, v))

def direct(slab, P, ldir, lflux, N, O):
    """Tent irradiance at floor points P — one geometric shadow test per direction."""
    acc = np.zeros((len(P), 3))
    for k, w in enumerate(ldir):
        tin, _, tout, _ = slab(P, np.repeat(w[None, :], len(P), 0), N, O)
        acc += lflux[k] * w[1] * (1.0 - ((tin > 0.0) & (tin < tout)))[:, None]
    return acc

def caustic(march, iors, tints, N, O, n_dir=48, n_pos=3000, nb=6, chunk=6144):
    """Photon-map the pool: march the tent photons per channel → [grid, grid, grid]."""
    o, d, flux = photons(n_dir, n_pos)
    out = []
    for ior, tint in zip(iors, tints):
        g = np.zeros((GRID, GRID, 3))
        for s in range(0, len(o), chunk):
            _, ep, ed, ew = march(o[s:s + chunk], d[s:s + chunk], ior, tint, N, O, nb)
            t = (FLOOR_Y - ep[:, 1]) / np.where(ed[:, 1] < -1e-6, ed[:, 1], 1.0)
            k = (ew > 0.0) & (ed[:, 1] < -1e-6) & (t > 0.0)
            splat(g, ep[k, 0] + t[k] * ed[k, 0], ep[k, 2] + t[k] * ed[k, 2], flux[s:s + chunk][k] * ew[k][:, None])
        out.append(blur(g))
    return out
