/* ADAM/SHARED — src/arch/atlas-selection.js · detail bridge [plan:2026-09-22_155000-architecture-mechanics.md#phase-3] */
import { detailLogic } from './lens-logic.js';
import { detailSchema } from './lens-schema.js';
import { detailDecisions } from './lens-decisions.js';
import { getGraph, GRAPHS } from '../js/mechanics/graph.js';
export function ensureDetailEl(){
  let el=document.getElementById('atlas-sel');
  if(el) return el;
  const w=document.getElementById('atlas-canvas');
  const p=w? w.parentElement : document.getElementById('panel-architecture');
  if(!p) return null;
  el=document.createElement('div');
  el.id='atlas-sel'; el.className='atlas__sel'; el.setAttribute('role','region'); el.setAttribute('aria-live','polite'); el.tabIndex=0;
  if(w&&w.nextSibling) p.insertBefore(el,w.nextSibling); else if(w) p.appendChild(el); else p.appendChild(el);
  return el;
}
export function detailFor(id,lens){
  const g=(GRAPHS&&GRAPHS[lens])||getGraph();
  const n=(g.NODES||g.nodes||[]).find(x=>x.id===id);
  if(!n) return '<p>Pick a node to read its contract.</p>';
  if(lens==='decisions') return detailDecisions(n,g);
  if(lens==='schema') return detailSchema(n,g);
  return detailLogic(n,g);
}
export function paintSelection(state){
  const el=ensureDetailEl(); if(!el) return;
  const s=state.selected;
  el.innerHTML=s? detailFor(s,state.lens): '<p>Pick a node to read its contract.</p>';
}
