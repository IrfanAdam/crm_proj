import fs from 'fs'; import {join,dirname,basename} from 'path'; import {fileURLToPath} from 'url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const LAYERS=[['shell','workspace/'],['device','device/'],['os','os/'],['glass','glass/'],['patterns','patterns/'],['logic','logic/'],['components','components/'],['motion','motion/']];
const layerOf=f=>{for(const [n,p] of LAYERS) if(f.includes('/'+p)||f.startsWith(p)) return n; return 'root';};
const walk=d=>fs.readdirSync(join(root,d),{withFileTypes:true}).flatMap(e=>{const p=join(d,e.name); return e.isDirectory()?walk(p):p;});
const files=walk('src').filter(f=>/\.(m?js|jsx)$/.test(f));
const id=f=>f.replace(/^src\//,'').replace(/\.(m?js|jsx)$/,'').replace(/\//g,'_');
const edges=[], incoming={};
for(const f of files) incoming[f]=0;
for(const f of files){
  const t=fs.readFileSync(join(root,f),'utf8');
  const imps=[...t.matchAll(/(?:from\s+|import\s+)['"]([^'"]+)['"]/g)].map(m=>m[1]).filter(s=>s.startsWith('.'));
  for(const s of imps){
    let r=join(dirname(f),s); if(!/\.(m?js|jsx)$/.test(r)){ for(const e of ['.js','.jsx','/index.js']) if(fs.existsSync(join(root,r+e))){r+=e;break;} }
    if(!fs.existsSync(join(root,r))){ console.error('✗ map-graph — missing target: '+f+' -> '+s); process.exit(1); }
    edges.push([f,r]); if(incoming[r]!==undefined) incoming[r]++;
  }
}
// orphan = no edges either way and not an HTML-loaded entry (roots like main.jsx/canvas.js enter via <script>)
const html=fs.readFileSync(join(root,'index.html'),'utf8')+fs.readFileSync(join(root,'gallery.html'),'utf8');
const orphans=files.filter(f=>incoming[f]===0 && !edges.some(([a])=>a===f) && !html.includes(basename(f).replace(/\.(m?js|jsx)$/,'')));
// cycle check (DFS on internal edges)
const adj={}; for(const f of files) adj[f]=[];
for(const [a,b] of edges) if(adj[b]) adj[a].push(b);
const mark={}; let cycle=null;
const visit=(n,stack)=>{ mark[n]=1; for(const m of adj[n]||[]){ if(mark[m]===1){cycle=[...stack,m];return true;} if(!mark[m] && visit(m,[...stack,m])) return true; } mark[n]=2; return false; };
for(const f of files) if(!mark[f] && visit(f,[f])) break;
if(cycle){ console.error('✗ map-graph — cycle: '+cycle.join(' -> ')); process.exit(1); }
let mmd='graph TD\n';
for(const [n] of LAYERS){ mmd+='  subgraph '+n+'\n'; for(const f of files.filter(f=>layerOf(f)===n)) mmd+='    '+id(f)+'['+basename(f)+']\n'; mmd+='  end\n'; }
for(const [a,b] of edges) mmd+='  '+id(a)+' --> '+id(b)+'\n';
fs.writeFileSync(join(root,'docs/graph.mmd'),mmd);
console.log('✓ map-graph — '+files.length+' modules · '+edges.length+' edges · 0 cycles · orphans: '+(orphans.length?orphans.join(', '):'none'));
