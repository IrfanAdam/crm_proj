/* ADAM/DS — src/ds/icon-derivative-svgs.js · ADAM cut icons — one SVG source for every playground */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-2] · diamond-cut · sketch-cut · gem-friendly (sketch-logo, friendly edges).
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
    'diamond-cut': {
      o: 'M16 2.5 29.5 16 16 29.5 2.5 16Z',
      lines: ['M16 9 22.5 16 16 23 9.5 16Z', 'M16 2.5 16 9M29.5 16 22.5 16M16 29.5 16 23M2.5 16 9.5 16'],
      shadeInk: '<path d="M16 9 22.5 16 16 23 9.5 16Z" opacity="0.2" fill="currentColor" stroke="none"/>',
      fillInk: '<path d="M16 9 22.5 16 16 23 9.5 16Z" fill="white" fill-opacity="0.28" stroke="white" stroke-opacity="0.45" stroke-width="2" stroke-linejoin="round"/><path d="M16 2.5 16 9M29.5 16 22.5 16M16 29.5 16 23M2.5 16 9.5 16" stroke="white" stroke-opacity="0.55" stroke-width="2" stroke-linecap="butt"/>',
      note: 'ADAM derivative — same stroke API as Phosphor',
    },
    'sketch-cut': {
      o: 'M16 2.5 29.5 16 16 29.5 2.5 16Z',
      lines: ['M16 6 19.5 9.5 16 13 12.5 9.5Z', 'M22.5 12.5 26 16 22.5 19.5 19 16Z', 'M16 19 19.5 22.5 16 26 12.5 22.5Z', 'M9.5 12.5 13 16 9.5 19.5 6 16Z', 'M16 13 19 16 16 19.5 12.5 16Z'],
      // Bold master: ring minis plug shut at sw3, so bold uses solid lozenges
      // (same motifs/positions — the diamonds-four-bold language). All other
      // weights share one geometry; bold is the single per-weight exception.
      boldLines: ['M16 7.2 18.3 9.5 16 11.8 13.7 9.5Z', 'M22.5 13.7 24.8 16 22.5 18.3 20.2 16Z', 'M16 20.2 18.3 22.5 16 24.8 13.7 22.5Z', 'M9.5 13.7 11.8 16 9.5 18.3 7.2 16Z', 'M16 14.2 17.8 16 16 17.8 14.2 16Z'],
      linesDuo: ['M16 6 19.5 9.5 16 13 12.5 9.5Z', 'M22.5 12.5 26 16 22.5 19.5 19 16Z', 'M16 19 19.5 22.5 16 26 12.5 22.5Z', 'M9.5 12.5 13 16 9.5 19.5 6 16Z'],
      shadeInk: '<g opacity="0.22" fill="currentColor" stroke="none"><path d="M16 6 19.5 9.5 16 13 12.5 9.5Z"/><path d="M22.5 12.5 26 16 22.5 19.5 19 16Z"/><path d="M16 19 19.5 22.5 16 26 12.5 22.5Z"/><path d="M9.5 12.5 13 16 9.5 19.5 6 16Z"/></g>',
      shadePost: '<path d="M16 13 19 16 16 19.5 13 16Z" opacity="0.14" fill="currentColor" stroke="none"/>',
      fillInk: '<path d="M16 6 19.5 9.5 16 13 12.5 9.5Z" fill="white" fill-opacity="0.32" stroke="white" stroke-opacity="0.5" stroke-width="2"/><path d="M22.5 12.5 26 16 22.5 19.5 19 16Z" fill="white" fill-opacity="0.32" stroke="white" stroke-opacity="0.5" stroke-width="2"/><path d="M16 19 19.5 22.5 16 26 12.5 22.5Z" fill="white" fill-opacity="0.32" stroke="white" stroke-opacity="0.5" stroke-width="2"/><path d="M9.5 12.5 13 16 9.5 19.5 6 16Z" fill="white" fill-opacity="0.32" stroke="white" stroke-opacity="0.5" stroke-width="2"/><path d="M16 13 19 16 16 19.5 12.5 16Z" fill="white" fill-opacity="0.18"/>',
      note: 'ADAM sketch-logo derivative — cluster-cut',
    },
    // sketch-logo silhouette with friendlier edges: rounded table corners, girdle bulges and culet —
    // junctioned cut: the girdle chord spans the widest points, seams run top edge → girdle → apex (0.848·H).
    'gem-friendly': {
      o: 'M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z',
      lines: ['M2.4 12.1L29.6 12.1', 'M14.2 3.7L10 12.1L16 27.15M17.8 3.7L22 12.1L16 27.15'],
      shadeInk: '<path d="M14.2 3.7L17.8 3.7L22 12.1L10 12.1Z" opacity="0.18" fill="currentColor" stroke="none"/><path d="M10 12.1L22 12.1L16 27.15Z" opacity="0.18" fill="currentColor" stroke="none"/>',
      fillInk: '<path d="M2.4 12.1L29.6 12.1" stroke="white" stroke-opacity="0.5" stroke-width="2" stroke-linecap="butt"/><path d="M14.2 3.7L10 12.1L16 27.15M17.8 3.7L22 12.1L16 27.15" stroke="white" stroke-opacity="0.7" stroke-width="2" stroke-linecap="butt" stroke-linejoin="round"/>',
      fillOuter: '<path d="M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z" fill="currentColor"/>',
      note: 'ADAM sketch-logo derivative — friendly gem',
    },
  };
  const svg = (n, w, s) => {
    const d = D[n];
    if (!d) return '';
    if (w === 'fill') {
      const id = 'adf' + (++UID);
      return OPEN(s) + 'aria-hidden="true"><clipPath id="' + id + '"><path d="' + d.o + '"/></clipPath>' + (d.fillOuter || '<path d="' + d.o + '" fill="currentColor"/>') + '<g clip-path="url(#' + id + ')">' + d.fillInk + '</g></svg>';
    }
    const head = OPEN(s) + STROKE(w) + '><path d="' + d.o + '"/>';
    if (w === 'bold' && d.boldLines) return head + d.boldLines.map((p) => '<path d="' + p + '" fill="currentColor" stroke="none"/>').join('') + '</svg>';
    return head + (w === 'duotone' ? d.shadeInk : '') + paths(w === 'duotone' && d.linesDuo ? d.linesDuo : d.lines) + (w === 'duotone' ? d.shadePost || '' : '') + '</svg>';
  };
  window.ICON_DERIVS = {
    LIST: Object.keys(D),
    svg,
    note: (n) => (D[n] ? D[n].note : ''),
    code: (n, w, s) => '<Icon name="' + n + '" size={' + s + '} weight="' + w + '" />  // ' + (D[n] ? D[n].note : ''),
  };
})();
