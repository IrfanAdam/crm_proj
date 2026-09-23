/* ADAM/DS — src/ds/icon-playground.js · icon explorer */
// [plan:2026-09-23_002500-design-system-consolidation.md#phase-2] · weight + search + copy.
const IG_W={thin:'ph-thin',light:'ph-light',regular:'ph',bold:'ph-bold',fill:'ph-fill',duotone:'ph-duotone'};
const IG_ICONS=[
'house','house-line','users','users-three','user','handshake','magnifying-glass','funnel-simple',
'bell','gear','chart-line-up','chart-bar','chart-pie-slice','chart-polar','trend-up','presentation-chart',
'envelope','envelope-open','phone','phone-call','phone-outgoing','phone-disconnect','chat-circle','video-camera',
'calendar-blank','calendar-check','clock','timer','hourglass','map-pin','map-trifold','compass',
'check','check-circle','plus','x','caret-down','arrow-right','arrows-clockwise','download','upload',
'export','share-network','trash','pencil-simple','note-pencil','file-text','file-plus','bookmark',
'target','trophy','medal','diamond','sparkle','crown','rocket','flag','tag','heart','thumbs-up',
'smiley','star','lock','eye','eye-slash','info','question','warning-circle','sliders-horizontal','list',
'kanban','squares-four','dots-three','dots-three-vertical','gauge','wifi-high','bank','wallet',
'hand-coins','briefcase','microphone','camera','image','image-square','coffee','sun','moon',
'cloud','laptop','device-mobile','archive','folder'
];
const igState={q:'',w:'regular',s:24};
const igMatch=n=>!igState.q||n.includes(igState.q);
const igCell=n=>{
  const cls=IG_W[igState.w]+' ph-'+n;
  return '<button type="button" class="ig-cell" data-n="'+n+'" aria-label="'+n+'">'
    +'<i class="'+cls+'" style="font-size:'+igState.s+'px"></i><small>'+n+'</small></button>';
};
const igRender=host=>{
  const list=IG_ICONS.filter(igMatch);
  host.innerHTML=list.map(igCell).join('')||'<p class="meta">no match</p>';
  const note=document.querySelector('[data-ig-note]');
  if(note)note.textContent=list.length+' of '+IG_ICONS.length+' · '+igState.w+' · '+igState.s+'px — click to copy';
};
const igCopy=n=>{
  const note=document.querySelector('[data-ig-note]');
  const cls='<i class="'+IG_W[igState.w]+' ph-'+n+'"></i>';
  const done=()=>{if(note)note.textContent='copied '+cls};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(cls).then(done,done);
  else done();
};
const igInit=()=>{
  const host=document.querySelector('[data-ig-grid]');
  if(!host||host.dataset.done)return;
  host.dataset.done='1';
  const q=document.querySelector('[data-ig-q]');
  if(q)q.addEventListener('input',()=>{igState.q=q.value.trim().toLowerCase();igRender(host)});
  const seg=document.querySelector('[data-ig-w]');
  if(seg)seg.addEventListener('click',e=>{
    const b=e.target.closest('[data-w]');
    if(!b)return;
    igState.w=b.dataset.w;
    seg.querySelectorAll('[data-w]').forEach(x=>x.classList.toggle('chip--active',x===b));
    igRender(host);
  });
  const s=document.querySelector('[data-ig-s]');
  if(s)s.addEventListener('input',()=>{igState.s=+s.value;igRender(host)});
  host.addEventListener('click',e=>{
    const c=e.target.closest('[data-n]');
    if(c)igCopy(c.dataset.n);
  });
  igRender(host);
};
document.addEventListener('ds:doc',igInit);
igInit();
