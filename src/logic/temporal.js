export const temporal=(series)=>({kind:'temporal',series, trend:series.at(-1).value-series[0].value, reshape:(f)=>series.map(p=>({...p,value:f(p.value)}))});
export const isTemporal=(d)=>d?.kind==='temporal';
export function sliceTemporal(series, range){ const m={D:1,W:7,M:30,Q:90,Y:365}; return series.slice(-(m[range]??30)); }
