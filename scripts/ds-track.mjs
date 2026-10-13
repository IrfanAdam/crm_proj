import fs from 'fs'; import {execSync} from 'child_process'; import {fileURLToPath} from 'url'; import {dirname,join} from 'path';
import { split, state, hash } from '../src/pitch/changelog-parse.js';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const DS=['DESIGN.md','design-system','tokens','src','prototype','preview.html','scripts','tests','gallery.css','public/foundations','public/language-panel.html','index.html','gallery.html','pitch.html','pitch-changelog.html','changelog.html','vite.config.js','public/pitch','public/pitch-v2'];
let log=''; try{log=execSync(`git log --format='%H|%h|%ad|%s' --date=format:'%Y-%m-%d|%H:%M' -- ${DS.join(' ')}`,{encoding:'utf8'})}catch{log=''}
const TAG=/\[plan:([^\]#\s]+)(?:#([^\]]+))?\]/;
let commits=log.trim()? log.trim().split('\n').map(l=>{const [full,sha,date,time,...rest]=l.split('|'); const subject=rest.join('|'); const m=subject.match(TAG); return {full,sha,date,time:time||null,subject,m,plan:m?.[1]||null,anchor:m?.[2]?.replace(/^\{\#|^\#|\}$/g,'')||null}}):[];
try{const prev=JSON.parse(fs.readFileSync(join(root,'design-system/changelog-manifest.json'),'utf8')); const seen=new Set(commits.map(c=>c.sha)); for(const c of prev.commits||[]) if(!seen.has(c.sha)) commits.push(c)}catch{}
let plans=[]; try{plans=fs.readdirSync(join(root,'.hermes/plans')).filter(f=>f.endsWith('.md')).sort()}catch{}
let wip=[]; try{const s=execSync(`git status --short -- ${DS.join(' ')}`,{encoding:'utf8'}); wip=s.trim()? s.trim().split('\n').map(l=>l.trim()).filter(l=>!l.includes('changelog-manifest.json') && !l.includes('plan-history.json')):[]}catch{}
const GENERATED=new Set(['design-system/changelog-manifest.json','design-system/plan-history.json','src/arch/atlas.json','src/arch/arch-atlas.json']);
function isPlumbing(sha){ try{ const files=execSync(`git show --name-only --format="" ${sha}`,{encoding:'utf8'}).trim().split('\n').filter(Boolean); if(!files.length) return false; return files.every(f=>GENERATED.has(f)); }catch{ return false; } }
commits=commits.filter(c=>!isPlumbing(c.sha));
commits.sort((a,b)=> b.date.localeCompare(a.date) || (b.time||'').localeCompare(a.time||'') || b.sha.localeCompare(a.sha));
let retro={}; try{retro=JSON.parse(fs.readFileSync(join(root,'.hermes/plan-links.json'),'utf8'))}catch{} for(const c of commits) if(retro[c.sha]){c.plan=retro[c.sha].plan; c.anchor=retro[c.sha].anchor;}
commits.forEach(c=>{ if(c.anchor) c.anchor=c.anchor.replace(/^\{\#|^\#|\}$/g,''); });
commits.sort((a,b)=> b.date.localeCompare(a.date) || (b.time||'').localeCompare(a.time||'') || b.sha.localeCompare(a.sha));
let cont='20260909_145218_9888b1'; try{cont=JSON.parse(fs.readFileSync(join(root,'.hermes/continuation.json'),'utf8')).continuation||cont}catch{}
let linked=commits.filter(c=>c.plan).length;
let tagged=0; for(const f of plans){ try{const t=fs.readFileSync(join(root,'.hermes/plans',f),'utf8'); if(/\*\*Tags:\*\*/.test(t)) tagged++; }catch{}}
const manifest={generated:new Date().toISOString(), continuation:cont, plans, commits:commits.map(c=>({sha:c.sha,full:c.full,date:c.date,time:c.time,subject:c.subject.replace(TAG,'').trim(),plan:c.plan,anchor:c.anchor})), wip};
try{const prev=JSON.parse(fs.readFileSync(join(root,'design-system/changelog-manifest.json'),'utf8')); if(JSON.stringify({plans:manifest.plans,commits:manifest.commits,wip:manifest.wip})===JSON.stringify({plans:prev.plans,commits:prev.commits,wip:prev.wip})) manifest.generated=prev.generated;}catch{}
fs.mkdirSync(join(root,'design-system'),{recursive:true}); fs.writeFileSync(join(root,'design-system/changelog-manifest.json'),JSON.stringify(manifest,null,2));

// --- plan-history (iteration tracking) ---
const HIST_PATH=join(root,'design-system/plan-history.json');
let prevHist={}; try{prevHist=JSON.parse(fs.readFileSync(HIST_PATH,'utf8'))}catch{ prevHist={}; }
const hist={...prevHist};
let histChanged=false;
const today=new Date().toISOString().slice(0,10);
for(const file of plans){
  let md=''; try{md=fs.readFileSync(join(root,'.hermes/plans',file),'utf8')}catch{continue}
  const curHash=hash(md);
  const sprints=split(md);
  const sections=sprints.map(s=>({head:s.head, hash:hash(s.body), state:state(s.body)}));
  let sha=null, date=today;
  try{
    const st=execSync(`git status --porcelain -- ".hermes/plans/${file}"`,{encoding:'utf8'}).trim();
    const isDirty=!!st;
    if(!isDirty){
      const line=execSync(`git log -1 --format='%H|%ad' --date=short -- ".hermes/plans/${file}"`,{encoding:'utf8'}).trim();
      if(line){ const [h,d]=line.split('|'); if(h){ sha=h; date=d; } }
    }
  }catch{}
  const arr=hist[file]||[];
  const idx=arr.findIndex(e=>e.hash===curHash);
  if(idx!==-1){
    if(idx!==arr.length-1){
      const entry=arr.splice(idx,1)[0];
      arr.push(entry);
      histChanged=true;
    }
  } else {
    arr.push({sha, date, hash:curHash, sections});
    histChanged=true;
  }
  hist[file]=arr;
}
let prevHistStr=''; try{prevHistStr=JSON.stringify(prevHist)}catch{}
const curHistStr=JSON.stringify(hist);
if(curHistStr!==prevHistStr) histChanged=true;
if(histChanged){
  fs.writeFileSync(HIST_PATH, JSON.stringify(hist,null,2));
} else {
  if(!fs.existsSync(HIST_PATH)) fs.writeFileSync(HIST_PATH, JSON.stringify(hist,null,2));
}
const revs=Object.values(hist).reduce((a,v)=>a+v.length,0);
console.log(`✓ ds-track — ${plans.length} plans · ${commits.length} DS commits (${linked} linked) · ${wip.length} wip · ${revs} revs · cont ${cont} ${tagged}/${plans.length} tagged`);
