/* ADAM/DS — src/ds/icon-derivative-svgs.js · ADAM cut icons — one SVG source for every playground */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-2] · gem-friendly (sketch-logo, friendly edges) — the single ADAM cut.
(function () {
  // Stroke bands in 32-box units = Phosphor's 8/12/16/24 bands on the 256 grid
  // (thin 0.75 / light 1.125 / regular 1.5 / bold 2.25 on a 24 box).
  // fill: soft 1.5u round knockout seams + 1.5u grow (reaches bold's edge).
  const SW = { thin: 1, light: 1.5, regular: 2, bold: 3, fill: 1.5, duotone: 2 };
  const OPEN = (s) => '<svg viewBox="0 0 32 32" width="' + s + '" height="' + s + '" fill="none" ';
  const STROKE = (w) => 'stroke="currentColor" stroke-width="' + (SW[w] || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const paths = (a, butt0) => a.map((d, i) => '<path d="' + d + '"' + ((butt0 && i === 0) ? ' stroke-linecap="butt"' : '') + '/>').join('');
  let UID = 0;
  const D = {
    // sketch-logo silhouette with friendlier edges: rounded table corners, girdle bulges and culet —
    // junctioned cut: the girdle chord spans the widest points, seams run top edge → girdle → apex (0.848·H).
    'gem-friendly': {
      o: 'M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z',
      lines: ['M2.4 12.1L29.6 12.1', 'M14.2 3.7L10 12.1L16 27.15M17.8 3.7L22 12.1L16 27.15'],
      buttFirst: true,
      shadeInk: '<path d="M14.2 3.7L17.8 3.7L22 12.1L10 12.1Z" opacity="0.18" fill="currentColor" stroke="none"/><path d="M10 12.1L22 12.1L16 27.15Z" opacity="0.18" fill="currentColor" stroke="none"/>',
      maskCut: '<path d="M0 12.1L32 12.1M15.55 1L10 12.1L17 29.7M16.45 1L22 12.1L15 29.7" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      note: 'ADAM sketch-logo derivative — friendly gem',
    },
    'gem-lite': {
      o: 'M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z',
      lines: [],
      grow: 3,
      wash: '<path d="M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z" opacity="0.15" fill="currentColor" stroke="none"/>',
      note: 'ADAM minimal gem — silhouette only, no interior lines',
    },
    'gem-minimal': {
      o: 'M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z',
      lines: ['M7 12.1L25 12.1', 'M12.6 7.2L10 12.1L16 27.15M19.4 7.2L22 12.1L16 27.15'],
      linesBold: ['M8.2 12.1L23.8 12.1', 'M12.6 7.2L10 12.1L16 27.15M19.4 7.2L22 12.1L16 27.15'],
      shadeInk: '<path d="M14.2 3.7L17.8 3.7L22 12.1L10 12.1Z" opacity="0.18" fill="currentColor" stroke="none"/><path d="M10 12.1L22 12.1L16 27.15Z" opacity="0.18" fill="currentColor" stroke="none"/>',
      maskCut: '<path d="M8.2 12.1L23.8 12.1M12.6 7.2L10 12.1L16 27.15M19.4 7.2L22 12.1L16 27.15" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      note: 'ADAM floating-facet gem — interior lines stop short of the outline',
    },
  };
  const svg = (n, w, s) => {
    const d = D[n];
    if (!d) return '';
    if (w === 'fill') {
      // Pure library-fill language: solid silhouette + transparency cuts (mask).
      // No white paint anywhere — it renders gray over the dark solid.
      if (!d.maskCut) return OPEN(s) + 'aria-hidden="true"><path d="' + d.o + '" fill="currentColor"' + (d.grow ? ' stroke="currentColor" stroke-width="' + d.grow + '"' : '') + '/></svg>';
      const id = 'adm' + (++UID);
      return OPEN(s) + 'aria-hidden="true"><mask id="' + id + '"><path d="' + d.o + '" fill="white" stroke="white" stroke-width="3"/>' + d.maskCut + '</mask><path d="' + d.o + '" fill="currentColor" stroke="currentColor" stroke-width="3" mask="url(#' + id + ')"/></svg>';
    }
    const head = OPEN(s) + STROKE(w) + '><path d="' + d.o + '"/>';
    const lines = (w === 'bold' && d.linesBold) ? d.linesBold : (w === 'duotone' && d.linesDuo ? d.linesDuo : d.lines);
    return head + (w === 'duotone' ? (d.wash || d.shadeInk || '') : '') + paths(lines, d.buttFirst) + (w === 'duotone' ? d.shadePost || '' : '') + '</svg>';
  };
  window.ICON_DERIVS = {
    LIST: Object.keys(D),
    svg,
    note: (n) => (D[n] ? D[n].note : ''),
    code: (n, w, s) => '<Icon name="' + n + '" size={' + s + '} weight="' + w + '" />  // ' + (D[n] ? D[n].note : ''),
  };
})();
