/* ADAM/DS — src/ds/button-lab-tone.js · tertiary ink resolver */
// [plan:2026-09-21_000000-lump-sum-builds.md#phase-1] · one ink map for lab+inspect.
// — Section —
const BLAB_TONE_ROLE = { accent: 'action', measure: 'measure', score: 'score', streak: 'streak', 'core-red': 'score', 'core-yellow': 'streak' };
const BLAB_TONE_SEM = { success: 'success', destructive: 'danger', warning: 'warning' };
function blabTonePrefix(hue) {
  return BLAB_TONE_ROLE[hue] || BLAB_TONE_SEM[hue] || '';
}
function blabToneVars(hue) {
  if (hue === 'neutral') {
    return ['gray-900', 'gray-black', 'gray-100', 'gray-white'];
  }
  const p = blabTonePrefix(hue) || 'action';
  return ['role-' + p, 'role-' + p + '-strong', 'role-' + p + '-soft', 'role-' + p + '-ink'];
}
function blabTertiaryInk(hue, theme) {
  if (hue === 'neutral') return '';
  if (theme === 'dark') return 'var(--' + blabToneVars(hue)[2] + ')';
  if (hue === 'success') return 'var(--primitive-green-700)';
  if (hue === 'warning') return 'var(--primitive-orange-700)';
  return 'var(--' + blabToneVars(hue)[1] + ')';
}
function blabHueStyle(st, theme) {
  if (st.hue === 'accent' && st.emphasis !== 'tertiary') return '';
  const v = blabToneVars(st.hue);
  let s = '';
  if (st.hue !== 'accent') {
    s = '--role-action:var(--' + v[0] + ')';
    s += ';--role-action-strong:var(--' + v[1] + ')';
    s += ';--role-action-soft:var(--' + v[2] + ')';
    s += ';--role-action-ink:var(--' + v[3] + ')';
  }
  if (st.emphasis === 'tertiary') {
    const ink = blabTertiaryInk(st.hue, theme);
    if (ink) s += (s ? ';' : '') + 'color:' + ink;
  }
  if (!s) return '';
  return ' style="' + s + '"';
}
