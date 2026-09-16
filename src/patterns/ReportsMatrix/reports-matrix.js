export const MATRIX={blob:{D:'dots',W:'dots',M:'bars',Q:'bars',Y:'bars'},goals:{D:'bar',W:'bar',M:'bar',Q:'bar',Y:'bar'}};
export function renderReportsMatrix({period='M', mode='blob'}={}){
 const cell=MATRIX[mode]?.[period]||'—';
 return `<div class="reports-matrix"><div class="reports-matrix__tabs">${['D','W','M','Q','Y'].map(p=>`<button class="reports-matrix__tab ${p===period?'reports-matrix__tab--active':''}">${p}</button>`).join('')}<span style="margin-left:auto" class="meta">${mode}</span></div><div class="reports-matrix__grid"><div class="reports-matrix__cell reports-matrix__cell--blob">${cell}</div><div class="reports-matrix__cell">${mode==='goals'?'Goal bar 72%':'Activity dots'}</div></div><div class="reports-matrix__chips"><span class="chip chip--active">Business</span><span class="chip">Performance</span><span class="chip">Productivity</span></div></div>`;
}
export function reshapeForPeriod(period){ return ['Y','Q','M','W','D'].indexOf(period); }
