/* ADAM/SHARED — src/components/IllusionCube/illusion-camera.js · decoded ortho rig */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-2}] · play camera verbatim (Task 9).
// — Frustum: the viewport in CSS px, so one world unit is zoom px at any size —
// —   default XYZ order kept with the 18.08 roll: world vertical reads vertical —
// Export map: ILLUSION_CAMERA.frame(cssW, cssH) → camera · .resize(camera, w, h) · .aim(camera)
(function () {
if (!window.THREE) return;
const T = window.THREE;
const api = {};
const POS = [530.4659993893731, 489.4357008603547, 592.3466628005328];
const ROT = [-28.260539356656103, 37.39447137109556, 18.079664962162802];
const ZOOM = 0.9753499582310595;
const AIM = 1000;
// — Frame —
api.frame = function (cssW, cssH) {
const cam = new T.OrthographicCamera(-cssW / 2, cssW / 2, cssH / 2, -cssH / 2, -100000, 100000);
cam.position.set(POS[0], POS[1], POS[2]);
cam.rotation.set(ROT[0] * Math.PI / 180, ROT[1] * Math.PI / 180, ROT[2] * Math.PI / 180);
cam.zoom = ZOOM * (cssW / 1600);
cam.updateProjectionMatrix();
cam.lookAt(api.aim(cam));
cam.updateMatrixWorld(true);
return cam;
};
// — Resize: frustum follows the CSS box, zoom follows the width —
api.resize = function (cam, cssW, cssH) {
cam.left = -cssW / 2;
cam.right = cssW / 2;
cam.top = cssH / 2;
cam.bottom = -cssH / 2;
cam.zoom = ZOOM * (cssW / 1600);
cam.updateProjectionMatrix();
};
// — Aim: position plus view dir times the decoded target offset —
api.aim = function (cam) {
const dir = new T.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
return new T.Vector3().copy(cam.position).addScaledVector(dir, AIM);
};
window.ILLUSION_CAMERA = api;
})();
