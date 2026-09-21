/* ADAM/SHARED — src/workspace/slowmo.js · slow-mo debug panel under zoom */
// Export map: (side effect) injects panel, wires slider + presets
import { getScale, setScale } from "../logic/time-scale.js";
const host = document.querySelector(".ws-card--zoom");
if (host && !document.getElementById("slowmo-card")) {
  const card = document.createElement("div");
  card.className = "ws-card";
  card.id = "slowmo-card";
  card.innerHTML = [
    '<h3 class="ws-card__title">Slow-mo</h3>',
    '<p class="ws-card__desc">Debug: slows every animation — map tap, flights, CSS.</p>',
    '<div class="ws-row ws-row--between">',
    '<label class="ws-label" style="margin:0" for="slowmo-slider">Speed</label>',
    '<span id="slowmo-value" class="ws-value">1×</span>',
    "</div>",
    '<div class="ws-zoombar">',
    '<input id="slowmo-slider" type="range" min="10" max="100" value="100" step="5"/>',
    "</div>",
    '<div class="ws-actions">',
    '<button class="ws-btn" data-slowmo="0.2">0.2×</button>',
    '<button class="ws-btn" data-slowmo="0.5">0.5×</button>',
    '<button class="ws-btn" data-slowmo="1">1×</button>',
    "</div>",
    '<p class="ws-hint">Applies live, even mid-flight · resets on reload</p>',
  ].join("");
  host.after(card);
  const slider = card.querySelector("#slowmo-slider");
  const value = card.querySelector("#slowmo-value");
  const paint = () => {
    const s = getScale();
    value.textContent = `${s}×`;
    slider.value = String(Math.round(s * 100));
  };
  slider.addEventListener("input", () => {
    setScale(Number(slider.value) / 100);
    paint();
  });
  card.querySelectorAll("[data-slowmo]").forEach((b) => {
    b.addEventListener("click", () => {
      setScale(Number(b.dataset.slowmo));
      paint();
    });
  });
  paint();
  window.__slowmo = { getScale, setScale };
}
