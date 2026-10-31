/* ADAM/PAGE — src/pitch/pitch-footer-orchestrion.js · orthogonal node field, mouse + heartbeat */
/* [plan:2026-09-28_000000-lump-sum-builds.md#phase-1] · dense lattice, viewport-bleed, rigid. */
(function () {
  var MOBILE_MQ = window.matchMedia("(max-width: 760px)");
  function initFooterOrchestrion() {
    var footer = document.querySelector(".footer-strip");
    if (!footer || footer.querySelector(".f-orchestrion-canvas")) return;
    footer.style.position = "relative";
    footer.style.overflow = "clip";
    footer.style.isolation = "isolate";
    var canvas = document.createElement("canvas");
    canvas.className = "f-orchestrion-canvas";
    canvas.setAttribute("aria-hidden", "true");
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
    var S = {
      footer: footer, canvas: canvas, ctx: ctx,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      w: 0, h: 0, cw: 0, nodes: [], edges: [],
      mouse: { x: -9999, y: -9999, tx: -9999, ty: -9999 },
      hasGSAP: typeof gsap !== "undefined" && gsap.quickTo,
      qx: null, qy: null, mq: MOBILE_MQ, isMobile: MOBILE_MQ.matches,
      pulses: [], nextPulseAt: foNowMs() + 900, idle: { t: 0 }
    };
    if (S.hasGSAP) {
      S.qx = gsap.quickTo(S.mouse, "x", { duration: 0.28, ease: "power3" });
      S.qy = gsap.quickTo(S.mouse, "y", { duration: 0.28, ease: "power3" });
    }
    if (MOBILE_MQ.addEventListener) MOBILE_MQ.addEventListener("change", function (e) { S.isMobile = e.matches; });
    else if (MOBILE_MQ.addListener) MOBILE_MQ.addListener(function (e) { S.isMobile = e.matches; });
    foBindInput(S);
    var ro = new ResizeObserver(function () { foResize(S); });
    ro.observe(footer);
    window.addEventListener("resize", function () { foResize(S); });
    foResize(S);
    requestAnimationFrame(function () { foTick(S); });
    footer._orchestrionResize = function () { foResize(S); };
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
