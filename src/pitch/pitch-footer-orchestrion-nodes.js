/* ADAM/PAGE — src/pitch/pitch-footer-orchestrion-nodes.js · orthogonal slide pass */
function foStepNodes(S, now, px, py, hasPointer) {
  var nodes = S.nodes, pulses = S.pulses;
  for (var ni = 0; ni < nodes.length; ni++) {
    var nd = nodes[ni];
    var bestTn = 0, bestDx = 0, bestDy = 0, bestD = Infinity;
    var d0, tn0;
    if (S.isMobile) {
      if (!hasPointer) {
        bestTn = 0;
      } else {
        for (var qi = 0; qi < pulses.length; qi++) {
          var qp = pulses[qi];
          var prog = Math.min(1, (now - qp.t0) / qp.dur);
          var env = Math.sin(prog * Math.PI); // 0→1→0 heartbeat
          var dd = Math.hypot(nd.ox - qp.x, nd.oy - qp.y);
          if (dd >= qp.R + 12) continue;
          var tnp = 1 - Math.min(dd / qp.R, 1);
          tnp = Math.pow(tnp, 2.1) * env;
          if (tnp > bestTn) { bestTn = tnp; bestDx = qp.x - nd.ox; bestDy = qp.y - nd.oy; bestD = dd; }
        }
      }
      d0 = bestD; tn0 = bestTn;
    } else {
      d0 = Math.hypot(nd.ox - px, nd.oy - py);
      tn0 = 1 - Math.min(d0 / FO_R, 1);
      tn0 = Math.pow(tn0, 2.1) * (hasPointer ? 1 : 0.10);
      bestDx = px - nd.ox; bestDy = py - nd.oy;
    }
    if (!hasPointer || (S.isMobile ? bestTn < 0.015 : d0 > FO_R + 12)) {
      if (Math.abs(nd.x - nd.ox) > 0.07) { nd.y = nd.oy; nd.x += (nd.ox - nd.x) * 0.20; }
      else if (Math.abs(nd.y - nd.oy) > 0.07) { nd.x = nd.ox; nd.y += (nd.oy - nd.y) * 0.20; }
      else { nd.x = nd.ox; nd.y = nd.oy; }
      continue;
    }
    if (Math.abs(bestDx) > Math.abs(bestDy)) {
      nd.y = nd.oy;
      var maxSlide = FO_GAP * 0.42;
      var slide = bestDx * 0.36 * tn0;
      slide = Math.max(-maxSlide, Math.min(maxSlide, slide));
      var tx = nd.ox + slide;
      nd.x += (tx - nd.x) * 0.26;
    } else {
      nd.x = nd.ox;
      var maxSlideV = FO_GAP * 0.42;
      var slideV = bestDy * 0.36 * tn0;
      slideV = Math.max(-maxSlideV, Math.min(maxSlideV, slideV));
      var ty = nd.oy + slideV;
      nd.y += (ty - nd.y) * 0.26;
    }
  }
}
