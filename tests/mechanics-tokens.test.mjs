/* Task 1 — mechanics tokens shim DTCG [plan:2026-09-22_155000-architecture-mechanics.md#phase-1] */
import { readFileSync } from 'node:fs';
const css = readFileSync('design-system/tokens.css','utf8');
let fails=0;
const ok=(name,cond)=>{ console.log(`${cond?'✓':'✗'} ${name}`); if(!cond) fails++; };
const has=t=>css.includes(t);
// stone 50..900 (9)
for(const k of ['--stone-50','--stone-100','--stone-200','--stone-300','--stone-500','--stone-600','--stone-700','--stone-800','--stone-900']) ok(`tokens ${k}`, has(k));
// violet
for(const k of ['--violet-50','--violet-600']) ok(`tokens ${k}`, has(k));
// amber 50..800
for(const k of ['--amber-50','--amber-100','--amber-200','--amber-400','--amber-600','--amber-700','--amber-800']) ok(`tokens ${k}`, has(k));
// emerald
for(const k of ['--emerald-50','--emerald-700']) ok(`tokens ${k}`, has(k));
// rose
for(const k of ['--rose-50','--rose-600']) ok(`tokens ${k}`, has(k));
// orange
for(const k of ['--orange-50','--orange-600']) ok(`tokens ${k}`, has(k));
// blue
ok('tokens --blue-600', has('--blue-600'));
// semantic
for(const k of ['--color-bg','--color-card','--color-border','--z-mechanics','--size-tooltip']) ok(`tokens ${k}`, has(k));
// also alias targets exist
for(const k of ['--bg-primary','--bg-surface','--border-thin','--z-index-modal']) ok(`alias target ${k}`, has(k));
if(fails){ console.error(`✗ mechanics-tokens — ${fails} missing`); process.exit(1); }
console.log('✓ mechanics-tokens — all required tokens present');
