/* ADAM/SHARED — src/arch/atlas-state.js · lens + selection [plan:2026-09-22_155000-architecture-mechanics.md#phase-3] */
// — Exports: createAtlasState, LENSES —
const VALID = ['decisions', 'schema', 'logic'];
export const LENSES = VALID;
function readMode() {
  try {
    const m = typeof localStorage !== 'undefined' ? localStorage.getItem('mechanics:mode') : null;
    if (VALID.includes(m)) return m;
  } catch {}
  return 'logic';
}
export function createAtlasState() {
  let lens = readMode();
  let selected = null;
  const subs = new Set();
  const emit = () => subs.forEach((f) => f({ lens, selected }));
  const state = {
    get lens() {
      return lens;
    },
    get selected() {
      return selected;
    },
    get mode() {
      return lens;
    },
    set mode(v) {
      state.setLens(v);
    },
    setLens(next) {
      if (!VALID.includes(next) || next === lens) return;
      lens = next;
      selected = null;
      try {
        localStorage.setItem('mechanics:mode', lens);
      } catch {}
      try {
        if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('mechanics:mode', { detail: { mode: lens, lens } }));
      } catch {}
      emit();
    },
    select(id) {
      selected = id;
      emit();
    },
    clear() {
      selected = null;
      emit();
    },
    subscribe(f) {
      subs.add(f);
      return () => subs.delete(f);
    },
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('mechanics:mode', (e) => {
      const m = e.detail?.mode || e.detail?.lens;
      if (VALID.includes(m) && m !== lens) {
        lens = m;
        selected = null;
        emit();
      }
    });
  }
  return state;
}
