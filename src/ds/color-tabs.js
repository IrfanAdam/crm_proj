/* ADAM/DS — src/ds/color-tabs.js · Ramps/Roles/Semantics underline tabs */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2]
// Exports: pxTabs (auto-init on ds:doc) · Contrast/Matrix/Lab live below as scroll.
// — Section — tab switching
const pxTabs = () => {
  const nav = document.querySelector('.ch-nav');
  if (!nav || nav.dataset.tabs) {
    return;
  }
  nav.dataset.tabs = '1';
  nav.setAttribute('role', 'tablist');
  const ids = ['ch-ramps', 'ch-roles', 'ch-semantics'];
  const secs = ids.map((id) => document.getElementById(id)).filter(Boolean);
  if (secs.length < 2) {
    return;
  }
  const range = (h) => {
    const nodes = [];
    let el = h.nextElementSibling;
    while (el && !(el.tagName === 'H3' && el.id)) {
      nodes.push(el);
      el = el.nextElementSibling;
    }
    return nodes;
  };
  const tabs = [...nav.querySelectorAll('a')].filter((a) => {
    return ids.includes(a.getAttribute('href').slice(1));
  });
  // — Section — activate one tab
  const show = (id, focus) => {
    secs.forEach((h) => {
      const on = h.id === id;
      h.toggleAttribute('hidden', !on);
      range(h).forEach((el) => el.toggleAttribute('hidden', !on));
    });
    tabs.forEach((a) => {
      const on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('ch-tab--active', on);
      a.setAttribute('role', 'tab');
      a.setAttribute('aria-selected', on);
      a.tabIndex = on ? 0 : -1;
      if (on && focus) {
        a.focus();
      }
    });
  };
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a || !nav.contains(a)) {
      return;
    }
    const id = a.getAttribute('href').slice(1);
    if (!ids.includes(id)) {
      return;
    }
    e.preventDefault();
    show(id);
    history.replaceState(null, '', '#' + id);
  });
  nav.addEventListener('keydown', (e) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(e.key)) {
      return;
    }
    e.preventDefault();
    const cur = tabs.indexOf(document.activeElement);
    const at = cur < 0 ? 0 : cur;
    let next = at;
    if (e.key === 'ArrowRight') {
      next = (at + 1) % tabs.length;
    }
    if (e.key === 'ArrowLeft') {
      next = (at - 1 + tabs.length) % tabs.length;
    }
    if (e.key === 'Home') {
      next = 0;
    }
    if (e.key === 'End') {
      next = tabs.length - 1;
    }
    const id = tabs[next].getAttribute('href').slice(1);
    show(id, true);
    history.replaceState(null, '', '#' + id);
  });
  const start = ids.includes(location.hash.slice(1)) ? location.hash.slice(1) : ids[0];
  show(start);
};
document.addEventListener('ds:doc', pxTabs);
