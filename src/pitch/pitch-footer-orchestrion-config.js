/* ADAM/PAGE — src/pitch/pitch-footer-orchestrion-config.js · shared constants + pure helpers */
var FO_R = 240;
var FO_GAP = 15;
var FO_CORE_COLORS = ["#7cbefb", "#c48aff", "#ff85ab", "#ffc752"];
function foNowMs() { return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now(); }
function foDistToSeg(px, py, x1, y1, x2, y2) {
  var l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  var t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}
function foCanvasX(clientX) { return clientX; }
function foCanvasY(footer, clientY) { var rect = footer.getBoundingClientRect(); return clientY - rect.top; }
function foScheduleNext(S, now) { S.nextPulseAt = now + 2200 + Math.random() * 2800; }
