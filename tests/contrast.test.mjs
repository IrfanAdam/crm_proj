const h=v=>{v=v.replace('#',''); if(v.length===3) v=v.split('').map(c=>c+c).join(''); const n=parseInt(v.slice(0,6),16); return [(n>>16)&255,(n>>8)&255,n&255];};
const lum=([r,g,b])=>{const s=[r,g,b].map(x=>{x/=255; return x<=0.04045? x/12.92 : Math.pow((x+0.055)/1.055,2.4)}); return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2];};
const ratio=(a,b)=>{const A=lum(h(a)),B=lum(h(b)); const hi=Math.max(A,B), lo=Math.min(A,B); return (hi+0.05)/(lo+0.05);};
const V=r=> r>=7?'AAA': r>=4.5?'AA': r>=3?'AA large':'Fail';
const pairs=[
 ['ink on paper','#222222','#fafafa',7,'AAA — body text on paper'],
 ['secondary on paper','#525252','#fafafa',4.5,''],
 ['white on sapphire-500','#ffffff','#1666af',4.5,'pill progress'],
 ['white on --role-action','#ffffff','#1666af',4.5,'role-action (sapphire-500)'], 
 ['ink on success','#222222','#18d824',4.5,'ACCEPTED'],
 ['ink on warning','#222222','#f57f26',4.5,'caution chip'],
 ['white on red-beryl-400','#ffffff','#ea005e',4.5,'error variant'],
 ['--role-score on white','#ea005e','#ffffff',4.5,'role-score (red-beryl-400) on white — score text'], 
 ['white on --role-measure (AA-large)','#ffffff','#a54cff',3,'AA large exempt (4.14) — role-measure large/bold only'],
 ['goal-bar 400 on white','#a54cff','#ffffff',3,'AA large exempt (4.14)'],
 ['goal-bar 700 on white','#27004d','#ffffff',4.5,'gem bar'],
 ['white on dark surface','#ffffff','#141414',4.5,'dark'],
 ['amethyst-100 on ink','#f7eeff','#222222',4.5,''],
 ['role.action — white on base','#ffffff','#1666af',4.5,'role.action'],
 ['role.action.soft — ink on it','#222222','#7cbefb',4.5,'role.action.soft'],
 ['role.measure — white on strong','#ffffff','#6e00db',4.5,'role.measure.strong'],
 ['role.score — white on base','#ffffff','#ea005e',4.5,'role.score'],
 ['role.streak — ink on base','#222222','#ffb01e',4.5,'role.streak'],
 ['role.success — ink on base','#222222','#18d824',4.5,'role.success'],
 ['role.danger — white on base','#ffffff','#e00000',4.5,'role.danger'],
 ['role.danger.soft — ink on it','#222222','#ff3d3d',4.5,'role.danger.soft'],
 ['role.warning — ink on base','#222222','#f57f26',4.5,'role.warning'],
 ['text.muted on paper','#737373','#fafafa',4.5,'text.muted — ladder fixed, monotonic in both themes'],
];
let fails=0;
for(const [name,fg,bg,need,note] of pairs){
 const r=ratio(fg,bg); const ok = note.includes('exempt') ? r>=3 : r>=need;
 console.log(`${ok?'✓':'✗'} ${name} ${fg} on ${bg} → ${r.toFixed(2)} ${V(r)} ${note} ${ok?'':'FAIL need '+need}`);
 if(!ok) fails++;
}
if(fails){console.error(`✗ contrast — ${fails} fail`); process.exit(1);}
console.log('✓ contrast — all pairs pass (goal-bar 4.14 exempt as AA large)');
