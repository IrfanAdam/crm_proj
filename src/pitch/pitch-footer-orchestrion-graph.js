/* ADAM/PAGE — src/pitch/pitch-footer-orchestrion-graph.js · lattice build + viewport-bleed resize */
function foBuildGraph(S) {
  var nodes = S.nodes, edges = S.edges, cw = S.cw, h = S.h;
  nodes.length = 0; edges.length = 0;
  var cols = Math.ceil(cw / FO_GAP) + 1;
  var rows = Math.ceil(h / FO_GAP) + 1;
  cols = Math.max(32, Math.min(cols, 160));
  rows = Math.max(14, Math.min(rows, 64));
  var grid = [];
  for (var r = 0; r < rows; r++) {
    grid[r] = [];
    for (var c = 0; c < cols; c++) {
      var cx = c * FO_GAP;
      var cy = r * FO_GAP;
      if (cx > cw) cx = cw; if (cy > h) cy = h;
      var isCore = Math.random() < 0.016;
      var col = isCore ? FO_CORE_COLORS[(Math.random() * FO_CORE_COLORS.length) | 0] : null;
      var r0 = (isCore ? 0.64 : 0.34) + Math.random() * (isCore ? 0.14 : 0.09);
      nodes.push({ ox: cx, oy: cy, x: cx, y: cy, r0: r0, core: isCore, coreColor: col, phase: Math.random() * Math.PI * 2 });
      grid[r][c] = nodes.length - 1;
    }
  }
  for (var rr = 0; rr < rows; rr++) {
    for (var cc = 0; cc < cols; cc++) {
      var a = grid[rr][cc];
      if (cc + 1 < cols) { var b = grid[rr][cc + 1]; edges.push({ a: a, b: b }); }
      if (rr + 1 < rows) { var b2 = grid[rr + 1][cc]; edges.push({ a: a, b: b2 }); }
    }
  }
}
function foResize(S) {
  var rect = S.footer.getBoundingClientRect();
  S.h = Math.max(1, rect.height);
  S.cw = Math.max(1, window.innerWidth);
  S.w = S.cw;
  var cssW = S.cw, cssH = S.h;
  S.canvas.width = Math.round(cssW * S.dpr);
  S.canvas.height = Math.round(cssH * S.dpr);
  S.canvas.style.height = cssH + "px";
  S.ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
  foBuildGraph(S);
}
