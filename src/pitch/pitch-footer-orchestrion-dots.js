/* ADAM/PAGE — src/pitch/pitch-footer-orchestrion-dots.js · dot bloom pass */
function foPaintDots(S, now, px, py, hasPointer) {
  var ctx = S.ctx, nodes = S.nodes;
  for (var nj = 0; nj < nodes.length; nj++) {
    var nn = nodes[nj];
    nn.phase += 0.018 + (nn.core ? 0.007 : 0);
    var tn, dn;
    if (S.isMobile) {
      if (!hasPointer) continue;
      var bestTn2 = 0;
      for (var nj2 = 0; nj2 < S.pulses.length; nj2++) {
        var pp2 = S.pulses[nj2];
        var prog2 = Math.min(1, (now - pp2.t0) / pp2.dur);
        var env2 = Math.sin(prog2 * Math.PI);
        var dd2 = Math.hypot(pp2.x - nn.x, pp2.y - nn.y);
        if (dd2 > pp2.R) continue;
        var t2 = 1 - Math.min(dd2 / pp2.R, 1);
        t2 = Math.pow(t2, 2.8) * env2;
        if (t2 > bestTn2) bestTn2 = t2;
      }
      tn = bestTn2; dn = 0;
      if (tn < 0.015) continue;
    } else {
      dn = Math.hypot(px - nn.x, py - nn.y);
      if (dn > FO_R) continue;
      tn = 1 - Math.min(dn / FO_R, 1);
      tn = Math.pow(tn, 2.8) * (hasPointer ? 1 : 0.14);
      if (tn < 0.012) continue;
    }
    var pulse = Math.sin(nn.phase) * 0.06;
    var rr = tn * (nn.r0 * 2.6 + 0.50) + pulse * tn;
    if (rr < 0.32) continue;
    ctx.beginPath(); ctx.arc(nn.x, nn.y, rr, 0, Math.PI * 2);
    if (nn.core) {
      var cR = parseInt(nn.coreColor.slice(1, 3), 16), cG = parseInt(nn.coreColor.slice(3, 5), 16), cB = parseInt(nn.coreColor.slice(5, 7), 16);
      ctx.fillStyle = "rgba(" + cR + "," + cG + "," + cB + "," + (tn * 0.92).toFixed(3) + ")";
      ctx.shadowColor = nn.coreColor; ctx.shadowBlur = 2 + tn * 13;
    } else {
      ctx.fillStyle = "rgba(212,224,238," + (tn * 0.78).toFixed(3) + ")";
      ctx.shadowColor = "rgba(148,176,206,0.85)"; ctx.shadowBlur = tn > 0.30 ? 4 * tn : 0;
    }
    ctx.fill(); ctx.shadowBlur = 0;
    if (tn > 0.42) {
      ctx.beginPath(); ctx.arc(nn.x, nn.y, rr + 1.8 + tn * 1.6, 0, Math.PI * 2);
      ctx.strokeStyle = nn.core ? ("rgba(" + parseInt(nn.coreColor.slice(1,3),16) + "," + parseInt(nn.coreColor.slice(3,5),16) + "," + parseInt(nn.coreColor.slice(5,7),16) + "," + (tn*0.10).toFixed(3) + ")") : ("rgba(148,176,200," + (tn*0.08).toFixed(3) + ")");
      ctx.lineWidth = 1; ctx.stroke();
    }
  }
}
