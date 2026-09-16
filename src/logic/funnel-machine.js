export const FUNNEL_STATES={INITIAL:'initial',ELASTIC:'elastic',TOP:'top',MIDDLE:'middle',BOTTOM:'bottom',CLOSED:'closed',RETAINED:'retained'};
const NEXT={initial:'elastic',elastic:'top',top:'middle',middle:'bottom',bottom:'closed',closed:'retained',retained:'initial'};
export function createFunnelMachine(onChange){
 let state=FUNNEL_STATES.INITIAL, expanded=null;
 return{
  get state(){return state},
  get expanded(){return expanded},
  transition(to){
   if(!FUNNEL_STATES[to.toUpperCase()]) throw new Error('invalid '+to);
   state=FUNNEL_STATES[to.toUpperCase()];
   if(['top','middle','bottom','closed'].includes(state)) expanded=state;
   onChange?.(state,expanded);
   return state;
  },
  next(){ return this.transition(NEXT[state])},
  selectSegment(id){ expanded=id; state=id; onChange?.(state,expanded); return {state,expanded}},
  reset(){state=FUNNEL_STATES.INITIAL;expanded=null;onChange?.(state,expanded)}
 };
}
