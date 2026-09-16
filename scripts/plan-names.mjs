import fs from 'fs'; import {join,dirname} from 'path'; import {fileURLToPath} from 'url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
let names={}; try{names=JSON.parse(fs.readFileSync(join(root,'src/ds/changelog-names.json'),'utf8'))}catch{}
let plans=[]; try{plans=fs.readdirSync(join(root,'.hermes/plans')).filter(f=>f.endsWith('.md')).sort()}catch{}
let missing=[];
for(const f of plans){ let t=''; try{t=fs.readFileSync(join(root,'.hermes/plans',f),'utf8')}catch{continue}
 if(!/^##\s+Phase/m.test(t)) continue;
 if(!names[f]) missing.push(f);
 else{ if(names[f].title && names[f].title.length>76) missing.push(f+': title >76'); if(!names[f].purpose) missing.push(f+': no purpose'); }
}
if(missing.length){ console.error('✗ plan:names — missing entries:'); missing.forEach(m=>console.error(' '+m)); process.exit(1); }
console.log(`✓ plan:names — ${plans.filter(f=>{try{return /^##\s+Phase/m.test(fs.readFileSync(join(root,'.hermes/plans',f),'utf8'))}catch{return false}}).length} phased plans named`);
