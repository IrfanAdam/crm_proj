/* ADAM/DS — src/ds/gemreward-spec.js · spec-appendix gem: one card, category pills */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · one live canvas in the docs (Task 23).
// — Pill click swaps the card class + retints the live canvas through gem-tint.js (same cut, same —
// — rig, no second render); only when that module is absent does it fall back to swapping in a —
// — fresh canvas, which gem3d then mounts via its MutationObserver. —
// Export map: gemSpecBoot() on ds:doc · [data-gemspec] sections get the pill wiring
function gemSpecInit(root) {
if (root.dataset.gemSpecDone) return;
root.dataset.gemSpecDone = "1";
const card = root.querySelector("[data-gemspec-card]");
const pills = root.querySelector("[data-gemspec-pills]");
if (!card || !pills) return;
function show(p) {
const cat = p.dataset.gemspecCat;
const cv = card.querySelector("canvas[data-gem]");
if (cv) card.classList.remove("gem-reward--" + cv.dataset.gem);
card.classList.add("gem-reward--" + cat);
if (cv && cv.dataset.gem !== cat) {
const label = cat + " gem ceremony. Activate to open fullscreen.";
if (window.GEM_TINT && window.GEM_TINT.apply(cv, cat)) {
cv.setAttribute("aria-label", label);
} else {
const nu = document.createElement("canvas");
nu.className = cv.className;
nu.dataset.gem = cat;
nu.width = cv.width;
nu.height = cv.height;
nu.setAttribute("role", "img");
nu.setAttribute("aria-label", label);
nu.tabIndex = 0;
nu.dataset.overlayTarget = "gem-screen";
cv.replaceWith(nu);
}
}
const swap = function (sel, val) {
const el = card.querySelector(sel);
if (el && val) el.textContent = val;
};
swap(".gem-reward__capsule", p.dataset.gemspecCapsule);
swap(".gem-reward__title", p.dataset.gemspecTitle);
swap(".gem-reward__copy", p.dataset.gemspecCopy);
}
const screen = root.querySelector("[data-gemscreen-stage]");
function openScreen() {
const stage = root.querySelector("[data-gemscreen-stage]");
if (!stage) return;
const active = pills.querySelector(".is-on") || pills.querySelector("[data-gemspec-cat]");
const cat = active.dataset.gemspecCat;
stage.querySelectorAll("canvas").forEach(function (c) { c.remove(); });
const nu = document.createElement("canvas");
nu.className = "gem-reward__spline gem-screen__canvas";
nu.dataset.gem = cat;
nu.setAttribute("role", "img");
nu.setAttribute("aria-label", cat + " gem fullscreen");
stage.appendChild(nu);
const title = root.querySelector("[data-gemscreen-title]");
if (title) title.textContent = active.dataset.gemspecTitle;
const cap = root.querySelector("[data-gemscreen-capsule]");
if (cap) cap.textContent = active.dataset.gemspecCapsule;
}
card.addEventListener("click", function (e) {
if (e.target.closest("canvas[data-gem]")) openScreen();
});
pills.addEventListener("click", function (e) {
const p = e.target.closest("[data-gemspec-cat]");
if (!p) return;
Array.from(pills.querySelectorAll("[data-gemspec-cat]")).forEach(function (b) {
b.classList.toggle("is-on", b === p);
});
show(p);
});
}
function gemSpecBoot() {
document.querySelectorAll("[data-gemspec]").forEach(gemSpecInit);
}
document.addEventListener("ds:doc", gemSpecBoot);
gemSpecBoot();
