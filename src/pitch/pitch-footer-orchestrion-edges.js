/* ADAM/PAGE — src/pitch/pitch-footer-orchestrion-edges.js · edge proximity pass */
function foPaintEdges(S, now, px, py, hasPointer) {
  var ctx = S.ctx, nodes = S.nodes, edges = S.edges;
  var idleScale = hasPointer ? 1 : (S.isMobile ? 0 : 0.32);
  for (var ei = 0; ei < edges.length; ei++) {
    var ed = edges[ei];
    var ai = ed.a, bi = ed.b;
    var ax = nodes[ai].ox, ay = nodes[ai].oy, bx = nodes[bi].ox, by = nodes[bi].oy;
    var ex = bx, ey = ay;
    var ddx = Math.abs(ax - bx), ddy = Math.abs(ay - by);
    var tt;
    if (S.isMobile) {
      if (!hasPointer) tt = 0;
      else {
        var best = 0;
        for (var ei2 = 0; ei2 < S.pulses.length; ei2++) {
          var ep = S.pulses[ei2];
          var progE = Math.min(1, (now - ep.t0) / ep.dur);
          var envE = Math.sin(progE * Math.PI);
          var d = (ddx < 0.8 || ddy < 0.8) ? foDistToSeg(ep.x, ep.y, ax, ay, bx, by) : Math.min(foDistToSeg(ep.x, ep.y, ax, ay, ex, ey), foDistToSeg(ep.x, ep.y, ex, ey, bx, by));
          var tte = 1 - Math.min(d / ep.R, 1);
          tte = Math.pow(tte, 2.0) * envE;
          if (tte > best) best = tte;
        }
        tt = best;
      }
    } else {
      var d2 = (ddx < 0.8 || ddy < 0.8) ? foDistToSeg(px, py, ax, ay, bx, by) : Math.min(foDistToSeg(px, py, ax, ay, ex, ey), foDistToSeg(px, py, ex, ey, bx, by));
      tt = 1 - Math.min(d2 / FO_R, 1);
      tt = Math.pow(tt, 2.0) * idleScale;
    }
    var alpha, lw;
    if (S.isMobile) {
      alpha = hasPointer ? 0.07 + tt * 0.44 : 0.055;
      lw = hasPointer ? 0.30 + tt * 0.95 : 0.26;
    } else {
      alpha = 0.11 + tt * 0.40;
      lw = 0.38 + tt * 0.95;
    }
    ctx.beginPath();
    if (ddx < 0.8 || ddy < 0.8) { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
    else { ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.lineTo(bx, by); }
    ctx.lineWidth = lw; ctx.lineCap = "square"; ctx.strokeStyle = "rgba(148,176,200," + alpha.toFixed(3) + ")"; ctx.stroke();
  }
}
