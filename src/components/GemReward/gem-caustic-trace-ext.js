/* ADAM/SHARED — src/components/GemReward/gem-caustic-trace-ext.js · pose math for the caustic tracer */
// [plan:2026-10-03_144222-gem-realism-round2.md#round-19] · moved verbatim out of gem-caustic-trace.js (line-budget split).
// Export map: GEM_CAUSTIC_TRACE_EXT.poseOf(p, G) · .smoothstep(a, b, x)
(function () {
// — FD: the floor plane sits this far below the cut's lowest vertex; poseOf is its only reader, so it moved with it.
const FD = 0.5;
const yminOf = function (G) { let y = 1e9; for (let i = 0; i < G.positions.length; i++) { const q = G.positions[i]; if (q[1] < y) y = q[1]; } return y; };
const yawPitchMat = function (yaw, pitch) { const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw); return [cy, 0, sy, sp * sy, cp, -sp * cy, -cp * sy, sp, cp * cy]; };
const quatMat = function (q) { const x = q.x, y = q.y, z = q.z, w = q.w, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2; return [1 - (yy + zz), xy - wz, xz + wy, xy + wz, 1 - (xx + zz), yz - wx, xz - wy, yz + wx, 1 - (xx + yy)]; };
const poseOf = function (p, G) {   // {yaw,pitch,lift,floorY} | quaternion → {R,yaw,pitch,floorY}
let yaw = 0, pitch = 0, R = null, lift = 0, fy = null;
if (p) { lift = p.lift || 0; if (p.floorY != null) fy = p.floorY;
if (p.yaw !== undefined || p.pitch !== undefined) { yaw = p.yaw || 0; pitch = p.pitch || 0; R = yawPitchMat(yaw, pitch); }
else if (p.w !== undefined) { R = quatMat(p); pitch = Math.asin(Math.max(-1, Math.min(1, R[7]))); yaw = Math.atan2(R[2], R[0]); } }
if (!R) R = yawPitchMat(yaw, pitch);
return { R: R, yaw: yaw, pitch: pitch, floorY: (fy != null ? fy : yminOf(G) - FD) - lift }; };
const smoothstep = function (a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
window.GEM_CAUSTIC_TRACE_EXT = { poseOf: poseOf, smoothstep: smoothstep };
})();
