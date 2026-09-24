/* timeline-lab — rail ::before geometry 10px/6px, done vs todo, horizontal */
function tlInit(root){
if(root.dataset.done)return;root.dataset.done='1';
const q=s=>root.querySelector(s),qa=s=>Array.from(root.querySelectorAll(s));
const stage=q('[data-dlab-stage]'),preview=q('[data-dlab-preview]'),code=q('[data-dlab-code]'),ratio=q('[data-dlab-ratio]');
let axis='vertical',done='1';
const mark=(sel,attr,val)=>qa(sel).forEach(b=>b.classList.toggle('is-on',b.dataset[attr]===val));
function render(){
const n=Math.max(1,Math.min(5,parseInt(q('[data-tl-items]').value)||3));
const status=q('[data-tl-status]').value;const label=q('[data-tl-label]').value.trim()||'Blocked';
const compact=q('[data-tl-compact]').checked;
let cls=['timeline']; if(axis==='horizontal')cls.push('timeline--horizontal'); if(compact)cls.push('timeline--compact');
let h='<ol class="'+cls.join(' ')+'">';
for(let i=0;i<n;i++){
let icls=['timeline__item']; const isDone=done==='1'||(done==='2'&&i%2===0);
if(isDone) icls.push('timeline__item--done'); if(status) icls.push(status);
h+='<li class="'+icls.join(' ')+'"><span class="timeline__dot" aria-hidden="true"></span><span class="timeline__label">'+(i===n-1?label:'Step '+(i+1))+'</span><span class="timeline__time">S'+(i+1)+'</span></li>';
}
h+='</ol>'; preview.innerHTML=h;
const raw=preview.innerHTML.replace(/></g,'>\n<');
if(window.highlight){code.innerHTML=window.highlight(raw);code.classList.add('hl');}else code.textContent=raw;code.dataset.hlDone='1';
ratio.textContent=axis+(compact?' · compact':'')+' · '+(done==='0'?'todo':done==='1'?'done':'mixed')+(status?' · '+status.replace('timeline__item--',''):' · sapphire');
q('[data-dlab-note]').textContent='Rail ::before at 10px, dot 10px at 6px — off-scale pixel-identical. DOM order = time order.';
}
root.addEventListener('click',e=>{
const a=e.target.closest('[data-tl-axis]');if(a){axis=a.dataset.tlAxis;mark('[data-tl-axis]','tlAxis',axis);render();return;}
const d=e.target.closest('[data-tl-done]');if(d){done=d.dataset.tlDone;mark('[data-tl-done]','tlDone',done);render();return;}
const sf=e.target.closest('[data-dlab-surface]');if(sf){stage.dataset.surface=sf.dataset.dlabSurface;mark('[data-dlab-surface]','dlabSurface',stage.dataset.surface);return;}
const sc=e.target.closest('[data-dlab-scheme]');if(sc){stage.dataset.theme=sc.dataset.dlabScheme;mark('[data-dlab-scheme]','dlabScheme',stage.dataset.theme);return;}
if(e.target.closest('[data-dlab-copy]')) navigator.clipboard.writeText(code.textContent);
});
root.addEventListener('change',render);root.addEventListener('input',render);render();
}
function tlBoot(){document.querySelectorAll('[data-dlab="timeline"]').forEach(tlInit);}
document.addEventListener('ds:doc',tlBoot);tlBoot();
