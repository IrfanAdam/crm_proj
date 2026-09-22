import * as Decisions from './graphData.decisions.js';
import * as Schema from './graphData.schema.js';
import * as Logic from './graphData.logic.js';
const STORE = { decisions: Decisions, schema: Schema, logic: Logic };
let mode = (typeof localStorage !== 'undefined' && ['decisions','schema','logic'].includes(localStorage.getItem('mechanics:mode')) ? localStorage.getItem('mechanics:mode') : 'logic');
export let GROUPS = STORE[mode].GROUPS;
export let NODES = STORE[mode].NODES;
export let EDGES = STORE[mode].EDGES;
export let KINDS = STORE[mode].KINDS;
export function getMode(){ return mode; }
export function setMode(next){
  if(!['decisions','schema','logic'].includes(next)) return;
  if(next === mode) return;
  mode = next;
  try{ localStorage.setItem('mechanics:mode', mode); }catch{}
  GROUPS = STORE[mode].GROUPS;
  NODES = STORE[mode].NODES;
  EDGES = STORE[mode].EDGES;
  KINDS = STORE[mode].KINDS;
  try{ document.dispatchEvent(new CustomEvent('mechanics:mode', {detail:{mode}})); }catch{}
}
export function getGraph(){ return STORE[mode]; }
export const GRAPHS = STORE;
export const bases = Object.fromEntries(Object.entries(STORE).map(([k,v])=>[k,Object.fromEntries(v.GROUPS.map(g=>[g.id,{...g}]))]));
