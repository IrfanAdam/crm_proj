/* ADAM/DS — src/ds/gemreward-spec.js · spec-appendix gem: one card, category pills */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-5] · one live canvas in the docs (Task 23).
// — Pill click swaps the card class + the canvas' data-gem; gem3d mounts the fresh canvas via its —
// — MutationObserver and disposes the detached rig, so exactly one gem renders at a time. —
// Export map: gemSpecBoot() on ds:doc · [data-gemspec] sections get the pill wiring
function gemSpecInit(root) {
if (root.dataset.gemSpecDone) return;
root.dataset.gemSpecDone = "1";
const card = root.querySelector("[data-gemspec-card]");
const pills = root.querySelector("[data-gemspec-pills]");
if (!card || !pills) return;
function show(p) {
const cat = p.dataset.gemspecCat;
card.className = "gem-reward gem-reward--" + cat;
const cv = card.querySelector("canvas[data-gem]");
if (cv.dataset.gem !== cat) {
const nu = document.createElement("canvas");
nu.className = cv.className;
nu.dataset.gem = cat;
nu.width = cv.width;
nu.height = cv.height;
nu.setAttribute("role", "img");
nu.setAttribute("aria-label", cat + " gem ceremony");
cv.replaceWith(nu);
}
const swap = function (sel, val) {
const el = card.querySelector(sel);
if (el && val) el.textContent = val;
};
swap(".gem-reward__capsule", p.dataset.gemspecCapsule);
swap(".gem-reward__title", p.dataset.gemspecTitle);
swap(".gem-reward__copy", p.dataset.gemspecCopy);
}
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
