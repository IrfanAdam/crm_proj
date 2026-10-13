import fs from 'fs'; import {execSync} from 'child_process'; import {fileURLToPath} from 'url'; import {dirname,join} from 'path';
import { split, state, hash } from '../src/pitch/changelog-parse.js';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const HIST_PATH=join(root,'design-system/plan-history.json');
const PLANS_DIR=join(root,'.hermes/plans');
let hist={}; try{hist=JSON.parse(fs.readFileSync(HIST_PATH,'utf8'))}catch{ hist={}; }
let plans=[]; try{plans=fs.readdirSync(PLANS_DIR).filter(f=>f.endsWith('.md')).sort()}catch{}
let totalAdded=0;
for(const file of plans){
  const rel=`.hermes/plans/${file}`;
  let log=''; try{log=execSync(`git log --follow --reverse --format='%H|%ad' --date=short -- "${rel}"`,{encoding:'utf8', cwd: root})}catch{ log=''; }
  const lines=log.trim()? log.trim().split('\n').filter(Boolean):[];
  if(!lines.length) continue;
  const gitEntries=[];
  const seenHash=new Set();
  for(const line of lines){
    const [sha, date]=line.split('|');
    if(!sha) continue;
    let md=''; try{ md=execSync(`git show ${sha}:"${rel}"`,{encoding:'utf8', cwd: root, maxBuffer: 10*1024*1024})}catch{ try{ md=execSync(`git show ${sha} -- "${rel}"`,{encoding:'utf8', cwd: root, maxBuffer: 10*1024*1024}).split('\n').slice(5).join('\n')}catch{ continue; } }
    // git show output for blob is just file content; if we used second form, we need to strip header – but first form should succeed if file existed
    if(!md || md.startsWith('commit ')) continue;
    // quick check: if md doesn't contain "## Phase" maybe still count but filter later
    const curHash=hash(md);
    if(seenHash.has(curHash)) continue;
    seenHash.add(curHash);
    const sprints=split(md);
    const sections=sprints.map(s=>({head:s.head, hash:hash(s.body), state:state(s.body)}));
    gitEntries.push({sha, date, hash:curHash, sections});
  }
  // merge with existing hist
  const existing=hist[file]||[];
  const merged=[];
  const mergedSeen=new Set();
  for(const e of gitEntries){
    if(!mergedSeen.has(e.hash)){ merged.push(e); mergedSeen.add(e.hash); }
  }
  for(const e of existing){
    if(!mergedSeen.has(e.hash)){ merged.push(e); mergedSeen.add(e.hash); }
    else {
      // if hash already exists, keep original provenance (earlier git) – skip duplicate from existing
    }
  }
  // ensure chronological sort by date, but preserve insertion order for same date? Use date string sort, but gitEntries already reverse chronological, and existing may be today after.
  // We keep merged order as gitEntries (oldest first) + new hashes from existing appended – already oldest first.
  // If merged differs from existing, update
  const prevStr=JSON.stringify(existing);
  const curStr=JSON.stringify(merged);
  if(prevStr!==curStr){
    hist[file]=merged;
    totalAdded+= merged.length - existing.length;
  }
}
fs.mkdirSync(join(root,'design-system'),{recursive:true});
fs.writeFileSync(HIST_PATH, JSON.stringify(hist,null,2));
console.log(`✓ plan-backfill — ${plans.length} plans · +${totalAdded} revs · ${Object.values(hist).reduce((a,v)=>a+v.length,0)} total revs`);
// after backfill, run tracker to restore last-is-current invariant
try{ execSync('node scripts/ds-track.mjs',{cwd: root, stdio:'inherit'});}catch{}
