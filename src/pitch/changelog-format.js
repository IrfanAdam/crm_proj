/* ADAM/DS — changelog-format · date helpers · [plan:2026-09-22_141500-housekeeping-refactor.md#{#phase-2}] */
// Exports: MONTHS, fmtDate, fmtTime, pDay, isoDay
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, mo, d] = iso.split('-').map(Number);
  if (!y || !mo || !d) return iso;
  return `${String(d).padStart(2,'0')} ${MONTHS[mo - 1]} ${y}`;
};

export const fmtTime = (id) => (/^\d{6}$/.test(id) ? `${id.slice(0,2)}:${id.slice(2,4)}` : id);

export const pDay = (s) => {
  const [y, mo, d] = s.split('-').map(Number);
  return new Date(y, mo - 1, d);
};

export const isoDay = (d) => [
  d.getFullYear(),
  `-`,
  String(d.getMonth() + 1).padStart(2, '0'),
  `-`,
  String(d.getDate()).padStart(2, '0'),
].join('');
