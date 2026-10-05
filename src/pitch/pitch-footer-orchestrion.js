/* ADAM/PAGE — src/pitch/pitch-footer-orchestrion.js · orthogonal node field, wave/pulse */
 /* [plan:2026-09-28_000000-lump-sum-builds.md#phase-1] · dense equidistant ↕↔ lattice, viewport-bleed, rigid, dots slide strictly on rails. */
 /* [mobile] · no hover/touch — sparing auto wave pulses across footer */
(function () {
  var R = 240;
  var CORE_COLORS = ["#7cbefb", "#c48aff", "#ff85ab", "#ffc752"];
  var GAP = 15;
  var MOBILE_MQ = window.matchMedia("(max-width: 760px)");
  function isMobileView() { return MOBILE_MQ.matches; }

  function initFooterOrchestrion() {
    var footer = document.querySelector(".footer-strip");
    if (!footer || footer.querySelector(".f-orchestrion-canvas")) return;
    footer.style.position = "relative";
    footer.style.overflow = "clip";
    footer.style.isolation = "isolate";

    var canvas = document.createElement("canvas");
    canvas.className = "f-orchestrion-canvas";
    canvas.setAttribute("aria-hidden", "true");
    // canvas breaks out to viewport edges even if footer is inside a 900px centered wrapper
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "50%";
    canvas.style.height = "100%";
    canvas.style.width = "100vw";
    canvas.style.marginLeft = "-50vw";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "0";
    canvas.style.display = "block";
    footer.prepend(canvas);
    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, cw = 0, nodes = [], edges = [];
    var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    var hasGSAP = typeof gsap !== "undefined" && gsap.quickTo;
    var qx, qy;
    if (hasGSAP) {
      qx = gsap.quickTo(mouse, "x", { duration: 0.28, ease: "power3" });
      qy = gsap.quickTo(mouse, "y", { duration: 0.28, ease: "power3" });
    }
    var isMobile = isMobileView();
    if (MOBILE_MQ.addEventListener) MOBILE_MQ.addEventListener("change", function (e) { isMobile = e.matches; });
    else if (MOBILE_MQ.addListener) MOBILE_MQ.addListener(function (e) { isMobile = e.matches; });

    // auto wave state — mobile only, sparing pulses
    var WAVE_DURATION = 2200; // ms sweep across
    var WAVE_GAP = 3400; // ms pause between pulses — sparingly
    var waveStart = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();

    function buildGraph() {
      nodes.length = 0; edges.length = 0;
      // viewport-bleed lattice — use cw (viewport width) for columns, h for rows
      var cols = Math.ceil(cw / GAP) + 1;
      var rows = Math.ceil(h / GAP) + 1;
      cols = Math.max(32, Math.min(cols, 160));
      rows = Math.max(14, Math.min(rows, 64));
      var grid = [];
      for (var r = 0; r < rows; r++) {
        grid[r] = [];
        for (var c = 0; c < cols; c++) {
          var cx = c * GAP;
          var cy = r * GAP;
          if (cx > cw) cx = cw; if (cy > h) cy = h;
          var isCore = Math.random() < 0.016;
          var col = isCore ? CORE_COLORS[(Math.random() * CORE_COLORS.length) | 0] : null;
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

    function resize() {
      var rect = footer.getBoundingClientRect();
      h = Math.max(1, rect.height);
      cw = Math.max(1, window.innerWidth);
      w = cw; // grid spans viewport width
      var cssW = cw, cssH = h;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.height = cssH + "px";
      // width/left already viewport-bleed via CSS (100vw centred)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGraph();
    }

    function distToSeg(px, py, x1, y1, x2, y2) {
      var l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      var t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }

    // mouse is tracked in canvas (viewport) coords: offset by footer left
    function canvasX(clientX) {
      return clientX;
    }
    function canvasY(clientY) {
      var rect = footer.getBoundingClientRect();
      return clientY - rect.top;
    }

    footer.addEventListener("mousemove", function (e) {
      if (isMobile) return;
      var nx = canvasX(e.clientX), ny = canvasY(e.clientY);
      if (hasGSAP) { qx(nx); qy(ny); } else { mouse.tx = nx; mouse.ty = ny; }
    });
    // also listen on window so mouse over viewport outside footer still maps near edge
    window.addEventListener("mousemove", function (e) {
      if (isMobile) return;
      var rect = footer.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) return;
      var nx = canvasX(e.clientX), ny = canvasY(e.clientY);
      if (hasGSAP) { qx(nx); qy(ny); } else { mouse.tx = nx; mouse.ty = ny; }
    });
    footer.addEventListener("mouseleave", function () {
      if (isMobile) return;
      if (hasGSAP) { qx(-9999); qy(-9999); }
      mouse.tx = -9999; mouse.ty = -9999;
    });
    footer.addEventListener("touchmove", function (e) {
      if (isMobile) return;
      if (!e.touches[0]) return;
      var nx = canvasX(e.touches[0].clientX), ny = canvasY(e.touches[0].clientY);
      if (hasGSAP) { qx(nx); qy(ny); } else { mouse.tx = nx; mouse.ty = ny; }
    }, { passive: true });
    footer.addEventListener("touchend", function () {
      if (isMobile) return;
      if (hasGSAP) { qx(-9999); qy(-9999); }
      mouse.tx = -9999; mouse.ty = -9999;
    });

    var idle = { t: 0 };
    function frame() {
      var px, py, hasPointer, imx, imy;

      if (isMobile) {
        // ── MOBILE: sparing auto wave pulses, no touch —──
        var now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
        var elapsed = now - waveStart;
        var period = WAVE_DURATION + WAVE_GAP;
        var cycle = elapsed % period;
        var isActive = cycle < WAVE_DURATION;
        hasPointer = isActive;
        if (isActive) {
          var p = cycle / WAVE_DURATION;
          // sine ease in-out — smooth entry/exit
          var eased = 0.5 - Math.cos(p * Math.PI) * 0.5;
          px = -R + eased * (cw + 2 * R);
          // gentle vertical drift so wave isn't laser-straight
          py = h * 0.5 + Math.sin(now * 0.00035) * h * 0.10;
          imx = px; imy = py;
        } else {
          px = -9999; py = -9999;
          imx = -9999; imy = -9999;
        }
        // keep idle tick for subtle phase on dots
        idle.t += 0.001;
      } else {
        if (!hasGSAP) { mouse.x += (mouse.tx - mouse.x) * 0.18; mouse.y += (mouse.ty - mouse.y) * 0.18; }
        var mx = mouse.x, my = mouse.y;
        hasPointer = mx > -500 && my > -500;
        if (!hasPointer) {
          idle.t += 0.002;
          imx = cw * 0.5 + Math.cos(idle.t) * cw * 0.06;
          imy = h * 0.5 + Math.sin(idle.t * 0.8) * h * 0.05;
        } else { idle.t += 0.001; imx = mx; imy = my; }
        px = hasPointer ? mx : imx; py = hasPointer ? my : imy;
      }

      ctx.clearRect(0, 0, cw, h);

      // STRICTLY orthogonal slide — one axis at a time, locked to rail, never into gap
      for (var ni = 0; ni < nodes.length; ni++) {
        var nd = nodes[ni];
        var d0 = Math.hypot(nd.ox - px, nd.oy - py);
        var tn0 = 1 - Math.min(d0 / R, 1);
        tn0 = Math.pow(tn0, 2.1) * (hasPointer ? 1 : 0.10);
        if (!hasPointer || d0 > R + 12) {
          if (Math.abs(nd.x - nd.ox) > 0.07) { nd.y = nd.oy; nd.x += (nd.ox - nd.x) * 0.20; }
          else if (Math.abs(nd.y - nd.oy) > 0.07) { nd.x = nd.ox; nd.y += (nd.oy - nd.y) * 0.20; }
          else { nd.x = nd.ox; nd.y = nd.oy; }
          continue;
        }
        var dx = px - nd.ox, dy = py - nd.oy;
        if (Math.abs(dx) > Math.abs(dy)) {
          nd.y = nd.oy;
          var maxSlide = GAP * 0.42;
          var slide = dx * 0.36 * tn0;
          slide = Math.max(-maxSlide, Math.min(maxSlide, slide));
          var tx = nd.ox + slide;
          nd.x += (tx - nd.x) * 0.26;
        } else {
          nd.x = nd.ox;
          var maxSlideV = GAP * 0.42;
          var slideV = dy * 0.36 * tn0;
          slideV = Math.max(-maxSlideV, Math.min(maxSlideV, slideV));
          var ty = nd.oy + slideV;
          nd.y += (ty - nd.y) * 0.26;
        }
      }

      if (hasPointer) {
        var grad = ctx.createRadialGradient(px, py, 0, px, py, R);
        grad.addColorStop(0, "rgba(226,232,240,0.09)");
        grad.addColorStop(0.28, "rgba(124,190,251,0.045)");
        grad.addColorStop(0.68, "rgba(124,190,251,0.0)");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2); ctx.fill();
        var core = ctx.createRadialGradient(px, py, 0, px, py, 34);
        core.addColorStop(0, "rgba(255,255,255,0.18)");
        core.addColorStop(0.5, "rgba(124,190,251,0.10)");
        core.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(px, py, 34, 0, Math.PI * 2); ctx.fill();
      } else if (!isMobile) {
        var ig = ctx.createRadialGradient(imx, imy, 0, imx, imy, R * 0.75);
        ig.addColorStop(0, "rgba(148,176,206,0.02)");
        ig.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(imx, imy, R * 0.75, 0, Math.PI * 2); ctx.fill();
      }

      var idleScale = hasPointer ? 1 : (isMobile ? 0 : 0.32);
      for (var ei = 0; ei < edges.length; ei++) {
        var ed = edges[ei];
        var ai = ed.a, bi = ed.b;
        var ax = nodes[ai].ox, ay = nodes[ai].oy, bx = nodes[bi].ox, by = nodes[bi].oy;
        var ex = bx, ey = ay;
        var ddx = Math.abs(ax - bx), ddy = Math.abs(ay - by);
        var d = (ddx < 0.8 || ddy < 0.8) ? distToSeg(px, py, ax, ay, bx, by) : Math.min(distToSeg(px, py, ax, ay, ex, ey), distToSeg(px, py, ex, ey, bx, by));
        var tt = 1 - Math.min(d / R, 1);
        tt = Math.pow(tt, 2.0) * idleScale;
        // stronger base so right side reads even far from mouse
        var alpha = isMobile ? (hasPointer ? 0.08 + tt * 0.42 : 0.06) : (0.11 + tt * 0.40);
        var lw = isMobile ? (hasPointer ? 0.32 + tt * 0.95 : 0.28) : (0.38 + tt * 0.95);
        ctx.beginPath();
        if (ddx < 0.8 || ddy < 0.8) { ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
        else { ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.lineTo(bx, by); }
        ctx.lineWidth = lw; ctx.lineCap = "square"; ctx.strokeStyle = "rgba(148,176,200," + alpha.toFixed(3) + ")"; ctx.stroke();
      }

      for (var nj = 0; nj < nodes.length; nj++) {
        var nn = nodes[nj];
        nn.phase += 0.018 + (nn.core ? 0.007 : 0);
        var dn = Math.hypot(px - nn.x, py - nn.y);
        if (dn > R) continue;
        var tn = 1 - Math.min(dn / R, 1);
        tn = Math.pow(tn, 2.8) * (hasPointer ? 1 : 0.14);
        if (tn < 0.012) continue;
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
      requestAnimationFrame(frame);
    }

    var ro = new ResizeObserver(resize);
    ro.observe(footer);
    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(frame);
    footer._orchestrionResize = resize;
  }

  function boot() { initFooterOrchestrion(); }
  document.addEventListener("ds:doc", boot);
  if (document.readyState !== "loading") setTimeout(boot, 300);
  else document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 300); });
  var tries = 0; var iv = setInterval(function () {
    if (document.querySelector(".footer-strip .f-orchestrion-canvas") || tries++ > 20) clearInterval(iv);
    else boot();
  }, 500);
  window.initFooterOrchestrion = initFooterOrchestrion;
})();
