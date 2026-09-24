"""ADAM/GEMS — prototype/gems/render_gems.py · 2x2 studio sheet of the category gems."""
# Portable core: cut math comes from gem_cut.py, pixels from soft_render.py — this
# file is only the photography (studio, shadow, labels, sheet layout).
import os
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from gem_cut import CATEGORIES, FALLBACK, gem_cut, resolve_colors
from soft_render import render

HERE = os.path.dirname(os.path.abspath(__file__))
LABELS = {"sapphire": "Sapphire", "citrine": "Citrine",
          "amethyst": "Amethyst", "redberyl": "Red Beryl"}
TILE, GAP, MARGIN = 400, 22, 26
FONTS = ("/System/Library/Fonts/Helvetica.ttc",
         "/System/Library/Fonts/Supplemental/Arial.ttf",
         "/Library/Fonts/Arial.ttf")


def hex_rgb(h):
    """'#rrggbb' → float RGB (0-1)."""
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (1, 3, 5)])


def font(size):
    """First available system sans, else PIL's bundled default."""
    for path in FONTS:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass
    return ImageFont.load_default(size)


def studio(tile=TILE):
    """Light-gray studio sweep: vertical gradient + faint corner taper."""
    y, x = np.mgrid[0:tile, 0:tile] / (tile - 1.0)
    taper = 1.0 - 0.05 * ((x - 0.5) ** 2 + (y - 0.5) ** 2) * 4.0
    return np.repeat(((0.935 - 0.090 * y) * taper)[..., None], 3, axis=2)


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


def tile(positions, cells, base):
    """One gem photographed on a studio card → (HxWx3 float 0-1)."""
    gem, mask = render(positions, cells, base, size=TILE, fit=0.80)
    plate = studio() * (1.0 - 0.50 * contact_shadow(mask)[..., None])
    return plate * (1.0 - mask[..., None]) + gem * mask[..., None]


def main():
    """Render the four gems, label them, write gems-preview.png."""
    started = time.time()
    colors = resolve_colors(os.path.join(HERE, "..", "..",
                                         "design-system", "tokens.css"))
    print("resolved:", colors)
    positions, cells = gem_cut()
    print("verts:", len(positions), "faces:", len(cells))
    side = TILE * 2 + GAP + MARGIN * 2
    sheet = np.full((side, side, 3), 0.78)
    for i, key in enumerate(CATEGORIES):
        r, c = divmod(i, 2)
        x, y = MARGIN + c * (TILE + GAP), MARGIN + r * (TILE + GAP)
        sheet[y:y + TILE, x:x + TILE] = tile(
            positions, cells, hex_rgb(colors.get(key, FALLBACK[key])))
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
