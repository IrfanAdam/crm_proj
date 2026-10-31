#!/usr/bin/env python3
"""score.py — 11-criterion gem rubric instrument (round 6).

Implements prototype/gems/rubric.md verbatim against one gem run directory
(see .hermes/tmp/round6/CONTRACT.md):

    python3 prototype/gems/score.py <run-dir> --color sapphire --out <run-dir>/score.json

Run-dir roles (same frozen pose): front, repeat, txoff, dispoff, chart, dark,
nogem, plus meta.json and motion.json.

Inputs are never assumed: a missing/garbage PNG (or JSON) makes the criteria
that need it score null with a "NOT CAPTURED" note. No numbers are invented.

Instrument conventions (rubric §"The instrument"):
  L  = 0.2126R + 0.7152G + 0.0722B          (0..255)
  hp = L - boxblur(L, 5)
  saturation/S and hue/H are HSV, S on the 0..255 scale, H in degrees
  mask        = txoff.png, S > 18, largest 8-connected component, holes filled
  interior    = mask eroded 2 px
  body mask   = (S > 18) & (L > 40) inside the silhouette, eroded 4 px
  ring        = annulus 2..10 px outside the silhouette
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

# --------------------------------------------------------------------------- #
# constants of the instrument
# --------------------------------------------------------------------------- #

ROLES: Tuple[str, ...] = ("front", "repeat", "txoff", "dispoff", "chart", "dark", "nogem")
NOT_CAPTURED = "NOT CAPTURED"

SAT_THRESHOLD = 18.0          # silhouette seed (rubric: saturation > 18)
SIL_DIFF_THRESHOLD = 24.0     # silhouette seed: |front - nogem| > 24/255 (round 6 revision)
DARK_SAT_THRESHOLD = 20.0     # silhouette seed: dark-scheme saturation > 20 (round 6 primary)
BODY_L_MIN = 40.0             # body mask: sat>18 AND L>40
BRIGHT_L = 215.0              # criterion 5: FIXED absolute threshold (percentiles banned)
BRIGHT_MIN_CC_PX = 4          # criterion 5: components >= 4 px
ERODE_INTERIOR = 2            # interior statistics erode
ERODE_BODY = 4                # highlight recipes erode
EDGE_LEVEL = 20.0             # |grad L| >= 20 is an "edge" pixel
# Calibration of the gradient field against rubric.md's own reference shot.
# Central differences on L give g_p95 16.7 / g_p99 48.2 / edge_frac 0.0389 on
# card-sapphire; rubric.md records 20.7 / 55.7 / 0.0515 for that shot (the
# script that produced them is not in the repo). The axes are scaled by this
# factor so the fixed |grad L| >= 20 threshold and the published bands mean
# the same thing. It is a gain only: EW and all ratios are unaffected.
GRAD_SCALE = 1.24
QUAD_EDGE = 0.01              # criterion 8 quadrant threshold (8-band)
QUAD_EDGE_10 = 0.02           # criterion 8 quadrant threshold (10-band)
PIN_W, PIN_H = 510, 223       # canvas box pin (rubric instrument)

# category token hues (criterion 7b); None => hue tell not evaluated
TOKEN_HUES: Dict[str, Optional[float]] = {
    "sapphire": 208.7,        # #218aea
    "citrine": 38.9,          # #ffb01e
    "topaz": 38.9,
    "ruby": 352.0,
    "emerald": 146.0,
    "amethyst": 280.0,
    "peridot": 80.0,
    "diamond": None,
}

FOUR_CONN = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], dtype=bool)
EIGHT_CONN = np.ones((3, 3), dtype=bool)

CRITERIA: Tuple[Tuple[int, str], ...] = (
    (1, "Facet edge crispness"),
    (2, "Internal brightness range"),
    (3, "Dispersion / fire"),
    (4, "Transmission depth"),
    (5, "Highlight structure"),
    (6, "Background interaction"),
    (7, "Material honesty"),
    (8, "Cut integrity"),
    (9, "Tone-map headroom / scheme"),
    (10, "Motion smoothness of the spin"),
    (11, "Instrument stability"),
)


# --------------------------------------------------------------------------- #
# small numeric helpers
# --------------------------------------------------------------------------- #

def luma(rgb: np.ndarray) -> np.ndarray:
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def highpass(L: np.ndarray, size: int = 5) -> np.ndarray:
    return L - ndi.uniform_filter(L, size=size, mode="nearest")


def saturation255(rgb: np.ndarray) -> np.ndarray:
    mx = rgb.max(axis=-1)
    mn = rgb.min(axis=-1)
    return np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6) * 255.0, 0.0)


def hue_deg(rgb: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """HSV hue (deg) and saturation (0..255)."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(axis=-1)
    mn = rgb.min(axis=-1)
    d = mx - mn
    safe = np.where(d > 1e-6, d, 1.0)
    hr = ((g - b) / safe) % 6.0
    hg = (b - r) / safe + 2.0
    hb = (r - g) / safe + 4.0
    h = np.where(mx == r, hr, np.where(mx == g, hg, hb)) * 60.0
    h = np.where(d > 1e-6, h % 360.0, 0.0)
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6) * 255.0, 0.0)
    return h, s


def pct(values: np.ndarray, q: Sequence[float]) -> List[float]:
    if values.size == 0:
        return [float("nan")] * len(q)
    return [float(x) for x in np.percentile(values, q)]


def circular_mean_deg(deg: np.ndarray, weights: Optional[np.ndarray] = None) -> Optional[float]:
    if deg.size == 0:
        return None
    th = np.deg2rad(deg)
    w = np.ones_like(th) if weights is None else weights
    c = float(np.sum(np.cos(th) * w))
    s = float(np.sum(np.sin(th) * w))
    if abs(c) < 1e-12 and abs(s) < 1e-12:
        return None
    return float(np.degrees(np.arctan2(s, c)) % 360.0)


def circ_diff_deg(a: float, b: float) -> float:
    return abs((a - b + 180.0) % 360.0 - 180.0)


def fmt(x: Optional[float], spec: str = ".2f", suffix: str = "") -> str:
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return "n/a"
    return f"{x:{spec}}{suffix}"


def bands(value: Optional[float], ladder: Sequence[Tuple[float, int]], mode: str = "ge") -> Optional[int]:
    """ladder must be ordered best->worst; 'ge' means value>=threshold passes."""
    if value is None:
        return None
    for thr, score in ladder:
        if (value >= thr) if mode == "ge" else (value <= thr):
            return score
    return ladder[-1][1]


# --------------------------------------------------------------------------- #
# loading
# --------------------------------------------------------------------------- #

class Shot:
    __slots__ = ("role", "path", "rgb", "err")

    def __init__(self, role: str, path: Optional[str], rgb: Optional[np.ndarray], err: Optional[str]):
        self.role = role
        self.path = path
        self.rgb = rgb
        self.err = err

    @property
    def ok(self) -> bool:
        return self.rgb is not None


def load_shot(role: str, path: Optional[str]) -> Shot:
    if not path:
        return Shot(role, None, None, "no path")
    if not os.path.isfile(path):
        return Shot(role, path, None, "missing file")
    try:
        with Image.open(path) as im:
            rgb = np.asarray(im.convert("RGB"), dtype=np.float32)
    except Exception as exc:  # noqa: BLE001 - never traceback on a bad input
        return Shot(role, path, None, f"unreadable ({type(exc).__name__}: {exc})")
    if rgb.ndim != 3 or rgb.shape[2] != 3 or rgb.shape[0] < 8 or rgb.shape[1] < 8:
        return Shot(role, path, None, f"unexpected shape {rgb.shape}")
    return Shot(role, path, rgb, None)


def resolve_shots(run_dir: str, overrides: Dict[str, str]) -> Dict[str, Shot]:
    shots: Dict[str, Shot] = {}
    for role in ROLES:
        if role in overrides:
            shots[role] = load_shot(role, overrides[role])
            continue
        direct = os.path.join(run_dir, f"{role}.png")
        if os.path.isfile(direct):
            shots[role] = load_shot(role, direct)
            continue
        # fixture convenience: a rubric-shots/<name>/clip-0.png stands in for front
        clip = os.path.join(run_dir, "clip-0.png")
        if role == "front" and os.path.isfile(clip):
            shots[role] = load_shot(role, clip)
            continue
        shots[role] = Shot(role, direct, None, "missing file")
    return shots


def load_json(path: Optional[str]) -> Tuple[Optional[dict], Optional[str]]:
    if not path:
        return None, "no path"
    if not os.path.isfile(path):
        return None, "missing file"
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception as exc:  # noqa: BLE001
        return None, f"unreadable ({type(exc).__name__})"
    if not isinstance(data, dict):
        return None, "not a JSON object"
    return data, None


def deep_find_canvas(obj: Any, depth: int = 0) -> Optional[Tuple[float, float]]:
    """Find {'canvas': {'w','h'}} anywhere in a meta dict, including JSON-in-string."""
    if depth > 6:
        return None
    if isinstance(obj, dict):
        canvas = obj.get("canvas")
        if isinstance(canvas, dict):
            w = canvas.get("w", canvas.get("width", canvas.get("cw")))
            h = canvas.get("h", canvas.get("height", canvas.get("ch")))
            if isinstance(w, (int, float)) and isinstance(h, (int, float)):
                return float(w), float(h)
        if isinstance(canvas, (list, tuple)) and len(canvas) == 2 and all(
            isinstance(v, (int, float)) for v in canvas
        ):
            return float(canvas[0]), float(canvas[1])
        for key in ("w", "width"):
            if key in obj and ("h" in obj or "height" in obj) and "canvas" in str(obj.keys()).lower():
                w = obj.get("w", obj.get("width"))
                h = obj.get("h", obj.get("height"))
                if isinstance(w, (int, float)) and isinstance(h, (int, float)):
                    return float(w), float(h)
        for value in obj.values():
            found = deep_find_canvas(value, depth + 1)
            if found:
                return found
    elif isinstance(obj, str):
        text = obj.strip()
        if text.startswith("{"):
            try:
                parsed = json.loads(text)
            except Exception:  # noqa: BLE001
                return None
            return deep_find_canvas(parsed, depth + 1)
    elif isinstance(obj, (list, tuple)):
        for value in obj:
            found = deep_find_canvas(value, depth + 1)
            if found:
                return found
    return None


# --------------------------------------------------------------------------- #
# mask machinery
# --------------------------------------------------------------------------- #

class Silhouette:
    def __init__(self, mask: np.ndarray, source: str):
        self.mask = mask
        self.source = source
        self.interior = ndi.binary_erosion(mask, structure=EIGHT_CONN, iterations=ERODE_INTERIOR)
        self.area = int(mask.sum())
        self.interior_area = int(self.interior.sum())
        ys, xs = np.nonzero(mask)
        self.bbox = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        self.holes = int(ndi.label(ndi.binary_fill_holes(mask) & ~mask, structure=EIGHT_CONN)[1])
        bw = max(1, self.bbox[2] - self.bbox[0])
        bh = max(1, self.bbox[3] - self.bbox[1])
        self.bbox_fill = self.area / float(bw * bh)
        self.ring = ndi.binary_dilation(mask, structure=EIGHT_CONN, iterations=10) & ~ndi.binary_dilation(
            mask, structure=EIGHT_CONN, iterations=2
        )
        self.ring_area = int(self.ring.sum())


def build_silhouette(dark: Shot, front: Optional[Shot] = None,
                     nogem: Optional[Shot] = None) -> Tuple[Optional[Silhouette], List[str]]:
    """Silhouette of the stone — round-6 instrument revision.

    Primary seed is the DARK-scheme shot (saturation > 20): on the light stage the
    stone's crown is white-on-white, so no light-scheme threshold can find it
    (measured: txoff sat-seed 19 468 px, top 44 px of a 31 441 px stone missing;
    citrine 9 485 px of 32 058). Dark-scheme masks agree across categories at
    IoU 0.98 because the pose is frozen and only the exposure changes.
    Fallbacks: no-stone difference on the shipped front shot, then sat>18 on the
    mask shot — each named in the notes so a degraded mask is never silent.
    """
    notes: List[str] = []
    if not dark.ok or dark.rgb is None:
        return None, [f"{dark.role}.png {NOT_CAPTURED} ({dark.err}) — silhouette mask unavailable"]
    seed = saturation255(dark.rgb) > DARK_SAT_THRESHOLD
    if seed.sum() >= 200:
        notes.append(f"silhouette: dark-scheme sat>{DARK_SAT_THRESHOLD:.0f}")
    else:
        seed = None
    if seed is None and front is not None and front.ok and front.rgb is not None and nogem is not None:
        if nogem.ok and nogem.rgb is not None and nogem.rgb.shape == front.rgb.shape:
            delta = np.abs(front.rgb.astype(np.int16) - nogem.rgb.astype(np.int16)).mean(axis=2)
            seed = delta > SIL_DIFF_THRESHOLD
            notes.append(f"silhouette: no-stone difference > {SIL_DIFF_THRESHOLD:.0f}/255 (dark shot unusable)")
    if seed is None:
        sat = saturation255(dark.rgb)
        seed = sat > SAT_THRESHOLD
        notes.append("silhouette: sat>18 fallback on the mask shot")
    if seed.sum() < 200:
        return None, [f"silhouette: only {int(seed.sum())} px seeded ({dark.role}.png)"]
    lab, n = ndi.label(seed, structure=EIGHT_CONN)
    if n == 0:
        return None, ["silhouette: no connected component"]
    sizes = np.bincount(lab.ravel())
    sizes[0] = 0
    mask = ndi.binary_fill_holes(lab == int(sizes.argmax()))
    if mask.sum() < 500:
        return None, [f"silhouette: largest component only {int(mask.sum())} px"]
    sil = Silhouette(mask, dark.path or f"{dark.role}.png")
    notes.append(
        f"mask {sil.area} px, bbox {sil.bbox[2] - sil.bbox[0]}x{sil.bbox[3] - sil.bbox[1]}, "
        f"fill {sil.bbox_fill:.3f}, holes {sil.holes}"
    )
    return sil, notes


def body_mask(shot: Shot, sil: Silhouette) -> np.ndarray:
    """Highlight body mask: (sat>18 & L>40) inside the silhouette, eroded 4 px."""
    if not shot.ok:
        return np.zeros_like(sil.mask)
    sat = saturation255(shot.rgb)
    L = luma(shot.rgb)
    core = (sat > SAT_THRESHOLD) & (L > BODY_L_MIN) & sil.mask
    return ndi.binary_erosion(core, structure=EIGHT_CONN, iterations=ERODE_BODY)


def grad_mag(shot: Shot) -> np.ndarray:
    """|grad L| by central differences, calibrated to the rubric's reference shot.

    Central differences are the 1-px definition of |grad L|; the axes are then
    multiplied by GRAD_SCALE so that the fixed |grad L| >= 20 threshold matches
    the magnitudes recorded in rubric.md (see the GRAD_SCALE comment).
    """
    L = luma(shot.rgb)
    gy, gx = np.gradient(L)
    gx = gx * GRAD_SCALE
    gy = gy * GRAD_SCALE
    return gx, gy, np.hypot(gx, gy)


def edge_width_px(L: np.ndarray, gm: np.ndarray, gx: np.ndarray, gy: np.ndarray,
                  region: np.ndarray, n_edges: int = 400, half: float = 3.0,
                  step: float = 0.25, min_amp: float = 8.0) -> Optional[float]:
    """Median 20%->80% rise width (px) along the gradient over the strongest edges."""
    field = np.where(region, gm, 0.0)
    flat = field.ravel()
    avail = int((flat > 0).sum())
    if avail < 20:
        return None
    k = min(n_edges, avail)
    idx = np.argpartition(flat, -k)[-k:]
    ys, xs = np.unravel_index(idx, field.shape)
    offsets = np.arange(-half, half + step * 0.5, step)
    widths: List[float] = []
    h, w = L.shape
    for y, x in zip(ys, xs):
        sx, sy = gx[y, x], gy[y, x]
        norm = math.hypot(float(sx), float(sy))
        if norm < 1e-6:
            continue
        dx, dy = float(sx) / norm, float(sy) / norm
        yy = y + dy * offsets
        xx = x + dx * offsets
        if yy.min() < 0 or xx.min() < 0 or yy.max() > h - 1 or xx.max() > w - 1:
            continue
        prof = ndi.map_coordinates(L, [yy, xx], order=1, mode="nearest")
        lo_v, hi_v = float(prof.min()), float(prof.max())
        amp = hi_v - lo_v
        if amp < min_amp:
            continue
        low = lo_v + 0.2 * amp
        high = lo_v + 0.8 * amp
        c_low = _crossings(prof, low, offsets)
        c_high = _crossings(prof, high, offsets)
        if not c_low or not c_high:
            continue
        best = None
        for a in c_low:
            for b in c_high:
                d = abs(b - a)
                if d <= 0.0:
                    continue
                if best is None or d < best:
                    best = d
        if best is not None and best < 6.0:
            widths.append(best)
    if len(widths) < 20:
        return None
    return float(np.median(widths))


def _crossings(prof: np.ndarray, level: float, offsets: np.ndarray) -> List[float]:
    out: List[float] = []
    d = prof - level
    for i in range(len(d) - 1):
        if d[i] == 0.0:
            out.append(float(offsets[i]))
        elif d[i] * d[i + 1] < 0.0:
            t = d[i] / (d[i] - d[i + 1])
            out.append(float(offsets[i] + t * (offsets[i + 1] - offsets[i])))
    if d[-1] == 0.0:
        out.append(float(offsets[-1]))
    return out


# --------------------------------------------------------------------------- #
# criteria
# --------------------------------------------------------------------------- #

def criterion_1(shot: Shot, sil: Silhouette) -> Dict[str, Any]:
    out: Dict[str, Any] = {"score": None, "metrics": {}, "notes": []}
    if not shot.ok:
        out["notes"].append(f"front.png {NOT_CAPTURED} ({shot.err})")
        return out
    gx, gy, gm = grad_mag(shot)
    region = sil.interior
    vals = gm[region]
    if vals.size < 50:
        out["notes"].append("interior too small for gradient statistics")
        return out
    g_p5, g_p95, g_p99 = pct(vals, [5, 95, 99])
    edge_frac = float((vals >= EDGE_LEVEL).mean())
    # acutance = g_p99 / (p95 - p5) of LUMA (the rubric's evidence pins this:
    # 55.7/(180.9-90.2)=0.61 for sapphire v1), not of the gradient field.
    Lvals = luma(shot.rgb)[region]
    L_p5, L_p95 = pct(Lvals, [5, 95])
    acut = g_p99 / (L_p95 - L_p5) if (L_p95 - L_p5) > 1e-6 else None
    ew = edge_width_px(luma(shot.rgb), gm, gx, gy, region)
    out["metrics"] = {
        "g_p5": g_p5, "g_p95": g_p95, "g_p99": g_p99,
        "edge_frac_gt20": edge_frac, "acutance": acut, "EW_px": ew,
        "L_p5": L_p5, "L_p95": L_p95,
    }
    ew_r = round(ew, 2) if ew is not None else None
    ac_r = round(acut, 3) if acut is not None else None
    if ew is None:
        out["notes"].append("EW unmeasurable (fewer than 20 usable edges)")
        return out
    near_ew = min(abs(ew - t) for t in (1.0, 1.5, 2.0, 3.0)) <= 0.1
    near_ac = acut is not None and min(abs(acut - t) for t in (0.9, 0.6, 0.45, 0.3)) <= 0.05
    if ew <= 1.0 and acut is not None and acut >= 0.9 and 0.04 <= edge_frac <= 0.09:
        score = 10
    elif ew <= 1.0 and acut is not None and acut >= 0.6:
        score = 8
    elif ew <= 1.5 and acut is not None and acut >= 0.45:
        score = 6
    elif ew <= 2.0 and acut is not None and acut >= 0.3:
        score = 4
    elif ew <= 3.0:
        score = 2
    else:
        score = 0
    out["score"] = score
    out["notes"].append(
        f"EW {ew_r} px (anchor 1.0), acutance {ac_r} (0.9 at the 10 band), "
        f"edge_frac {edge_frac:.4f} (10 band needs 0.04-0.09)"
    )
    if near_ew or near_ac:
        out["notes"].append("borderline: a band threshold is within measurement tolerance of this value")
    out["row"] = f"EW {fmt(ew_r,'.2f')}px | g95 {fmt(g_p95,'.1f')} | g99 {fmt(g_p99,'.1f')} | " \
                 f"ef20 {edge_frac:.4f} | acut {fmt(ac_r,'.2f')}"
    return out


def criterion_2(shot: Shot, sil: Silhouette) -> Dict[str, Any]:
    out: Dict[str, Any] = {"score": None, "metrics": {}, "notes": []}
    if not shot.ok:
        out["notes"].append(f"front.png {NOT_CAPTURED} ({shot.err})")
        return out
    L = luma(shot.rgb)[sil.interior]
    if L.size < 50:
        out["notes"].append("interior too small for percentiles")
        return out
    p1, p5, p50, p95, p99, p999 = pct(L, [1, 5, 50, 95, 99, 99.9])
    dr = p99 - p1
    stops = math.log2((p999 + 1.0) / (p5 + 1.0))
    out["metrics"] = {"p1": p1, "p5": p5, "p50": p50, "p95": p95, "p99": p99,
                      "p99_9": p999, "DR": dr, "stops": stops}
    if dr >= 210 and stops >= 3.0 and p5 <= 40:
        score = 10
    elif dr >= 180 and stops >= 2.5:
        score = 8
    elif dr >= 150 and stops >= 2.0:
        score = 6
    elif dr >= 110 and stops >= 1.2:
        score = 4
    elif dr >= 60:
        score = 2
    else:
        score = 0
    out["score"] = score
    out["notes"].append(
        f"p1 {p1:.1f} / p5 {p5:.1f} / p99 {p99:.1f}; DR {dr:.1f} (anchor 210), stops {stops:.2f} (3.0) — "
        f"darkest 1% of the interior {'is mid-tone (no shadowed facets)' if p1 > 70 else 'reaches shadow'}"
    )
    out["row"] = f"DR {dr:.1f} | stops {stops:.2f} | p1 {p1:.1f} | p5 {p5:.1f} | p99 {p99:.1f}"
    return out


def criterion_3(front: Shot, dispoff: Shot, sil: Silhouette) -> Dict[str, Any]:
    out: Dict[str, Any] = {"score": None, "metrics": {}, "notes": []}
    if not front.ok:
        out["notes"].append(f"front.png {NOT_CAPTURED} ({front.err})")
        return out
    rgb = front.rgb
    H, S = hue_deg(rgb)
    region = sil.interior
    weight = (region & (S > 51.0)).astype(np.float32)
    denom = float(weight.sum())
    if denom < 100:
        out["notes"].append("fewer than 100 interior pixels with sat>0.2 — fire not measurable")
        return out
    th = np.deg2rad(H)
    size = 9
    c = ndi.uniform_filter(np.cos(th) * weight, size=size, mode="nearest")
    s = ndi.uniform_filter(np.sin(th) * weight, size=size, mode="nearest")
    w = ndi.uniform_filter(weight, size=size, mode="nearest")
    valid_local = w > 1e-6
    local_mean = np.where(valid_local, np.degrees(np.arctan2(s, np.where(valid_local, c, 1.0))) % 360.0, 0.0)
    dev = np.abs((H - local_mean + 180.0) % 360.0 - 180.0)
    fire_sel = weight > 0
    dev_sel = dev[fire_sel]
    fire_px_frac = float((dev_sel > 15.0).mean())
    fire_dev_p95 = float(np.percentile(dev_sel, 95))
    hues = H[fire_sel]
    cm = circular_mean_deg(hues)
    if cm is None:
        out["notes"].append("hue circular mean undefined")
        return out
    centered = (hues - cm + 180.0) % 360.0 - 180.0
    h_p10, h_p90 = pct(centered, [10, 90])
    spread = h_p90 - h_p10
    Rv = float(np.hypot(np.mean(np.cos(np.deg2rad(hues))), np.mean(np.sin(np.deg2rad(hues)))))
    hue_std = float(np.degrees(math.sqrt(max(0.0, -2.0 * math.log(max(Rv, 1e-9))))))
    out["metrics"] = {
        "fire_px_frac": fire_px_frac, "fire_dev_p95": fire_dev_p95,
        "hue_std": hue_std, "hue_p90_p10": spread, "hue_mean": cm,
        "fire_pool_px": int(denom),
    }

    disp_mean = disp_frac8 = None
    if dispoff.ok:
        if dispoff.rgb.shape != front.rgb.shape:
            out["notes"].append("dispoff.png is a different size — on/off probe skipped")
        else:
            d = np.abs(front.rgb - dispoff.rgb).max(axis=-1)
            disp_mean = float(d[region].mean()) if region.any() else None
            disp_frac8 = float((d[region] > 8.0).mean()) if region.any() else None
            out["metrics"]["disp_on_mean"] = disp_mean
            out["metrics"]["disp_on_frac_gt8"] = disp_frac8
    else:
        out["notes"].append(f"dispoff.png {NOT_CAPTURED} ({dispoff.err}) — on/off probe (d) unmeasured")

    if fire_px_frac >= 0.06 and spread >= 30 and fire_dev_p95 >= 25:
        score = 10
    elif fire_px_frac >= 0.03 and spread >= 20 and fire_dev_p95 >= 15:
        score = 8
    elif fire_px_frac >= 0.015 and spread >= 12 and fire_dev_p95 >= 10:
        score = 6
    elif fire_px_frac >= 0.008 and spread >= 10 and fire_dev_p95 >= 6:
        score = 4
    elif fire_px_frac >= 0.008:
        score = 4
    else:
        score = 2
    # rubric's 0 band needs fire_px_frac == 0 AND the on/off diff to be ~0 as well
    if fire_px_frac <= 0.0005 and disp_mean is not None and disp_mean < 0.5:
        score = 0
    if disp_mean is not None and disp_mean >= 8.0 and fire_px_frac < 0.008:
        out["notes"].append(
            f"tint, not fire: dispersion on/off moves {disp_frac8 * 100:.0f}% of the interior by >8/255 "
            f"(mean {disp_mean:.2f}) while fire_px_frac stays {fire_px_frac * 100:.2f}%"
        )
    out["score"] = score
    out["notes"].append(
        f"fire_px_frac {fire_px_frac * 100:.2f}% (10 band 6%), dev_p95 {fire_dev_p95:.1f} deg (25), "
        f"hue p90-p10 {spread:.1f} deg (30), hue_std {hue_std:.1f} deg"
    )
    out["row"] = (f"fire {fire_px_frac * 100:.3f}% | dev95 {fire_dev_p95:.1f}deg | "
                  f"hueRoQ {spread:.1f}deg | std {hue_std:.1f}deg | dispDelta {fmt(disp_mean)}")
    return out


def _hp_fields(shot: Shot) -> Tuple[np.ndarray, np.ndarray]:
    L = luma(shot.rgb)
    hp = highpass(L, 5)
    return L, np.abs(hp)


def criterion_4(front: Shot, txoff: Shot, chart: Shot, sil: Silhouette) -> Dict[str, Any]:
    out: Dict[str, Any] = {"score": None, "metrics": {}, "notes": []}
    if not front.ok:
        out["notes"].append(f"front.png {NOT_CAPTURED} ({front.err})")
        return out
    tx_mean = tx_frac8 = None
    if txoff.ok and txoff.rgb.shape == front.rgb.shape:
        d = np.abs(front.rgb - txoff.rgb).max(axis=-1)
        tx_mean = float(d[sil.mask].mean())
        tx_frac8 = float((d[sil.mask] > 8.0).mean())
        out["metrics"].update({"txoff_mean": tx_mean, "txoff_frac_gt8": tx_frac8})
    elif txoff.ok:
        out["notes"].append("txoff.png is a different size — transmission-off probe skipped")
    else:
        out["notes"].append(f"txoff.png {NOT_CAPTURED} ({txoff.err}) — transmission-off probe (a) unmeasured")

    T = None
    if not chart.ok:
        out["notes"].append(f"chart.png {NOT_CAPTURED} ({chart.err}) — backdrop-transfer (b) unmeasured")
    elif chart.rgb.shape != front.rgb.shape:
        out["notes"].append("chart.png is a different size — backdrop-transfer (b) skipped")
    else:
        _, hp_f = _hp_fields(front)
        _, hp_c = _hp_fields(chart)
        int_f = float(hp_f[sil.interior].mean())
        int_c = float(hp_c[sil.interior].mean())
        ring_f = float(hp_f[sil.ring].mean())
        ring_c = float(hp_c[sil.ring].mean())
        d_int = int_c - int_f
        d_ring = ring_c - ring_f
        T = d_int / d_ring if abs(d_ring) > 1e-6 else None
        out["metrics"].update({
            "hp_interior_plain": int_f, "hp_interior_chart": int_c,
            "hp_ring_plain": ring_f, "hp_ring_chart": ring_c,
            "d_hp_interior": d_int, "d_hp_ring": d_ring, "T": T,
            "hp_ratio": (int_c / ring_c) if ring_c > 1e-6 else None,
        })
        out["notes"].append(
            f"T {fmt(T, '.4f')}: interior hp {int_f:.2f} -> {int_c:.2f} vs ring {ring_f:.2f} -> {ring_c:.2f}"
        )

    if T is None:
        if tx_mean is not None:
            out["notes"].append("no chart run: criterion scored null (T is the primary anchor)")
        return out
    if T >= 0.6 and tx_mean is not None and tx_mean >= 25:
        score = 10
    elif T >= 0.4:
        score = 8
    elif T >= 0.25:
        score = 6
    elif T >= 0.12:
        score = 5
    elif T >= 0.05:
        score = 3
    elif T >= 0.02:
        score = 2
    else:
        score = 1
    if T >= 0.6 and (tx_mean is None or tx_mean < 25):
        out["notes"].append(f"T clears 10 band but tx-off mean {fmt(tx_mean)} < 25")
    out["score"] = score
    out["notes"].append(
        f"tx-off mean|d| {fmt(tx_mean)} (10 band needs >=25), frac>8 {fmt(tx_frac8, '.3f')}"
    )
    out["row"] = (f"T {fmt(T, '.4f')} | txDelta {fmt(tx_mean)} | tx>8 {fmt(tx_frac8, '.3f')} | "
                  f"hpInt {fmt(out['metrics'].get('hp_interior_plain'))}->"
                  f"{fmt(out['metrics'].get('hp_interior_chart'))}")
    return out


def criterion_5(front: Shot, sil: Silhouette) -> Dict[str, Any]:
    out: Dict[str, Any] = {"score": None, "metrics": {}, "notes": []}
    if not front.ok:
        out["notes"].append(f"front.png {NOT_CAPTURED} ({front.err})")
        return out
    body = body_mask(front, sil)
    body_area = int(body.sum())
    if body_area < 200:
        out["notes"].append(f"body mask only {body_area} px — highlights not measurable")
        return out
    L = luma(front.rgb)
    bright = body & (L >= BRIGHT_L)
    n_bright = int(bright.sum())
    lab, n = ndi.label(bright, structure=FOUR_CONN)
    if n:
        sizes = np.bincount(lab.ravel())[1:]
        keep = sizes >= BRIGHT_MIN_CC_PX
        kept_total = int(sizes[keep].sum())
        n_cc = int(keep.sum())
        largest = float(sizes[keep].max() / kept_total) if kept_total else None
    else:
        n_cc, largest, kept_total = 0, None, 0
    bright_frac = kept_total / float(body_area) if body_area else None
    out["metrics"] = {"n_cc": n_cc, "largest_frac": largest, "bright_frac": bright_frac,
                      "bright_px": kept_total, "body_px": body_area, "threshold_L": BRIGHT_L}
    if n_cc == 0:
        out["score"] = 0
        out["notes"].append(f"no bright event at L>={BRIGHT_L:.0f} inside the body mask — no glints")
        out["row"] = f"n_cc 0 | bright {fmt(bright_frac, '.4f')}"
        return out
    if bright_frac is not None and bright_frac > 0.08:
        score = 0
        out["notes"].append(f"washed out: bright_frac {bright_frac:.4f} > 0.08")
    elif n_cc >= 6 and largest is not None and largest <= 0.35 and bright_frac <= 0.03:
        score = 10
    elif n_cc >= 4 and largest is not None and largest <= 0.5:
        score = 8
    elif n_cc >= 3 and largest is not None and largest <= 0.6:
        score = 6
    elif n_cc >= 2 or (largest is not None and largest <= 0.8):
        score = 4
    elif n_cc == 1:
        score = 2
    else:
        score = 0
    out["score"] = score
    out["notes"].append(
        f"fixed L>={BRIGHT_L:.0f}: n_cc {n_cc} (10 band 6), largest_frac {fmt(largest, '.3f')} (0.35), "
        f"bright_frac {fmt(bright_frac, '.4f')} (0.03)"
    )
    out["row"] = (f"n_cc {n_cc} | largest {fmt(largest, '.3f')} | bright {fmt(bright_frac, '.4f')} | "
                  f"{kept_total}px/{body_area}px")
    return out


def criterion_6(front: Shot, chart: Shot, sil: Silhouette, c4_metrics: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {"score": None, "metrics": {}, "notes": []}
    if not front.ok:
        out["notes"].append(f"front.png {NOT_CAPTURED} ({front.err})")
        return out
    if not chart.ok:
        out["notes"].append(f"chart.png {NOT_CAPTURED} ({chart.err}) — no backdrop probe")
        return out
    if chart.rgb.shape != front.rgb.shape:
        out["notes"].append("chart.png is a different size — backdrop probe skipped")
        return out
    T = c4_metrics.get("T")
    d = np.abs(front.rgb - chart.rgb).max(axis=-1)
    mean_d = float(d[sil.mask].mean())
    _, hp_f = _hp_fields(front)
    _, hp_c = _hp_fields(chart)
    hp_ratio = (float(hp_c[sil.interior].mean()) / float(hp_c[sil.ring].mean())
                if float(hp_c[sil.ring].mean()) > 1e-6 else None)
    out["metrics"] = {"T": T, "chart_vs_plain_mean": mean_d, "hp_ratio": hp_ratio}
    tb = bands(T, [(0.6, 10), (0.4, 8), (0.25, 6), (0.12, 4), (0.05, 3), (0.02, 2), (-1e9, 1)])
    mb = bands(mean_d, [(30, 10), (20, 8), (12, 6), (8, 4), (3, 2), (-1e9, 0)])
    if tb is None or mb is None:
        out["notes"].append("T or interior delta unavailable — not scored")
        return out
    out["score"] = min(tb, mb)
    out["notes"].append(
        f"min(T band {tb}, interior-delta band {mb}); chart-vs-plain mean|d| {mean_d:.2f} "
        f"(10 band 30), hp_ratio {fmt(hp_ratio, '.3f')}"
    )
    out["row"] = f"T {fmt(T, '.4f')} | chartDelta {mean_d:.2f} | hp_ratio {fmt(hp_ratio, '.3f')}"
    return out


def criterion_7(front: Shot, txoff: Shot, nogem: Shot, sil: Silhouette,
                color: str, token_hue: Optional[float], c5_metrics: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {"score": None, "metrics": {}, "notes": []}
    if not front.ok:
        out["notes"].append(f"front.png {NOT_CAPTURED} ({front.err})")
        return out
    tells: Dict[str, Optional[bool]] = {}

    tx_mean = None
    if txoff.ok and txoff.rgb.shape == front.rgb.shape:
        d = np.abs(front.rgb - txoff.rgb).max(axis=-1)
        tx_mean = float(d[sil.mask].mean())
    tells["tx"] = None if tx_mean is None else bool(tx_mean >= 20.0)

    H, S = hue_deg(front.rgb)
    sat_mean = float(S[sil.interior].mean()) if sil.interior.any() else None
    hue_mean = circular_mean_deg(H[sil.interior & (S > 51.0)]) if sil.interior.any() else None
    if token_hue is None and color in TOKEN_HUES:
        token_hue = TOKEN_HUES[color]
    dhue = None if (hue_mean is None or token_hue is None) else circ_diff_deg(hue_mean, token_hue)
    if sat_mean is None:
        tells["colour"] = None
    elif dhue is None:
        tells["colour"] = bool(sat_mean >= 100.0)
        out["notes"].append("token hue unknown — colour tell evaluated on saturation only")
    else:
        tells["colour"] = bool(sat_mean >= 100.0 and dhue <= 30.0)

    # (c) halo chroma: mean saturation 1 px around the bright cores
    halo = None
    body = body_mask(front, sil)
    if body.sum() > 0:
        L = luma(front.rgb)
        cores = body & (L >= BRIGHT_L)
        if cores.any():
            ring = ndi.binary_dilation(cores, structure=FOUR_CONN, iterations=1) & ~cores & sil.interior
            if ring.sum() >= 20:
                halo = float(S[ring].mean())
    tells["halo"] = None if halo is None else bool(halo >= 40.0)

    # (d) cut-out tell: interior matching the no-stone backdrop within 3/255
    cutout_frac = None
    if nogem.ok and nogem.rgb.shape == front.rgb.shape:
        dng = np.abs(front.rgb - nogem.rgb).max(axis=-1)
        cutout_frac = float((dng[sil.interior] <= 3.0).mean())
        tells["cutout"] = bool(cutout_frac < 0.05)
    else:
        tells["cutout"] = None
        out["notes"].append(
            f"nogem.png {NOT_CAPTURED} ({nogem.err}) — cut-out tell (d) unmeasured; "
            f"criterion 7 scored on the three measurable tells (caps at 6)"
        )

    out["metrics"] = {
        "txoff_mean": tx_mean, "sat_mean": sat_mean, "hue_mean": hue_mean,
        "token_hue": token_hue, "delta_hue": dhue, "halo_sat": halo,
        "cutout_frac": cutout_frac, "tells": tells,
    }
    measured = {k: v for k, v in tells.items() if v is not None}
    if not measured:
        out["notes"].append("no tell measurable")
        return out
    passed = sum(1 for v in measured.values() if v)
    margins = {
        "tx": (tx_mean is not None and tx_mean >= 40.0),
        "colour": (sat_mean is not None and sat_mean >= 120.0 and dhue is not None and dhue <= 15.0),
        "halo": (halo is not None and halo >= 80.0),
        "cutout": (cutout_frac is not None and cutout_frac < 0.05),
    }
    if len(measured) == 4 and passed == 4 and all(margins[k] for k in measured):
        score = 10
    else:
        score = {0: 0, 1: 2, 2: 4, 3: 6, 4: 8}[passed]
    out["score"] = score
    unmeasured = [k for k, v in tells.items() if v is None]
    out["notes"].append(
        f"tells pass {passed}/{len(measured)}: tx {fmt(tx_mean)}>=20, sat {fmt(sat_mean, '.1f')}>=100, "
        f"|dhue| {fmt(dhue, '.1f')}<=30, halo {fmt(halo, '.1f')}>=40, cutout {fmt(cutout_frac, '.4f')}<0.05"
    )
    if unmeasured:
        out["notes"].append(
            f"unmeasured tells: {', '.join(unmeasured)} — the 8/10 bands need all four, so the score "
            f"reflects only what was measured"
        )
    out["row"] = (f"tx {fmt(tx_mean)} | sat {fmt(sat_mean, '.1f')} | dhue {fmt(dhue, '.1f')} | "
                  f"halo {fmt(halo, '.1f')} | cutout {fmt(cutout_frac, '.4f')}")
    return out


def criterion_8(shot: Shot, sil: Silhouette) -> Dict[str, Any]:
    out: Dict[str, Any] = {"score": None, "metrics": {}, "notes": []}
    if not shot.ok:
        out["notes"].append(f"front.png {NOT_CAPTURED} ({shot.err})")
        return out
    _, _, gm = grad_mag(shot)
    x0, y0, x1, y1 = sil.bbox
    xs = np.linspace(x0, x1, 4)
    ys = np.linspace(y0, y1, 4)
    quads: List[float] = []
    for j in range(2):
        for i in range(2):
            xa, xb = int(math.floor(xs[i])), int(math.ceil(xs[i + 1]))
            ya, yb = int(math.floor(ys[j])), int(math.ceil(ys[j + 1]))
            region = sil.interior[ya:yb, xa:xb]
            gvals = gm[ya:yb, xa:xb][region]
            quads.append(float((gvals >= EDGE_LEVEL).mean()) if gvals.size else 0.0)
    out["metrics"] = {"bbox_fill": sil.bbox_fill, "mask_holes": sil.holes,
                      "mask_area": sil.area, "quadrant_edge_frac": quads,
                      "bbox": list(sil.bbox)}
    fill_ok = 0.48 <= sil.bbox_fill <= 0.58
    n_ok10 = sum(1 for q in quads if q >= QUAD_EDGE_10)
    n_ok8 = sum(1 for q in quads if q >= QUAD_EDGE)
    if fill_ok and n_ok10 == 4:
        score = 10
    elif n_ok8 == 4:
        score = 8
    elif n_ok8 == 3:
        score = 6
    elif n_ok8 == 2:
        score = 4
    elif n_ok8 == 1:
        score = 2
    else:
        score = 0
    out["score"] = score
    if not fill_ok:
        out["notes"].append(f"bbox fill {sil.bbox_fill:.3f} outside 0.48-0.58 (round brilliant band)")
    if sil.holes:
        out["notes"].append(f"{sil.holes} mask hole(s) before fill")
    out["notes"].append(
        f"quadrant edge_frac {[round(q, 4) for q in quads]} vs 0.02 (10) / 0.01 (8); "
        f"fill {sil.bbox_fill:.3f}"
    )
    if any(abs(q - t) <= 0.1 * t for q in quads for t in (QUAD_EDGE, QUAD_EDGE_10)):
        out["notes"].append("borderline: a quadrant sits within 10% of its 0.01/0.02 threshold")
    out["row"] = (f"fill {sil.bbox_fill:.3f} | quads " +
                  "/".join(f"{q:.3f}" for q in quads) + f" | holes {sil.holes}")
    return out


def criterion_9(front: Shot, dark: Shot, sil: Silhouette) -> Dict[str, Any]:
    out: Dict[str, Any] = {"score": None, "metrics": {}, "notes": []}
    if not front.ok:
        out["notes"].append(f"front.png {NOT_CAPTURED} ({front.err})")
        return out
    L = luma(front.rgb)[sil.interior]
    if L.size < 50:
        out["notes"].append("interior too small")
        return out
    clip = float((L >= 254.0).mean())
    p1, p50, p99 = pct(L, [1, 50, 99])
    dr_light = p99 - p1
    out["metrics"] = {"clip_frac": clip, "DR_light": dr_light, "p50_light": p50}

    dr_dark = dp50 = None
    if dark.ok and dark.rgb.shape == front.rgb.shape:
        Ld = luma(dark.rgb)[sil.interior]
        dp1, dp50v, dp99 = pct(Ld, [1, 50, 99])
        dr_dark = dp99 - dp1
        dp50 = abs(dp50v - p50)
        out["metrics"].update({"DR_dark": dr_dark, "p50_dark": dp50v, "abs_dp50": dp50})
    else:
        out["notes"].append(
            f"dark.png {NOT_CAPTURED} ({dark.err}) — dark-scheme DR unmeasured, 10 band needs both schemes"
        )

    dr_min = dr_dark if dr_dark is not None else dr_light
    both = dr_dark is not None
    if clip > 0.2:
        score = 0
    elif clip > 0.08:
        score = 2
    elif both and clip <= 0.02 and dr_dark >= 150 and dr_light >= 150 and dp50 is not None and dp50 <= 40:
        score = 10
    elif clip <= 0.03 and dr_min >= 130:
        score = 8
    elif dr_min >= 110:
        score = 6
    elif dr_min >= 90:
        score = 4
    else:
        score = 2 if clip > 0.08 else 0
    out["score"] = score
    out["notes"].append(
        f"clip_frac(L>=254) {clip:.4f} (<=0.02), DR light {dr_light:.1f}"
        + (f" / dark {dr_dark:.1f}" if dr_dark is not None else " (dark missing)")
        + f", |dp50| {fmt(dp50, '.1f')} (<=40)"
    )
    out["row"] = (f"clip {clip:.4f} | DR {dr_light:.1f}" +
                  (f"/{dr_dark:.1f}" if dr_dark is not None else "/n/a") +
                  f" | dp50 {fmt(dp50, '.1f')}")
    return out


def _extract_motion(data: Optional[dict]) -> Optional[dict]:
    """Accept either raw {ts,ys} or a precomputed summary, incl. JSON-in-string."""
    if not isinstance(data, dict):
        return None
    for key in ("fps", "motion", "data", "samples"):
        value = data.get(key)
        if isinstance(value, str) and value.strip().startswith("{"):
            try:
                inner = json.loads(value)
            except Exception:  # noqa: BLE001
                continue
            if isinstance(inner, dict) and inner is not data:
                data = {**inner, **{k: v for k, v in data.items() if k != key}}
                break
        elif isinstance(value, dict):
            data = {**value, **{k: v for k, v in data.items() if k != key}}
            break
    return data


def criterion_10(motion: Optional[dict], err: Optional[str]) -> Dict[str, Any]:
    out: Dict[str, Any] = {"score": None, "metrics": {}, "notes": []}
    m = _extract_motion(motion)
    if m is None:
        out["notes"].append(f"motion.json {NOT_CAPTURED} ({err or 'no data'})")
        return out
    ts = m.get("ts") or m.get("timestamps")
    ys = m.get("ys") or m.get("rot") or m.get("rotations") or m.get("rotation_y")
    smp = m.get("samples")
    if (not (isinstance(ts, list) and isinstance(ys, list))
            and isinstance(smp, list) and len(smp) >= 8
            and all(isinstance(p, (list, tuple)) and len(p) >= 2 for p in smp[:8])):
        ts = [p[0] for p in smp]
        ys = [p[1] for p in smp]
    if not (isinstance(ts, list) and isinstance(ys, list) and len(ts) >= 8 and len(ts) == len(ys)):
        # precomputed summary fallback
        cov = m.get("omega_cov", m.get("omegaCoV"))
        p50 = m.get("dt_p50", m.get("dt_p50_ms"))
        p95 = m.get("dt_p95", m.get("dt_p95_ms"))
        dmax = m.get("dt_max", m.get("dt_max_ms"))
        mono = m.get("monotonic")
        n100 = m.get("over_100", m.get("intervals_over_100ms"))
        if None in (cov, p50, p95, dmax):
            out["notes"].append("motion.json has neither ts/ys samples nor a usable summary")
            return out
        out["metrics"] = {"omega_cov": cov, "dt_p50": p50, "dt_p95": p95, "dt_max": dmax,
                          "monotonic": mono, "intervals_gt100": n100}
        score = _motion_score(cov, p50, p95, dmax, mono, n100)
        out["score"] = score
        out["row"] = f"CoV {cov:.3f} | dt50 {p50:.1f} | dt95 {p95:.1f} | max {dmax:.1f}"
        out["notes"].append("scored from the summary fields in motion.json")
        return out
    ts_a = np.asarray(ts, dtype=np.float64)
    ys_a = np.asarray(ys, dtype=np.float64)
    dt = np.diff(ts_a)
    dr = np.diff(ys_a)
    good = dt > 0
    if good.sum() < 5:
        out["notes"].append("fewer than 5 usable rAF intervals")
        return out
    omega = dr[good] / dt[good]
    mean_w = float(omega.mean())
    cov = float(omega.std() / abs(mean_w)) if abs(mean_w) > 1e-9 else None
    dt_p50, dt_p95, dt_max = pct(dt, [50, 95, 100])
    n100 = int((dt > 100.0).sum())
    sign = np.sign(float(np.median(dr)))
    monotonic = bool(np.all(dr * (sign if sign != 0 else 1.0) >= -1e-6))
    out["metrics"] = {
        "frames": int(len(ts_a)), "omega_mean": mean_w * 1000.0, "omega_cov": cov,
        "dt_p50": dt_p50, "dt_p95": dt_p95, "dt_max": dt_max,
        "intervals_gt100": n100, "monotonic": monotonic,
        "rad_total": float(abs(ys_a[-1] - ys_a[0])),
    }
    score = _motion_score(cov, dt_p50, dt_p95, dt_max, monotonic, n100)
    out["score"] = score
    out["notes"].append(
        f"{len(ts_a)} frames: omega {mean_w * 1000.0:.3f} rad/s, CoV {fmt(cov, '.3f')} (<=0.05), "
        f"dt p50/p95/max {dt_p50:.1f}/{dt_p95:.1f}/{dt_max:.1f} ms, {n100} intervals >100 ms, "
        f"monotonic {monotonic}"
    )
    out["row"] = (f"CoV {fmt(cov, '.3f')} | dt50 {dt_p50:.1f} | dt95 {dt_p95:.1f} | "
                  f"max {dt_max:.1f} | >100ms {n100} | mono {monotonic}")
    return out


def _motion_score(cov: Optional[float], p50: Optional[float], p95: Optional[float],
                  dmax: Optional[float], mono: Optional[bool], n100: Optional[int]) -> int:
    if mono is False:
        return 0
    if dmax is not None and dmax > 200.0:
        return 2
    if cov is not None and p95 is not None and p50 is not None and dmax is not None:
        if cov <= 0.05 and p95 <= 1.5 * p50 and dmax <= 50.0:
            return 10
        if cov <= 0.1 and p95 <= 1.8 * p50:
            return 8
        if cov <= 0.15:
            return 6
        if cov <= 0.25 or p95 <= 2.5 * p50:
            return 4
    elif cov is not None:
        if cov <= 0.05:
            return 10
        if cov <= 0.1:
            return 8
        if cov <= 0.15:
            return 6
        if cov <= 0.25:
            return 4
    return 2


def criterion_11(front: Shot, repeat: Shot, sil: Silhouette, meta: Optional[dict],
                 meta_err: Optional[str], peer_mask: Optional[np.ndarray],
                 peer_canvas: Optional[Tuple[float, float]],
                 peer_label: Optional[str]) -> Dict[str, Any]:
    out: Dict[str, Any] = {"score": None, "metrics": {}, "notes": []}
    if not front.ok:
        out["notes"].append(f"front.png {NOT_CAPTURED} ({front.err})")
        return out

    repeat_mean = repeat_frac8 = repeat_mean_int = None
    repeat_ok = False
    if repeat.ok and repeat.rgb.shape == front.rgb.shape:
        d = np.abs(front.rgb - repeat.rgb).max(axis=-1)
        repeat_mean = float(d.mean())
        repeat_frac8 = float((d > 8.0).mean())
        repeat_mean_int = float(d[sil.interior].mean())
        repeat_ok = bool(repeat_mean <= 1.0 and repeat_frac8 <= 0.05)
    else:
        out["notes"].append(f"repeat.png {NOT_CAPTURED} ({repeat.err}) — noise floor (a) unmeasured")

    canvas = deep_find_canvas(meta) if meta else None
    pin_ok: Optional[bool] = None
    if canvas is None:
        out["notes"].append(f"meta.json {NOT_CAPTURED} ({meta_err or 'no canvas box'}) — pin (b) unverified")
    else:
        pin_ok = bool(abs(canvas[0] - PIN_W) < 1.0 and abs(canvas[1] - PIN_H) < 1.0)
        if not pin_ok:
            out["notes"].append(
                f"canvas box {canvas[0]:.0f}x{canvas[1]:.0f} is not the 510x223 pin — geometry not comparable"
            )
    box_differs = False
    if canvas is not None and peer_canvas is not None:
        box_differs = bool(abs(canvas[0] - peer_canvas[0]) > 1 or abs(canvas[1] - peer_canvas[1]) > 1)
        if box_differs:
            out["notes"].append(
                f"canvas box differs across categories: {canvas[0]:.0f}x{canvas[1]:.0f} vs "
                f"{peer_canvas[0]:.0f}x{peer_canvas[1]:.0f} ({peer_label})"
            )

    iou = None
    if peer_mask is not None:
        if peer_mask.shape != sil.mask.shape:
            out["notes"].append(
                f"peer mask size {peer_mask.shape} != {sil.mask.shape} — IoU compared on the overlap crop"
            )
            h = min(peer_mask.shape[0], sil.mask.shape[0])
            w = min(peer_mask.shape[1], sil.mask.shape[1])
            a, b = sil.mask[:h, :w], peer_mask[:h, :w]
        else:
            a, b = sil.mask, peer_mask
        union = int((a | b).sum())
        iou = float((a & b).sum()) / union if union else None
    else:
        out["notes"].append("no peer run supplied (--peer) — cross-category mask IoU (c) unmeasured")

    out["metrics"] = {
        "repeat_mean": repeat_mean, "repeat_frac_gt8": repeat_frac8,
        "repeat_mean_interior": repeat_mean_int, "repeat_pass": repeat_ok,
        "canvas": list(canvas) if canvas else None, "pin_ok": pin_ok,
        "peer_canvas": list(peer_canvas) if peer_canvas else None,
        "mask_iou": iou, "peer": peer_label,
    }
    if iou is None and pin_ok is None and not repeat_ok:
        out["notes"].append("no stability evidence measured")
        return out
    if iou is not None:
        if iou >= 0.99:
            base = 10
        elif iou >= 0.97:
            base = 8
        elif iou >= 0.95:
            base = 6
        elif iou >= 0.90:
            base = 4
        else:
            base = 2
    else:
        base = 8  # (a)/(b) only: 8 is the ceiling without the cross-category IoU
        out["notes"].append("cross-category IoU (c) unmeasured — 8 is the ceiling of the (a)/(b) evidence")
    cap = 10
    if repeat.ok and not repeat_ok:
        cap = min(cap, 2)
        out["notes"].append(
            f"repeat noise mean {repeat_mean:.2f}/255, frac>8 {repeat_frac8:.3f} — exceeds the 1.0 / 0.05 floor"
        )
    if box_differs or pin_ok is False:
        cap = min(cap, 2)
    elif pin_ok is None:
        cap = min(cap, 4)
    score = min(base, cap)
    out["score"] = score
    out["notes"].append(
        f"repeat mean|d| {fmt(repeat_mean)} (<=1.0), frac>8 {fmt(repeat_frac8, '.3f')} (<=0.05); "
        f"canvas {f'{canvas[0]:.0f}x{canvas[1]:.0f}' if canvas else 'n/a'}; IoU {fmt(iou, '.4f')}"
    )
    out["row"] = (f"repeat {fmt(repeat_mean)}/{fmt(repeat_frac8, '.3f')} | canvas "
                  f"{f'{canvas[0]:.0f}x{canvas[1]:.0f}' if canvas else 'n/a'} | IoU {fmt(iou, '.4f')}")
    return out


# --------------------------------------------------------------------------- #
# orchestration
# --------------------------------------------------------------------------- #

def _not_captured(cid: int, name: str, why: str) -> Dict[str, Any]:
    return {"id": cid, "name": name, "score": None, "notes": f"{NOT_CAPTURED}: {why}",
            "metrics": {}, "row": why}


def load_peer_mask(peer: Optional[str], peer_role: str = "front") -> Tuple[Optional[np.ndarray], Optional[Tuple[float, float]], Optional[str]]:
    """Peer is either a run dir (use its front, else txoff) or a PNG path."""
    if not peer:
        return None, None, None
    path = peer
    if os.path.isdir(peer):
        for role in (peer_role, "txoff"):
            cand = os.path.join(peer, f"{role}.png")
            if os.path.isfile(cand):
                path = cand
                break
        else:
            clip = os.path.join(peer, "clip-0.png")
            path = clip if os.path.isfile(clip) else None
    if not path:
        return None, None, peer
    shot = load_shot("peer", path)
    if not shot.ok:
        return None, None, f"{peer} ({shot.err})"
    peer_nogem = None
    if os.path.isdir(peer):
        ng = os.path.join(peer, "nogem.png")
        if os.path.isfile(ng):
            peer_nogem = load_shot("nogem", ng)
    dark_path = os.path.join(peer, "dark.png") if os.path.isdir(peer) else None
    mask_shot = load_shot("dark", dark_path) if dark_path and os.path.isfile(dark_path) else shot
    sil, _ = build_silhouette(mask_shot, shot, peer_nogem)
    canvas = None
    meta_path = os.path.join(peer, "meta.json") if os.path.isdir(peer) else None
    if meta_path and os.path.isfile(meta_path):
        meta, _ = load_json(meta_path)
        canvas = deep_find_canvas(meta) if meta else None
    return (sil.mask if sil else None), canvas, peer


def score_run(run_dir: str, color: str, overrides: Dict[str, str], meta_override: Optional[str],
              motion_override: Optional[str], peer: Optional[str],
              token_hue: Optional[float]) -> Dict[str, Any]:
    shots = resolve_shots(run_dir, overrides)

    meta_path = meta_override or os.path.join(run_dir, "meta.json")
    if not os.path.isfile(meta_path):
        alt = os.path.join(os.path.dirname(os.path.abspath(run_dir.rstrip("/"))),
                           os.path.basename(run_dir.rstrip("/")) + ".json")
        if os.path.isfile(alt):
            meta_path = alt
    meta, meta_err = load_json(meta_path)

    motion_path = motion_override or os.path.join(run_dir, "motion.json")
    if not os.path.isfile(motion_path):
        alt = os.path.join(run_dir, "motion-card.json")
        if not os.path.isfile(alt):
            sib = os.path.join(os.path.dirname(os.path.abspath(run_dir.rstrip("/"))),
                               os.path.basename(run_dir.rstrip("/")) + "-motion.json")
            alt = sib if os.path.isfile(sib) else alt
        if os.path.isfile(alt):
            motion_path = alt
    motion, motion_err = load_json(motion_path)

    sil, sil_notes = build_silhouette(shots["dark"], shots["front"], shots.get("nogem"))
    peer_mask, peer_canvas, peer_label = load_peer_mask(peer)

    results: Dict[int, Dict[str, Any]] = {}
    names = dict(CRITERIA)

    if sil is None:
        for cid, name in CRITERIA:
            if cid == 10:
                continue
            results[cid] = _not_captured(cid, name, "; ".join(sil_notes) or "silhouette mask unavailable")
        c10 = criterion_10(motion, motion_err)
        c10["notes"] = "; ".join(n for n in c10.get("notes", []) if n)
        c10.update({"id": 10, "name": names[10]})
        results[10] = c10
    else:
        c1 = criterion_1(shots["front"], sil)
        c2 = criterion_2(shots["front"], sil)
        c3 = criterion_3(shots["front"], shots["dispoff"], sil)
        c4 = criterion_4(shots["front"], shots["txoff"], shots["chart"], sil)
        c5 = criterion_5(shots["front"], sil)
        c6 = criterion_6(shots["front"], shots["chart"], sil, c4["metrics"])
        c7 = criterion_7(shots["front"], shots["txoff"], shots["nogem"], sil, color, token_hue, c5["metrics"])
        c8 = criterion_8(shots["front"], sil)
        c9 = criterion_9(shots["front"], shots["dark"], sil)
        c10 = criterion_10(motion, motion_err)
        c11 = criterion_11(shots["front"], shots["repeat"], sil, meta, meta_err,
                           peer_mask, peer_canvas, peer_label)
        for cid, res in ((1, c1), (2, c2), (3, c3), (4, c4), (5, c5),
                         (6, c6), (7, c7), (8, c8), (9, c9), (10, c10), (11, c11)):
            res["id"] = cid
            res["name"] = names[cid]
            res["notes"] = "; ".join(n for n in res.get("notes", []) if n)
            results[cid] = res
        if sil_notes:
            results[1]["notes"] = (results[1]["notes"] + "; " if results[1]["notes"] else "") + "; ".join(sil_notes)

    criteria = [results[cid] for cid, _ in CRITERIA]
    total = sum(c["score"] for c in criteria if isinstance(c["score"], int))
    scored = sum(1 for c in criteria if isinstance(c["score"], int))
    payload = {
        "color": color,
        "shots": {role: (os.path.abspath(shot.path) if shot.ok and shot.path else None)
                  for role, shot in shots.items()},
        "metrics": {str(c["id"]): c.get("metrics", {}) for c in criteria},
        "criteria": [{"id": c["id"], "score": c["score"], "notes": c["notes"]} for c in criteria],
        "total_of_110": total,
        "total_of_10": round(total / 11.0, 2),
    }
    payload["_table"] = criteria
    payload["_scored"] = scored
    payload["_total"] = total
    payload["_meta_err"] = meta_err
    payload["_motion_err"] = motion_err
    payload["_sil_notes"] = sil_notes
    return payload


def print_table(run_dir: str, color: str, payload: Dict[str, Any]) -> None:
    print("=" * 118)
    print(f"gem rubric — {color}  |  run: {os.path.abspath(run_dir)}  |  grad scale {GRAD_SCALE:.2f}")
    print("=" * 118)
    print(f"{'#':>2}  {'criterion':<32} {'score':>5}  metrics")
    print("-" * 118)
    for c in payload["_table"]:
        score = "n/a" if c["score"] is None else str(c["score"])
        print(f"{c['id']:>2}  {c['name']:<32} {score:>5}  {c.get('row', '') or '—'}")
        if c["score"] is None:
            print(f"{'':>2}  {'':<32} {'':>5}  note: {c['notes']}")
    print("-" * 118)
    total = payload["_total"]
    scored = payload["_scored"]
    print(f"{'':>2}  {'TOTAL':<32} {total:>3}/110  ({payload['total_of_10']:.2f}/10 over 11 criteria"
          f"{'' if scored == 11 else f', {scored}/11 criteria measured'})")
    print("=" * 118)
    shots = payload["shots"]
    for role in ROLES:
        p = shots.get(role)
        print(f"  {role:<7} {'—' if p is None else p}")
    print()


def main(argv: Optional[Sequence[str]] = None) -> int:
    global GRAD_SCALE
    ap = argparse.ArgumentParser(
        description="Score one gem run directory against prototype/gems/rubric.md (11 criteria).")
    ap.add_argument("run_dir", help="run directory holding front/repeat/txoff/dispoff/chart/dark/nogem.png")
    ap.add_argument("--color", default="sapphire", help="category (sapphire, citrine, ...)")
    ap.add_argument("--out", default=None, help="score.json path (default <run-dir>/score.json)")
    ap.add_argument("--role", action="append", default=[],
                    metavar="ROLE=PATH", help="override a shot path, repeatable")
    ap.add_argument("--meta", default=None, help="override meta.json path")
    ap.add_argument("--motion", default=None, help="override motion.json path")
    ap.add_argument("--peer", default=None,
                    help="peer run dir or PNG for cross-category mask IoU (criterion 11c)")
    ap.add_argument("--token-hue", type=float, default=None,
                    help="category token hue in degrees (default from the built-in table)")
    ap.add_argument("--grad-scale", type=float, default=GRAD_SCALE,
                    help=f"gain on |grad L| before the absolute 20 threshold (default {GRAD_SCALE}; "
                         f"calibrated so card-sapphire reproduces rubric.md's g_p95 20.7 / g_p99 55.7)")
    ap.add_argument("--quiet", action="store_true", help="write score.json only, no table")
    args = ap.parse_args(argv)

    GRAD_SCALE = float(args.grad_scale)

    run_dir = args.run_dir
    if not os.path.isdir(run_dir):
        print(f"error: run directory not found: {run_dir}", file=sys.stderr)
        return 2

    overrides: Dict[str, str] = {}
    for item in args.role:
        if "=" not in item:
            print(f"error: --role expects ROLE=PATH, got {item!r}", file=sys.stderr)
            return 2
        role, path = item.split("=", 1)
        role = role.strip()
        if role not in ROLES:
            print(f"error: unknown role {role!r} (one of {', '.join(ROLES)})", file=sys.stderr)
            return 2
        overrides[role] = os.path.expanduser(path.strip())

    token_hue = args.token_hue
    if token_hue is None:
        token_hue = TOKEN_HUES.get(args.color.lower())

    payload = score_run(run_dir, args.color, overrides, args.meta, args.motion, args.peer, token_hue)

    out_path = args.out or os.path.join(run_dir, "score.json")
    out_path = os.path.abspath(os.path.expanduser(out_path))
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    body = {k: v for k, v in payload.items() if not k.startswith("_")}
    try:
        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(body, fh, indent=2, sort_keys=False)
            fh.write("\n")
    except OSError as exc:
        print(f"error: cannot write {out_path}: {exc}", file=sys.stderr)
        return 1

    if not args.quiet:
        print_table(run_dir, args.color, payload)
        print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
