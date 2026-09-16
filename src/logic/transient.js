export const transient=(items)=>({kind:'transient',items, at:(t)=>items.find(i=>i.time===t)??items.at(-1)});
export const isTransient=(d)=>d?.kind==='transient';
export function filterTransient(list, time){ return list.filter(i=>i.time<=time); }
