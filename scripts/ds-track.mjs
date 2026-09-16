import fs from 'fs'; import {execSync} from 'child_process'; import {fileURLToPath} from 'url'; import {dirname,join} from 'path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const DS=['DESIGN.md','design-system','tokens','src','prototype','preview.html','scripts','tests'];
let log=''; try{log=execSync(`git log --format='%H|%h|%ad|%s' --date=short -- ${DS.join(' ')}`,{encoding:'utf8'})}catch{log=''}
const TAG=/\[plan:([^\]#\s]+)(?:#([^\]]+))?\]/;
let commits=log.trim()? log.trim().split('\n').map(l=>{const [full,sha,date,subject]=l.split('|'); const m=subject.match(TAG); return {full,sha,date,subject,m,plan:m?.[1]||null,anchor:m?.[2]||null}}):[];
try{const prev=JSON.parse(fs.readFileSync(join(root,'design-system/changelog-manifest.json'),'utf8')); const seen=new Set(commits.map(c=>c.sha)); for(const c of prev.commits||[]) if(!seen.has(c.sha)) commits.push(c)}catch{}
let plans=[]; try{plans=fs.readdirSync(join(root,'.hermes/plans')).filter(f=>f.endsWith('.md')).sort()}catch{}
let wip=[]; try{const s=execSync(`git status --short -- ${DS.join(' ')}`,{encoding:'utf8'}); wip=s.trim()? s.trim().split('\n').map(l=>l.trim()).filter(l=>!l.includes('changelog-manifest.json')):[]}catch{}
let retro={}; try{retro=JSON.parse(fs.readFileSync(join(root,'.hermes/plan-links.json'),'utf8'))}catch{} for(const c of commits) if(retro[c.sha]){c.plan=retro[c.sha].plan; c.anchor=retro[c.sha].anchor;}
let cont='20260909_145218_9888b1'; try{cont=JSON.parse(fs.readFileSync(join(root,'.hermes/continuation.json'),'utf8')).continuation||cont}catch{}
let linked=commits.filter(c=>c.plan).length;
let tagged=0; for(const f of plans){ try{const t=fs.readFileSync(join(root,'.hermes/plans',f),'utf8'); if(/\*\*Tags:\*\*/.test(t)) tagged++; }catch{}}
const manifest={generated:new Date().toISOString(), continuation:cont, plans, commits:commits.map(c=>({sha:c.sha,full:c.full,date:c.date,subject:c.subject.replace(TAG,'').trim(),plan:c.plan,anchor:c.anchor})), wip};
if(JSON.stringify(manifest.commits)===JSON.stringify((()=>{try{return JSON.parse(fs.readFileSync(join(root,'design-system/changelog-manifest.json'),'utf8')).commits}catch{return []}})()) && JSON.stringify(manifest.wip)===JSON.stringify((()=>{try{return JSON.parse(fs.readFileSync(join(root,'design-system/changelog-manifest.json'),'utf8')).wip}catch{return []}})())){} // keep generated
else{ try{const prev=JSON.parse(fs.readFileSync(join(root,'design-system/changelog-manifest.json'),'utf8')); if(JSON.stringify({plans:manifest.plans,commits:manifest.commits,wip:manifest.wip})===JSON.stringify({plans:prev.plans,commits:prev.commits,wip:prev.wip})) manifest.generated=prev.generated;}catch{}}
fs.mkdirSync(join(root,'design-system'),{recursive:true}); fs.writeFileSync(join(root,'design-system/changelog-manifest.json'),JSON.stringify(manifest,null,2));
console.log(`✓ ds-track — ${plans.length} plans · ${commits.length} DS commits (${linked} linked) · ${wip.length} wip · cont ${cont} ${tagged}/${plans.length} tagged`);
