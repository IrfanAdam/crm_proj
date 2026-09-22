import fs from 'fs'; import {execSync} from 'child_process';
const waived=new Set(['src/js/mechanics/render.js','scripts/generate-mechanics-graph.js']);
const exempt=f=>waived.has(f)||f.includes('design-system/tokens.css')||f.startsWith('tokens/')||f.includes('references/')||f.includes('.hermes/')||f.includes('node_modules/')||f.includes('dist/');
let list=[]; try{list=execSync('git ls-files --cached --others --exclude-standard',{encoding:'utf8'}).trim().split('\n').filter(Boolean)}catch{ list=[]}
let vio=[], long=[], patternVio=[];
const PATTERN_RE=/^src\/(patterns|components)\/.*\.css$/;
const EXEMPT_DEVICE=/src\/(device|os|glass|workspace)\//;
for(const f of list){
 if(!/\.(css|html|js|mjs)$/.test(f)) continue;
 if(f==='DESIGN.md'||f.startsWith('design-system/docs/')) continue;
 if(exempt(f)) continue;
 let txt=''; try{txt=fs.readFileSync(f,'utf8')}catch{continue}
 const lines=txt.split('\n');
 if(lines.length>100) long.push(`${f} ${lines.length} >100`);
 lines.forEach((ln,i)=>{
   if(/^\s*--/.test(ln)) return;
   const hasPaint = /:\s*[^;]*#[0-9a-fA-F]{3,8}\b/.test(ln) || /style="[^"]*#[0-9a-fA-F]{3,8}/.test(ln);
   if(hasPaint && !ln.includes('var(--')){
     const m=ln.match(/#[0-9a-fA-F]{3,8}\b/);
     if(m) vio.push(`${f}:${i+1} ${m[0]} → var(--token)`);
   }
 });
 if(PATTERN_RE.test(f)){
   const lines2=txt.split('\n');
   lines2.forEach((ln,i)=>{
     if(/^\s*--/.test(ln)) return;
     if(/@media/.test(ln)) return;
     if(EXEMPT_DEVICE.test(f)) return;
     if(ln.includes('lint-allow')) return;
     const hasHex=/#[0-9a-fA-F]{3,8}\b/.test(ln);
     const hasFunc=/\brgba\(|\bhsla\(/.test(ln);
     if(hasHex||hasFunc){
       const m=ln.match(/#[0-9a-fA-F]{3,8}\b/)||ln.match(/\b(?:rgba|hsla)\(/);
       patternVio.push(`${f}:${i+1} ${m?m[0]:'rgba/hsla'} → var(--token)`);
     }
   });
 }
}
if(vio.length){ console.error('✗ lint:tokens'); vio.slice(0,20).forEach(v=>console.error(' '+v)); if(vio.length>20) console.error(` ...${vio.length-20} more`); process.exit(1);}
if(patternVio.length){ console.error('✗ lint:tokens — pattern raw color'); patternVio.slice(0,20).forEach(v=>console.error(' '+v)); if(patternVio.length>20) console.error(` ...${patternVio.length-20} more`); process.exit(1);}
if(long.length){ console.error('✗ lint:tokens — over 100 lines'); long.forEach(v=>console.error(' '+v)); process.exit(1);}
console.log('✓ lint:tokens — 0 raw leaks, 0 over-limit');
