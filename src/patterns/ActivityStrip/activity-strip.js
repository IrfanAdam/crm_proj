// ADAM/PATTERN — src/patterns/ActivityStrip/activity-strip.js · data-mark diamonds
// Exports: BARS, PEAK, HITS, TODAY, activityStripHTML
// [plan:2026-09-22_190645-visual-language.md#phase-3]

// — Data —
export const BARS = [30,42,36,28,48,62,40,52,34,38,44,36,50,33,39,46,31,43,55,37,41,29,47,35,58,40,32,45,38,50,34,42,49,36,31,44,53,39,46,33,41,57,35,43,30,48,37,45,52,34,40,46,32,38,51,44];
export const PEAK = BARS.indexOf(Math.max(...BARS));
export const HITS = BARS.map((_,i)=>i).filter(i=>i!==PEAK && BARS[i]>=52).slice(0,5);
export const TODAY = BARS.length - 1;

// — Gems — GemMinimal regular + fill (same geometry as Icon gem-minimal,
// same weight contract: regular stroke 2 round caps/joins; fill solid +
// mask-cut seams).
const GEM_OUT = `<svg class="activity-strip__gem" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z"/><path d="M7 12.1L25 12.1"/><path d="M12.6 7.2L10 12.1L16 27.15M19.4 7.2L22 12.1L16 27.15"/></svg>`;
const GEM_FILL = `<svg class="activity-strip__gem" viewBox="0 0 32 32" fill="none" aria-hidden="true"><mask id="as-gem-fill"><path d="M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z" fill="white" stroke="white" stroke-width="3"/><path d="M8.2 12.1L23.8 12.1M12.6 7.2L10 12.1L16 27.15M19.4 7.2L22 12.1L16 27.15" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></mask><path d="M12.2 3.7L19.8 3.7Q22.4 3.7 24.25 5.53L28.21 9.43Q30.91 12.1 28.36 14.92L18.55 25.74Q16 28.56 13.45 25.74L3.64 14.92Q1.09 12.1 3.79 9.43L7.75 5.53Q9.6 3.7 12.2 3.7Z" fill="currentColor" stroke="currentColor" stroke-width="3" mask="url(#as-gem-fill)"/></svg>`;

// — Render —
export function activityStripHTML(bars = BARS){
  return bars.map((h,i)=>`<span class="activity-strip__bar"><span class="activity-strip__gem-slot">${i===PEAK?GEM_FILL:HITS.includes(i)?GEM_OUT:""}</span><i class="${i===PEAK?"on":""}" style="--h:${h}px"></i><span class="activity-strip__dot-slot">${i===TODAY?`<b class="activity-strip__dot"></b>`:""}</span></span>`).join("");
}
