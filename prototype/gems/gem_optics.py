"""ADAM/GEMS — prototype/gems/gem_optics.py · software twin of the shipped gem material."""
# [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · mirrors gem-scene.js api.surface()
# and gem-env.js api.stage(): the same transmission/thickness/attenuation numbers, the same
# ACES tone map at exposure 0.95, the same light stage behind the stone.
# — Material: view ray refracted at the entry facet, marched `thickness`, Beer-Lambert attenuated —
# — Fire: the march is sampled at ior ×0.985 / 1.0 / 1.015 and R/G/B taken from each sample —
# — Stage: token base + soft bright glow above centre + soft dark contact pool under the gem —
import numpy as np

ENV_LO = np.array([0.05, 0.06, 0.09])    # studio shell — what an unlit facet mirrors
ENV_HI = 14.0                            # tent emitter radiance (HDR: survives ACES as a glint)
KEY = np.array([0.42, 0.71, 0.57])       # directional key light (gem-scene.js: position 3, 5, 4)
ENV_I, EMIT = 1.6, 0.12                  # envMapIntensity · emissive = base × EMIT
TRANS, THICK, ATTD = 0.95, 0.9, 0.6      # transmission · march distance · attenuation distance
TINT, EXPO = 0.3, 0.95                   # attenuationColor = base lerped TINT toward white
DISP = (0.985, 1.0, 1.015)               # ior multipliers → R, G, B (chromatic dispersion)
ACES_IN = np.array([[.59719, .35458, .04823], [.076, .90834, .01566], [.0284, .13383, .83777]])
ACES_OUT = np.array([[1.60475, -.53108, -.07367], [-.10208, 1.10813, -.00605], [-.00327, -.07276, 1.07602]])


def unit(v):
    """Normalize a 3-vector (zero-safe)."""
    n = float(np.linalg.norm(v))
    return v / n if n > 1e-12 else v


def refract(d, n, eta):
    """Snell: bend ray d into a surface of normal n (eta = n1/n2), grazing-safe."""
    c = -float(np.dot(n, d))
    k = max(1.0 - eta * eta * (1.0 - c * c), 0.0)
    return eta * d + (eta * c - np.sqrt(k)) * n


def envdir(d):
    """Studio env: near-black shell + a high ring tent of small bright emitters (gem-env.js)."""
    band = np.exp(-((np.clip(d[1], 0.0, 1.0) - 0.85) / 0.22) ** 2)
    speck = np.clip(np.cos(np.arctan2(d[2], d[0]) * 7.0), 0.0, 1.0) ** 8
    return ENV_LO + ENV_HI * band * (0.05 + 0.95 * speck)


def attenuation(base):
    """attenuationColor = base lerped TINT toward white → transmittance over the march."""
    c = lin(base)
    return (c * (1.0 - TINT) + TINT) ** (THICK / ATTD)


def stage(size, bg=None):
    """Light stage backdrop: token base + soft bright glow above centre + contact pool below."""
    bg = np.full(3, 0.88) if bg is None else np.asarray(bg, float)
    y, x = np.mgrid[0:size, 0:size] / (size - 1.0)
    glow = np.clip(1.0 - np.hypot(x - 0.5, (y - 0.22) * 1.1) / 0.72, 0.0, 1.0) * 0.72
    pool = np.clip(1.0 - np.hypot(x - 0.5, (y - 0.86) * 2.2) / 0.30, 0.0, 1.0) * 0.26
    return (bg + (1.0 - bg) * glow[..., None]) * (1.0 - 0.70 * pool[..., None])


def bilin(img, x, y):
    """Bilinear sample of an HxW(×3) image at fractional coords (edge-clamped)."""
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = (x - x0)[..., None], (y - y0)[..., None]
    x0, y0 = np.clip(x0, 0, img.shape[1] - 2), np.clip(y0, 0, img.shape[0] - 2)
    a, b = img[y0, x0], img[y0, x0 + 1]
    c, d = img[y0 + 1, x0], img[y0 + 1, x0 + 1]
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy


def lin(c):
    """sRGB → linear: the space attenuation and tone mapping work in."""
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def srgb(c):
    """Linear → sRGB for the 8-bit output."""
    c = np.clip(c, 0.0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1.0 / 2.4) - 0.055)


def aces(c):
    """three.js ACESFilmicToneMapping at the rig exposure."""
    v = (np.clip(c, 0.0, None) * EXPO) @ ACES_IN.T
    v = (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.4329510) + 0.238081)
    return np.clip(v @ ACES_OUT.T, 0.0, 1.0)


def film(n, v):
    """Thin-film specular tint (gem-scene.js: iridescence .45 · film ior 1.9 · 640 nm)."""
    t = 4.0 * np.pi * 1.9 * 640.0 * (1.0 - (1.0 - max(float(np.dot(n, v)), 0.0) ** 2) / 3.61) ** 0.5 / 620.0
    return 1.0 + 0.45 * np.cos(t + np.array([0.0, 2.1, 4.2]))


def surface(n, base, ior, view):
    """Flat-facet surface: mirror env + fresnel rim + tight key glint + thin-film sheen."""
    v = unit(view)
    ndv = max(float(np.dot(n, v)), 0.0)
    f0 = ((ior - 1.0) / (ior + 1.0)) ** 2
    fres = f0 + (1.0 - f0) * (1.0 - ndv) ** 5
    glint = max(float(np.dot(n, unit(KEY + v))), 0.0) ** 60 * 2.0
    spec = (envdir(2.0 * ndv * n - v) * ENV_I + glint) * (0.35 + 0.65 * fres)
    return EMIT * lin(base) + spec * film(n, v)
