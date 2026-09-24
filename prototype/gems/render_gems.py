"""ADAM/GEMS — prototype/gems/render_gems.py · 2x2 studio sheet of the category gems."""
# Portable core: cut math comes from gem_cut.py, optics from gem_optics.py, pixels from
# soft_render.py — this file is only the photography (stage card, shadow, labels, sheet).
import os, re, time

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from gem_cut import CATEGORIES, FALLBACK, gem_cut, resolve_colors
from gem_optics import stage
from soft_render import render

HERE = os.path.dirname(os.path.abspath(__file__))
LABELS = {"sapphire": "Sapphire", "citrine": "Citrine", "amethyst": "Amethyst", "redberyl": "Red Beryl"}
TILE, GAP, MARGIN = 400, 22, 26
FONTS = ("/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/Supplemental/Arial.ttf", "/Library/Fonts/Arial.ttf")


def hex_rgb(h):
    """'#rrggbb' → float RGB (0-1)."""
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (1, 3, 5)])


def token(css, name, hops=4):
    """Resolve a token to RGB, following var() chains; a missing token → neutral light gray."""
    m = re.search(re.escape(name) + r"\s*:\s*([^;]+)", css)
    v = m.group(1) if m else ""
    for _ in range(hops):
        n = re.search(r"--[\w-]+", v)
        m = re.search(re.escape(n.group(0)) + r"\s*:\s*([^;]+)", css) if n else None
        if not m:
            break
        v = m.group(1)
    h = re.search(r"#[0-9a-fA-F]{3,8}", v)
    return hex_rgb(h.group(0)) if h else np.full(3, 0.88)


def font(size):
    """First available system sans, else PIL's bundled default."""
    for p in FONTS:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default(size)


def contact_shadow(mask, tile=TILE):
    """Soft elliptical contact shadow pooled under the silhouette."""
    ys, xs = np.nonzero(mask > 0.5)
    if not len(ys):
        return np.zeros((tile, tile))
    rx = max(float(xs.max() - xs.min()) * 0.42, 10.0)
    ry, cx, cy = rx * 0.30, float(xs.mean()), float(ys.max()) - rx * 0.06
    plate = Image.new("L", (tile, tile), 0)
    ImageDraw.Draw(plate).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    return np.asarray(plate.filter(ImageFilter.GaussianBlur(rx * 0.34)), float) / 255.0


def tile(positions, cells, base, ior, bg):
    """One gem photographed on the light stage card → (HxWx3 float 0-1)."""
    gem, mask = render(positions, cells, base, ior=ior, bg=bg, size=TILE, fit=0.80)
    plate = stage(TILE, bg) * (1.0 - 0.50 * contact_shadow(mask)[..., None])
    return plate * (1.0 - mask[..., None]) + gem * mask[..., None]


def main():
    """Render the four gems on the light stage, label them, write gems-preview.png."""
    started = time.time()
    css_path = os.path.join(HERE, "..", "..", "design-system", "tokens.css")
    colors = resolve_colors(css_path)
    print("resolved:", colors)
    bg = token(open(css_path).read(), "--bg-interactive")
    print("stage: --bg-interactive →", np.round(bg, 3),
          "· iors:", {k: v["ior"] for k, v in CATEGORIES.items()})
    positions, cells = gem_cut()
    print("verts:", len(positions), "faces:", len(cells))
    side = TILE * 2 + GAP + MARGIN * 2
    sheet = np.full((side, side, 3), 0.78)
    for i, key in enumerate(CATEGORIES):
        r, c = divmod(i, 2)
        x, y = MARGIN + c * (TILE + GAP), MARGIN + r * (TILE + GAP)
        sheet[y:y + TILE, x:x + TILE] = tile(positions, cells,
                                             hex_rgb(colors.get(key, FALLBACK[key])),
                                             CATEGORIES[key]["ior"], bg)
    img = Image.fromarray((np.clip(sheet, 0, 1) * 255.0 + 0.5).astype(np.uint8))
    draw = ImageDraw.Draw(img)
    for i, key in enumerate(CATEGORIES):
        r, c = divmod(i, 2)
        x, y = MARGIN + c * (TILE + GAP), MARGIN + r * (TILE + GAP)
        draw.text((x + 22, y + 26), LABELS[key], font=font(22), anchor="lm",
                  fill=(44, 48, 58))
    out = os.path.join(HERE, "gems-preview.png")
    img.save(out)
    print("wrote", out, "(%dx%d, %.2fs)" % (side, side, time.time() - started))


if __name__ == "__main__":
    main()
