"""ADAM/GEMS — prototype/gems/hero_render.py · path-traced hero render of the sapphire."""
# [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · the physics the three r160 WebGL
# build cannot do: real per-wavelength dispersion (R/G/B marched at ior × DISP so the paths
# separate), multi-bounce total internal reflection with Beer-Lambert absorption, and a
# photon-mapped caustic pool. Deterministic — no RNG. Simplifications: internal Fresnel is
# TIR-only, the floor is Lambertian, the tent radiance is hero_floor.SCALE × env, F broadcasts.
# Run: python3 prototype/gems/hero_render.py → hero-gem.png (sapphire, 800×800, ~2 min)
import os, time

import numpy as np
from PIL import Image
from gem_cut import CATEGORIES, gem_cut, resolve_colors
from gem_optics import DISP, THICK, TRANS, aces, attenuation, lin, srgb, stage
import hero_floor as FL
from render_gems import hex_rgb, token
from soft_render import camera

HERE = os.path.dirname(os.path.abspath(__file__))
SIZE, SPP, CHUNK, NB, NBP = 800, 2, 6144, 6, 6     # px/side · samples · batch · bounces
NDIR, NPOS, NLIT, ELEV, AZIM, FIT, BIAS, BACK = 48, 3000, 4, 38.0, -34.0, 0.50, 0.20, 5.0

def planes(positions, cells):
    """Deduped outward facet planes of the convex cut → (normals, offsets)."""
    P = np.asarray(positions, float)
    I, J, K = np.array(cells).T
    V = np.cross(P[J] - P[I], P[K] - P[I])
    L, s = np.linalg.norm(V, axis=1, keepdims=True), np.sign(np.sum(V * P[I], 1))[:, None]
    V, off = V * s / L, np.abs(np.sum(V * P[I], 1)) / L[:, 0]      # origin is inside the hull
    _, u = np.unique(np.round(np.c_[V, off], 5), axis=0, return_index=True)
    return V[u], off[u]

def cross(o, d, N, O, inside=False, eps=1e-5):
    """Facet crossings: convex slab entry/exit, or the first surface ahead (from inside)."""
    den = d @ N.T
    ok = np.abs(den) > 1e-9
    t = np.where(ok, (O - o @ N.T) / np.where(ok, den, 1.0), 0.0)
    if inside:
        return np.where(t > eps, t, np.inf).min(1), np.where(t > eps, t, np.inf).argmin(1), 0.0, 0.0
    tin, tout = np.where(den < 0.0, t, -np.inf), np.where(den > 0.0, t, np.inf)
    return tin.max(1), tin.argmax(1), tout.min(1), tout.argmin(1)

def fresnel(d, n, eta, ior):
    """Snell (eta = n1/n2) + Schlick (ior); n faces the incoming ray, k < 0 means TIR."""
    c = np.clip(-np.sum(n * d, 1), 0.0, 1.0)
    k, f0 = 1.0 - eta * eta * (1.0 - c * c), ((ior - 1.0) / (ior + 1.0)) ** 2
    return eta * d + (eta * c - np.sqrt(np.maximum(k, 0.0)))[:, None] * n, k, f0 + (1.0 - f0) * (1.0 - c) ** 5

def march(o, d, ior, tint, N, O, nb=NB):
    """Enter the stone, bounce inside, leave → (entry glint, exit point, exit dir, weight)."""
    tin, iin, tout, _ = cross(o, d, N, O)
    ent = (tin > 0.0) & (tin < tout)
    ni = N[iin]
    dr, _, f = fresnel(d, ni, 1.0 / ior, ior)
    glint = (f * ent)[:, None] * FL.env(d - 2.0 * np.sum(ni * d, 1)[:, None] * ni)
    w, act, p = TRANS * (1.0 - f * ent), ent.copy(), o + np.where(ent, tin, 0.0)[:, None] * d + 1e-6 * dr
    for _ in range(nb):
        t, i, _, _ = cross(p, dr, N, O, True)
        seg = np.where(act & np.isfinite(t), t, 0.0)
        p, w = p + seg[:, None] * dr, w * tint ** (seg / THICK)
        n, c = N[i], np.sum(N[i] * dr, 1)
        d2, k = fresnel(dr, -n, ior, ior)[:2]
        nd = np.where((k < 0.0)[:, None], dr - 2.0 * c[:, None] * n, d2)
        dr, act, p = np.where(act[:, None], nd, dr), act & (k < 0.0), p + 1e-6 * dr
    return glint, p, dr, w * (ent & ~act)

def main():
    """Render the sapphire hero shot: three chromatic paths + a photon caustic → PNG."""
    t0 = time.time()
    css = os.path.join(HERE, "..", "..", "design-system", "tokens.css")
    base, ior0 = hex_rgb(resolve_colors(css)["sapphire"]), CATEGORIES["sapphire"]["ior"]
    tint, BG = attenuation(base), lin(stage(512, token(open(css).read(), "--bg-interactive")))
    pos, cells = gem_cut()
    N, O = planes(pos, cells)
    R, U, F = camera(ELEV, AZIM)
    xy = (np.asarray(pos, float) @ np.stack([R, U, F], 1))[:, :2]
    ctr, sc = (xy.min(0) + xy.max(0)) / 2.0, SIZE * FIT / np.ptp(xy, 0).max()
    caustic = FL.caustic(march, ior0 * np.asarray(DISP), tint, N, O, NDIR, NPOS, NBP)
    print("planes %d · %d photons · pool %s" % (len(O), NDIR * NPOS, np.round([float(g.max()) for g in caustic], 2)))
    gy, gx = (np.mgrid[0:SIZE, 0:SIZE] + 0.5).reshape(2, -1)
    px, py = np.concatenate([gx + j for j in (-0.25, 0.25)]), np.concatenate([gy + j for j in (-0.25, 0.25)])
    ldir, lflux = FL.tent(NLIT)
    img = np.zeros((len(px), 3))
    for s in range(0, len(px), CHUNK):
        o = ((px[s:s + CHUNK] - SIZE / 2.0) / sc + ctr[0])[:, None] * R \
            + ((SIZE / 2.0 - py[s:s + CHUNK]) / sc + ctr[1] + BIAS)[:, None] * U + BACK * (-F)
        tin, _, tout, _ = cross(o, F, N, O)
        gem = (tin > 0.0) & (tin < tout)
        lit = FL.direct(cross, o + ((FL.FLOOR_Y - o[:, 1]) / F[1])[:, None] * F, ldir, lflux, N, O)
        gi, fi = np.nonzero(gem)[0], np.nonzero(~gem)[0]
        for j in range(3):
            glint, ep, ed, ew = march(o[gi], F, ior0 * DISP[j], tint[j], N, O)
            img[gi + s] += glint + ew[:, None] * FL.exit_rad(ep, ed, caustic[j], np.zeros((len(ep), 3)), BG)
            img[fi + s] += FL.exit_rad(o[fi], F, caustic[j], lit[fi], BG)
    out = (np.clip(srgb(aces(img.reshape(SPP, SIZE, SIZE, 3).mean(0))), 0, 1) * 255 + 0.5).astype(np.uint8)
    Image.fromarray(out).save(os.path.join(HERE, "hero-gem.png"))
    print("hero-gem.png %dx%d %.1fs px %d/%.1f/%d" % (SIZE, SIZE, time.time() - t0, out.min(), out.mean(), out.max()))

if __name__ == "__main__":
    main()
