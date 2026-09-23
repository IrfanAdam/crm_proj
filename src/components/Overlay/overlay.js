/* ADAM/DS — src/components/Overlay/overlay.js · one engine: modal · drawer · menu · popover · tooltip · toast */
// Exports: openOverlay(el, opts) · closeOverlay(el) — delegated by [data-overlay-target] / [data-overlay-close].
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-4]
import { afterExit } from "./overlay-exit.js";
import { focusables, trapTab, menuKeys, syncExpanded, startDwell, stopDwell, wireDwell } from "./overlay-behavior.js";

const OPEN_MODS = [["drawer", "drawer--open"], ["tooltip", "tooltip--visible"], ["toast", "toast--visible"]];
const PERSISTENT = ".overlay--persistent,.drawer--persistent";
let stack = [];

const isDialog = (el) => el.matches(".overlay,.drawer");
const persistent = (el) => el.matches(PERSISTENT);
const topLayer = () => [...stack].reverse().find((el) => !el.hidden && !el._closing) || null;
const reflow = (el) => el.offsetWidth;

export function openOverlay(el, opts = {}) {
  if (el._closing || !el.hidden) return;
  el._trigger = opts.trigger || el._trigger || null;
  el.removeAttribute("hidden");
  el.setAttribute("aria-hidden", "false");
  reflow(el);
  el.classList.add("overlay--open");
  OPEN_MODS.forEach(([base, mod]) => {
    if (el.classList.contains(base)) el.classList.add(mod);
  });
  syncExpanded(el, true);
  const item = el.classList.contains("menu") ? el.querySelector(".menu__item") : null;
  const target = item || (isDialog(el) ? focusables(el)[0] || el : null);
  if (target) setTimeout(() => target.focus(), 10);
  stack.push(el);
  if (el.classList.contains("toast")) {
    wireDwell(el, () => closeOverlay(el));
    startDwell(el);
  }
}

export function closeOverlay(el) {
  if (!el || el.hidden || el._closing) return;
  const trigger = el._trigger;
  el._closing = true;
  stopDwell(el);
  el.classList.add("is-closing");
  el.classList.remove("overlay--open");
  OPEN_MODS.forEach(([, mod]) => el.classList.remove(mod));
  afterExit(el, () => {
    el.classList.remove("is-closing");
    el.setAttribute("hidden", "");
    el.setAttribute("aria-hidden", "true");
    el._closing = false;
    syncExpanded(el, false);
    el._trigger = null;
    stack = stack.filter((x) => x !== el);
    const inside = el.contains(document.activeElement);
    if (trigger && trigger.focus && (inside || isDialog(el))) {
      try { trigger.focus(); } catch {}
    }
  });
}

document.addEventListener("click", (e) => {
  const t = e.target;
  const trigger = t.closest("[data-overlay-target]");
  const target = trigger ? document.getElementById(trigger.dataset.overlayTarget) : null;
  document.querySelectorAll(".menu.overlay--open,.popover.overlay--open").forEach((el) => {
    if (el !== target && !el.contains(t)) closeOverlay(el);
  });
  const scrim = t.closest(".overlay");
  if (scrim && t === scrim && !persistent(scrim)) {
    closeOverlay(scrim);
    return;
  }
  const closer = t.closest("[data-overlay-close]");
  if (closer) {
    const root = closer.closest(".overlay,.drawer,.menu,.popover,.toast");
    if (root) closeOverlay(root);
    return;
  }
  if (trigger && target) {
    e.preventDefault();
    target.hidden ? openOverlay(target, { trigger }) : closeOverlay(target);
    return;
  }
  const item = t.closest(".menu__item");
  if (item) {
    const menu = item.closest(".menu");
    if (menu && !menu.hidden) closeOverlay(menu);
  }
});

document.addEventListener("keydown", (e) => {
  const top = topLayer();
  if (!top) return;
  if (e.key === "Escape") {
    if (!persistent(top)) closeOverlay(top);
    return;
  }
  if (top.classList.contains("menu")) menuKeys(e, top);
  else if (isDialog(top)) trapTab(e, top);
});
