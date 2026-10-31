/* ADAM/PAGE — src/pitch/pitch-footer-orchestrion-frame.js · per-frame pointer state + pass driver */
function foTick(S) {
  var now = foNowMs();
  var px, py, hasPointer, imx, imy;
  if (S.isMobile) {
    // ── MOBILE: random heartbeat pulses, no touch ──
    if (now >= S.nextPulseAt && S.pulses.length === 0) {
      var pad = 22;
      var rx = pad + Math.random() * Math.max(1, S.cw - pad * 2);
      var ry = pad + Math.random() * Math.max(1, S.h - pad * 2);
      S.pulses.push({ x: rx, y: ry, t0: now, dur: 900 + Math.random() * 500, R: FO_R });
    }
    // prune finished
    var alive = [];
    for (var pi = 0; pi < S.pulses.length; pi++) {
      var pp = S.pulses[pi];
      if (now - pp.t0 < pp.dur) alive.push(pp);
      else foScheduleNext(S, now);
    }
    S.pulses = alive;
    hasPointer = S.pulses.length > 0;
    if (hasPointer) {
      // primary for gradient fallback
      px = S.pulses[0].x; py = S.pulses[0].y;
      imx = px; imy = py;
    } else {
      px = -9999; py = -9999; imx = -9999; imy = -9999;
    }
    S.idle.t += 0.001;
  } else {
    if (!S.hasGSAP) { S.mouse.x += (S.mouse.tx - S.mouse.x) * 0.18; S.mouse.y += (S.mouse.ty - S.mouse.y) * 0.18; }
    var mx = S.mouse.x, my = S.mouse.y;
    hasPointer = mx > -500 && my > -500;
    if (!hasPointer) {
      S.idle.t += 0.002;
      imx = S.cw * 0.5 + Math.cos(S.idle.t) * S.cw * 0.06;
      imy = S.h * 0.5 + Math.sin(S.idle.t * 0.8) * S.h * 0.05;
    } else { S.idle.t += 0.001; imx = mx; imy = my; }
    px = hasPointer ? mx : imx; py = hasPointer ? my : imy;
  }
  S.ctx.clearRect(0, 0, S.cw, S.h);
  // orthogonal slide
  foStepNodes(S, now, px, py, hasPointer);
  foPaintGlow(S, now, px, py, hasPointer, imx, imy);
  foPaintEdges(S, now, px, py, hasPointer);
  foPaintDots(S, now, px, py, hasPointer);
  requestAnimationFrame(function () { foTick(S); });
}
