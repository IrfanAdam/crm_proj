/* Dock lens — displacement map for the liquid-glass dock.
   A signed-distance field of the dock capsule: R/G encode how far each pixel
   slides to sample its backdrop (128 = no slide), B stays neutral.
   Slide is outward and strongest at the rim, so the rim compresses the world
   just outside the dock — the "thick glass edge" of liquid glass. */
export function makeLensMap({ w, h, inset = 0, radius = 28, band = 20, pull = 1 }) {
  const dpr = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
  const iw = Math.max(2, Math.round(w * dpr));
  const ih = Math.max(2, Math.round(h * dpr));
  const canvas = document.createElement("canvas");
  canvas.width = iw;
  canvas.height = ih;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(iw, ih);
  const px = img.data;
  const W = w * dpr, H = h * dpr, IN = inset * dpr, RD = radius * dpr, BD = band * dpr;
  const cx = W / 2;
  const cy = H / 2;
  const r = Math.max(0, Math.min(RD, Math.min((W - 2 * IN) / 2, (H - 2 * IN) / 2)));
  const ax = (W - 2 * IN) / 2 - r;
  const ay = (H - 2 * IN) / 2 - r;
  const sdf = (x, y) => {
    const dx = Math.abs(x - cx) - ax;
    const dy = Math.abs(y - cy) - ay;
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
  };
  for (let y = 0; y < ih; y++) {
    for (let x = 0; x < iw; x++) {
      const i = (y * iw + x) * 4;
      const s = sdf(x + 0.5, y + 0.5);
      const u = Math.min(1, Math.max(0, -s) / BD);      // 0 at the rim → 1 at band depth
      // Bell profile: zero AT the rim (so the mapping stays continuous with the
      // unglassed content just outside — no doubled seam), strongest ~40% in
      // where the "glass" is thickest, zero again at the band depth.
      const m = s < 0 && u > 0 && u < 1 ? (Math.sin(Math.PI * u) * (1 - 0.5 * u)) / 0.79 : 0;
      const e = 0.75 * dpr;
      const gx = sdf(x + e, y) - sdf(x - e, y);
      const gy = sdf(x, y + e) - sdf(x, y - e);
      const gl = Math.hypot(gx, gy) || 1;
      px[i] = 128 + 127 * pull * m * (gx / gl);
      px[i + 1] = 128 + 127 * pull * m * (gy / gl);
      px[i + 2] = 128;
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}
