/* ADAM/DS — src/ds/icon-derivative-svgs.js · ADAM cut icons — one SVG source for every playground */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-2] · gem-friendly (sketch-logo, friendly edges) — the single ADAM cut.
(function () {
  // Stroke bands in 32-box units = Phosphor's 8/12/16/24 bands on the 256 grid
  // (thin 0.75 / light 1.125 / regular 1.5 / bold 2.25 on a 24 box).
  // fill: knockout seams use the regular width.
  const SW = { thin: 1, light: 1.5, regular: 2, bold: 3, fill: 2, duotone: 2 };
  const OPEN = (s) => '<svg viewBox="0 0 32 32" width="' + s + '" height="' + s + '" fill="none" ';
  const STROKE = (w) => 'stroke="currentColor" stroke-width="' + (SW[w] || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const paths = (a) => a.map((d) => '<path d="' + d + '"/>').join('');
  let UID = 0;
  const D = {
    // sketch-logo silhouette with friendlier edges: rounded table corners, girdle bulges and culet —
    // junctioned cut: the girdle chord spans the widest points, seams run top edge → girdle → apex (0.848·H).
    'gem-friendly': {
      o: 'M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z',
      lines: ['M2.4 12.1L29.6 12.1', 'M14.2 3.7L10 12.1L16 27.15M17.8 3.7L22 12.1L16 27.15'],
      shadeInk: '<path d="M14.2 3.7L17.8 3.7L22 12.1L10 12.1Z" opacity="0.18" fill="currentColor" stroke="none"/><path d="M10 12.1L22 12.1L16 27.15Z" opacity="0.18" fill="currentColor" stroke="none"/>',
      maskCut: '<path d="M2.4 12.1L29.6 12.1" stroke="black" stroke-width="2" stroke-linecap="butt"/><path d="M14.87 2.36L10 12.1L16 27.15M17.13 2.36L22 12.1L16 27.15" stroke="black" stroke-width="2" stroke-linecap="butt" stroke-linejoin="round"/>',
      note: 'ADAM sketch-logo derivative — friendly gem',
    },
  };
  const svg = (n, w, s) => {
    const d = D[n];
    if (!d) return '';
    if (w === 'fill') {
      // Pure library-fill language: solid silhouette + transparency cuts (mask).
      // No white paint anywhere — it renders gray over the dark solid.
      if (!d.maskCut) return OPEN(s) + 'aria-hidden="true"><path d="' + d.o + '" fill="currentColor"/></svg>';
      const id = 'adm' + (++UID);
      return OPEN(s) + 'aria-hidden="true"><mask id="' + id + '"><path d="' + d.o + '" fill="white"/>' + d.maskCut + '</mask><path d="' + d.o + '" fill="currentColor" mask="url(#' + id + ')"/></svg>';
    }
    const head = OPEN(s) + STROKE(w) + '><path d="' + d.o + '"/>';
    return head + (w === 'duotone' ? d.shadeInk : '') + paths(w === 'duotone' && d.linesDuo ? d.linesDuo : d.lines) + (w === 'duotone' ? d.shadePost || '' : '') + '</svg>';
  };
  window.ICON_DERIVS = {
    LIST: Object.keys(D),
    svg,
    note: (n) => (D[n] ? D[n].note : ''),
    code: (n, w, s) => '<Icon name="' + n + '" size={' + s + '} weight="' + w + '" />  // ' + (D[n] ? D[n].note : ''),
  };
})();
