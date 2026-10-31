/* ADAM/PAGE — src/pitch/pitch-footer-orchestrion-input.js · pointer tracking (no-op on mobile) */
function foBindInput(S) {
  var footer = S.footer;
  footer.addEventListener("mousemove", function (e) {
    if (S.isMobile) return;
    var nx = foCanvasX(e.clientX), ny = foCanvasY(footer, e.clientY);
    if (S.hasGSAP) { S.qx(nx); S.qy(ny); } else { S.mouse.tx = nx; S.mouse.ty = ny; }
  });
  window.addEventListener("mousemove", function (e) {
    if (S.isMobile) return;
    var rect = footer.getBoundingClientRect();
    if (e.clientY < rect.top || e.clientY > rect.bottom) return;
    var nx = foCanvasX(e.clientX), ny = foCanvasY(footer, e.clientY);
    if (S.hasGSAP) { S.qx(nx); S.qy(ny); } else { S.mouse.tx = nx; S.mouse.ty = ny; }
  });
  footer.addEventListener("mouseleave", function () {
    if (S.isMobile) return;
    if (S.hasGSAP) { S.qx(-9999); S.qy(-9999); }
    S.mouse.tx = -9999; S.mouse.ty = -9999;
  });
  footer.addEventListener("touchmove", function (e) {
    if (S.isMobile) return;
    if (!e.touches[0]) return;
    var nx = foCanvasX(e.touches[0].clientX), ny = foCanvasY(footer, e.touches[0].clientY);
    if (S.hasGSAP) { S.qx(nx); S.qy(ny); } else { S.mouse.tx = nx; S.mouse.ty = ny; }
  }, { passive: true });
  footer.addEventListener("touchend", function () {
    if (S.isMobile) return;
    if (S.hasGSAP) { S.qx(-9999); S.qy(-9999); }
    S.mouse.tx = -9999; S.mouse.ty = -9999;
  });
}
