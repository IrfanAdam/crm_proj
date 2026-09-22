/* ADAM/SHARED — src/arch/atlas-state.js · lens + selection [plan:2026-09-22_082844-arch-atlas.md#phase-2] */
// — Exports: createAtlasState —
export function createAtlasState() {
  let lens = 'logic';
  let selected = null;
  const subs = new Set();
  const emit = () => subs.forEach((f) => f({ lens, selected }));
  return {
    get lens() {
      return lens;
    },
    get selected() {
      return selected;
    },
    setLens(next) {
      if (next === lens) return;
      lens = next;
      selected = null;
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
}
