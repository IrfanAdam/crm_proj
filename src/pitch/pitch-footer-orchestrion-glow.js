/* ADAM/PAGE — src/pitch/pitch-footer-orchestrion-glow.js · radial glow wash pass */
function foPaintGlow(S, now, px, py, hasPointer, imx, imy) {
  var ctx = S.ctx;
  if (S.isMobile) {
    for (var mi = 0; mi < S.pulses.length; mi++) {
      var mp = S.pulses[mi];
      var progM = Math.min(1, (now - mp.t0) / mp.dur);
      var envM = Math.sin(progM * Math.PI);
      var pr = mp.R * envM;
      if (pr < 1) continue;
      var g1 = ctx.createRadialGradient(mp.x, mp.y, 0, mp.x, mp.y, pr);
      g1.addColorStop(0, "rgba(226,232,240," + (0.10 * envM).toFixed(3) + ")");
      g1.addColorStop(0.30, "rgba(124,190,251," + (0.050 * envM).toFixed(3) + ")");
      g1.addColorStop(0.70, "rgba(124,190,251,0.0)");
      ctx.fillStyle = g1;
      ctx.beginPath(); ctx.arc(mp.x, mp.y, pr, 0, Math.PI * 2); ctx.fill();
      var cg = ctx.createRadialGradient(mp.x, mp.y, 0, mp.x, mp.y, 34 * envM);
      cg.addColorStop(0, "rgba(255,255,255," + (0.18 * envM).toFixed(3) + ")");
      cg.addColorStop(0.5, "rgba(124,190,251," + (0.10 * envM).toFixed(3) + ")");
      cg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(mp.x, mp.y, 34 * envM, 0, Math.PI * 2); ctx.fill();
    }
  } else if (hasPointer) {
    var grad = ctx.createRadialGradient(px, py, 0, px, py, FO_R);
    grad.addColorStop(0, "rgba(226,232,240,0.09)");
    grad.addColorStop(0.28, "rgba(124,190,251,0.045)");
    grad.addColorStop(0.68, "rgba(124,190,251,0.0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(px, py, FO_R, 0, Math.PI * 2); ctx.fill();
    var core = ctx.createRadialGradient(px, py, 0, px, py, 34);
    core.addColorStop(0, "rgba(255,255,255,0.18)");
    core.addColorStop(0.5, "rgba(124,190,251,0.10)");
    core.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(px, py, 34, 0, Math.PI * 2); ctx.fill();
  } else {
    var ig = ctx.createRadialGradient(imx, imy, 0, imx, imy, FO_R * 0.75);
    ig.addColorStop(0, "rgba(148,176,206,0.02)");
    ig.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(imx, imy, FO_R * 0.75, 0, Math.PI * 2); ctx.fill();
  }
}
