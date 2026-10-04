// ADAM/PATTERN — src/patterns/ActivityStrip/activity-strip.js · data-mark diamonds
// Exports: BARS, PEAK, HITS, TODAY, activityStripHTML
// [plan:2026-09-22_190645-visual-language.md#phase-3]

// — Data —
export const BARS = [30,42,36,28,48,62,40,52,34,38,44,36,50,33,39,46,31,43,55,37,41,29,47,35,58,40,32,45,38,50,34,42,49,36,31,44,53,39,46,33,41,57,35,43,30,48,37,45,52,34,40,46,32,38,51,44];
export const PEAK = BARS.indexOf(Math.max(...BARS));
export const HITS = BARS.map((_,i)=>i).filter(i=>i!==PEAK && BARS[i]>=52).slice(0,5);
export const TODAY = BARS.length - 1;

// — Gems — GemMinimal floating-facet vectors (no stroke — pure fill geometry,
// so weight stays crisp at 14px; matches Phosphor's fill-based weights).
// Outline HITS → regular ring + floating girdle/facets · Peak → solid with
// transparent facet cuts (fill mask, no stroked lines).
const GEM_OUT = `<svg class="activity-strip__gem" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z M12.66 5.00L19.34 5.00Q21.63 5.00 23.26 6.61L26.74 10.04Q29.12 12.39 26.88 14.87L18.24 24.39Q16.00 26.87 13.76 24.39L5.12 14.87Q2.88 12.39 5.26 10.04L8.74 6.61Q10.37 5.00 12.66 5.00Z"/><rect x="7" y="11.4" width="18" height="1.4" rx="0.7" fill="currentColor"/><path d="M11.98 6.87L13.22 7.53L10.62 12.43L9.38 11.77Z" fill="currentColor"/><path d="M9.35 12.36L10.65 11.84L16.65 26.89L15.35 27.41Z" fill="currentColor"/><path d="M18.78 7.53L20.02 6.87L22.62 11.77L21.38 12.43Z" fill="currentColor"/><path d="M21.35 11.84L22.65 12.36L16.65 27.41L15.35 26.89Z" fill="currentColor"/></svg>`;
const GEM_FILL = `<svg class="activity-strip__gem" viewBox="0 0 32 32" fill="none" aria-hidden="true"><mask id="as-gem-fill"><path d="M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z" fill="white"/><rect x="8.2" y="11.4" width="15.6" height="1.4" rx="0.7" fill="black"/><path d="M11.98 6.87L13.22 7.53L10.62 12.43L9.38 11.77Z" fill="black"/><path d="M9.35 12.36L10.65 11.84L16.65 26.89L15.35 27.41Z" fill="black"/><path d="M18.78 7.53L20.02 6.87L22.62 11.77L21.38 12.43Z" fill="black"/><path d="M21.35 11.84L22.65 12.36L16.65 27.41L15.35 26.89Z" fill="black"/></mask><path d="M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z" fill="currentColor" mask="url(#as-gem-fill)"/></svg>`;

// — Render —
export function activityStripHTML(bars = BARS){
  return bars.map((h,i)=>`<span class="activity-strip__bar"><span class="activity-strip__gem-slot">${i===PEAK?GEM_FILL:HITS.includes(i)?GEM_OUT:""}</span><i class="${i===PEAK?"on":""}" style="--h:${h}px"></i><span class="activity-strip__dot-slot">${i===TODAY?`<b class="activity-strip__dot"></b>`:""}</span></span>`).join("");
}
