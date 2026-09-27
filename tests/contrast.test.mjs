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
['lab tertiary core-red — score-strong on surface','#a80035','#ffffff',4.5,'playground tertiary tint'],
['lab tertiary core-yellow — streak-strong on surface','#9d6a00','#ffffff',4.5,'playground tertiary tint'],
['lab tertiary success — green-700 on surface','#0c6a12','#ffffff',4.5,'playground tertiary tint'],
['lab tertiary destructive — danger-strong on surface','#c20000','#ffffff',4.5,'playground tertiary tint'],
['lab tertiary warning — orange-700 on surface','#ab4e08','#ffffff',4.5,'playground tertiary tint'],
['lab wash citrine-200 ink','#141414','#ffe0a3',4.5,'playground secondary wash'],
['lab wash green-100 ink','#141414','#7ef186',4.5,'playground secondary wash'],
['lab wash red-300 ink','#141414','#ff3d3d',4.5,'playground secondary wash'],
['lab wash orange-200 ink','#141414','#f8ac72',4.5,'playground secondary wash'],
['lab wash red-beryl-200 ink','#141414','#ffaac5',4.5,'playground secondary wash'],
['lab wash gray-100 ink','#141414','#e0e0e0',4.5,'playground neutral wash'],
['pitch brand sapphire-500 on paper','#1666af','#fafafa',4.5,'masthead brand, section titles, pills, CEP quotes'],
['pitch eyebrow sapphire-500 on paper','#1666af','#fafafa',4.5,'eyebrows, labels, card nums — violet-mid remapped 400→500 for this'],
['pitch body muted on paper','#737373','#fafafa',4.5,'body copy, captions, table cells'],
['pitch secondary on paper','#525252','#fafafa',4.5,'card titles, table first col'],
['pitch hero gradient red-beryl large','#ea005e','#fafafa',3,'AA-large: Alphas. 2.6-4.4rem extrabold'],
['pitch hero gradient amethyst large','#a54cff','#fafafa',3,'AA-large: Alphas. 2.6-4.4rem extrabold'],
['pitch theme-block title on wash','#1666af','#f5f9ff',4.5,'sapphire-50 wash'],
['pitch table head on wash','#1666af','#f5f9ff',4.5,'thead on sapphire-50'],
['pitch filter active white on sapphire','#ffffff','#1666af',4.5,'active filter tag'],
['pitch insight numeral sapphire-400 on white','#218aea','#ffffff',3,'AA-large: 2rem extrabold numerals'],
['pitch spine numeral sapphire-400 on paper','#218aea','#fafafa',3,'AA-large: 1.6rem extrabold numerals'],
['pitch footer line on deep','#ebf5fe','#011020',4.5,'f-line sapphire-100 on sapphire-900'],
['pitch footer body on deep','#c1e0fd','#011020',4.5,'foot-text sapphire-200'],
['pitch footer muted on deep','#7cbefb','#011020',4.5,'foot-muted sapphire-300, alt-liners'],
['pitch footer gradient red-beryl large','#ff85ab','#011020',3,'AA-large: f-line span 1.8-3rem extrabold'],
['pitch footer gradient amethyst large','#c48aff','#011020',3,'AA-large: f-line span'],
['pitch footer pitch-label on deep','#c48aff','#011020',4.5,'f-pitch-label amethyst-300 small caps'],
];
let fails=0;
for(const [name,fg,bg,need,note] of pairs){
 const r=ratio(fg,bg); const ok = note.includes('decorative') ? true : (note.includes('exempt') ? r>=3 : r>=need);
 console.log(`${ok?'✓':'✗'} ${name} ${fg} on ${bg} → ${r.toFixed(2)} ${V(r)} ${note} ${ok?'':'FAIL need '+need}`);
 if(!ok) fails++;
}
if(fails){console.error(`✗ contrast — ${fails} fail`); process.exit(1);}
console.log('✓ contrast — all pairs pass (goal-bar 4.14 exempt as AA large)');
