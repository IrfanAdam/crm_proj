// ADAM/PATTERN — src/patterns/ActivityStrip/activity-strip.js · data-mark diamonds
// Exports: BARS, PEAK, HITS, TODAY, activityStripHTML
// [plan:2026-09-22_190645-visual-language.md#phase-3]

// — Data —
export const BARS = [30,42,36,28,48,62,40,52,34,38,44,36,50,33,39,46,31,43,55,37,41,29,47,35,58,40,32,45,38,50,34,42,49,36,31,44,53,39,46,33,41,57,35,43,30,48,37,45,52,34,40,46,32,38,51,44];
export const PEAK = BARS.indexOf(Math.max(...BARS));
export const HITS = BARS.map((_,i)=>i).filter(i=>i!==PEAK && BARS[i]>=52).slice(0,5);
export const TODAY = BARS.length - 1;

// — Gems —
const GEM_OUT = `<svg class="activity-strip__gem" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 14.2 6 8 14.2 1.8 6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
const GEM_FILL = `<svg class="activity-strip__gem" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 14.2 6 8 14.2 1.8 6Z" fill="currentColor"/></svg>`;

// — Render —
export function activityStripHTML(bars = BARS){
  return bars.map((h,i)=>`<span class="activity-strip__bar"><span class="activity-strip__gem-slot">${i===PEAK?GEM_FILL:HITS.includes(i)?GEM_OUT:""}</span><i class="${i===PEAK?"on":""}" style="--h:${h}px"></i><span class="activity-strip__dot-slot">${i===TODAY?`<b class="activity-strip__dot"></b>`:""}</span></span>`).join("");
}
