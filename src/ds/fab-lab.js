/* ADAM/DS — src/ds/fab-lab.js · floating gem playground — lab controls write the live feel vars.
   The specimen IS the app component: same `.fab-gem` markup, same attachGooey drive. */
import { attachGooey } from "../motion/gooey.js";

const SPEC = {
  elasticity: { prop: "--gooey-elasticity", dflt: 800, fmt: (v) => String(v) },
  damping: { prop: "--gooey-damping", dflt: 0.5, fmt: (v) => v.toFixed(2) },
  stretch: { prop: "--gooey-stretch", dflt: 0.26, fmt: (v) => v.toFixed(2) },
  squish: { prop: "--gooey-squish", dflt: 0.08, fmt: (v) => v.toFixed(2) },
  give: { prop: "--gooey-give", dflt: 14, fmt: (v) => String(Math.round(v)) },
};
const PRESETS = {
  crisp: { elasticity: 1500, damping: 0.85, stretch: 0.08, squish: 0.05, give: 6 },
  apple: { elasticity: 800, damping: 0.5, stretch: 0.26, squish: 0.08, give: 14 },
  jelly: { elasticity: 450, damping: 0.3, stretch: 0.4, squish: 0.16, give: 30 },
};
function flInit(root) {
  if (root.dataset.done) return;
  root.dataset.done = "1";
  const q = (s) => root.querySelector(s);
  const stage = q("[data-fablab-stage]"), code = q("[data-fab-code]"), readout = q("[data-fab-read]");
  const fab = document.createElement("button");
  fab.className = "fab-gem";
  fab.type = "button";
  fab.setAttribute("aria-label", "Gem search");
  fab.innerHTML = (window.ICON_DERIVS && window.ICON_DERIVS.svg("gem-minimal", "regular", 24)) || "";
  stage.appendChild(fab);
  const ctl = attachGooey(fab);
  const val = (k) => { const v = parseFloat(fab.style.getPropertyValue(SPEC[k].prop)); return Number.isFinite(v) ? v : SPEC[k].dflt; };
  const mark = (name) => root.querySelectorAll("[data-fab-preset]").forEach((b) => b.classList.toggle("is-on", b.dataset.fabPreset === name));
  const render = () => {
    const o = {};
    for (const [k, s] of Object.entries(SPEC)) {
      o[k] = val(k);
      const out = q('[data-fab-out="' + k + '"]'); if (out) out.textContent = s.fmt(o[k]);
      const range = q('[data-fab-range="' + k + '"]'); if (range) range.value = o[k];
    }
    if (readout) readout.textContent = "ω " + Math.sqrt(o.elasticity).toFixed(1) + " · ζ " + o.damping.toFixed(2);
    if (code) code.textContent = '<button class="fab-gem" style="--gooey-elasticity:' + o.elasticity + "; --gooey-damping:" + o.damping + ";\n  --gooey-stretch:" + o.stretch + "; --gooey-squish:" + o.squish + "; --gooey-give:" + o.give + '">\n  <Icon name="gem-minimal" size={24} weight="regular" />\n</button>';
    ctl.refresh();
  };
  root.addEventListener("input", (e) => {
    const r = e.target.closest("[data-fab-range]");
    if (!r) return;
    fab.style.setProperty(SPEC[r.dataset.fabRange].prop, r.value);
    for (const [name, p] of Object.entries(PRESETS)) if (Object.keys(SPEC).every((k) => val(k) === p[k])) mark(name);
    render();
  });
  root.addEventListener("click", (e) => {
    const p = e.target.closest("[data-fab-preset]");
    if (p) {
      for (const [k, v] of Object.entries(PRESETS[p.dataset.fabPreset])) fab.style.setProperty(SPEC[k].prop, v);
      mark(p.dataset.fabPreset);
      render();
      return;
    }
    if (e.target.closest("[data-fab-copy]") && navigator.clipboard) navigator.clipboard.writeText(code.textContent);
  });
  render();
}
function flBoot() { document.querySelectorAll("[data-fablab]").forEach(flInit); }
document.addEventListener("ds:doc", flBoot);
flBoot();
