/* ADAM/PAGE — public/cube-spline/spline-rig.js · Spline ortho rig */
// [plan:2026-09-28_000000-lump-sum-builds.md#phase-4] · Task 19: camera + loader.
// — Served from public/ so Vite ships it verbatim; bare imports resolve via importmap —
// — Camera: ortho rig straight from the Spline export (pos + euler, damping 0.125) —
// Export map: side-effect module (mounts into [data-spline-stage]) · BG · FOG_NEAR · FOG_FAR
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import SplineLoader from '@splinetool/loader';
const BG = 0xc2dcfa;
const FOG_NEAR = 1423.758;
const FOG_FAR = 1987.781;
const URL = 'https://prod.spline.design/zUttXgYcZJSaFNWN/scene.splinecode';
const stage = document.querySelector('[data-spline-stage]');
const note = document.querySelector('[data-spline-note]');
const W = function () { return stage.clientWidth || window.innerWidth; };
const H = function () { return stage.clientHeight || window.innerHeight * 0.6; };
const camera = new THREE.OrthographicCamera(W() / -2, W() / 2, H() / 2, H() / -2, -100000, 100000);
camera.position.set(530.47, 489.44, 592.35);
camera.quaternion.setFromEuler(new THREE.Euler(-0.49, 0.65, 0.32));
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, FOG_NEAR, FOG_FAR);
const loader = new SplineLoader();
loader.load(URL, function (splineScene) {
scene.add(splineScene);
if (note) note.remove();
});
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W(), H());
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearAlpha(1);
stage.appendChild(renderer.domElement);
// — Controls —
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.125;
window.addEventListener('resize', function () {
camera.left = W() / -2;
camera.right = W() / 2;
camera.top = H() / 2;
camera.bottom = H() / -2;
camera.updateProjectionMatrix();
renderer.setSize(W(), H());
});
renderer.setAnimationLoop(function () {
controls.update();
renderer.render(scene, camera);
});
