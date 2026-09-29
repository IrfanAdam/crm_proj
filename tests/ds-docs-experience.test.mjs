/* ADAM/TOOL — tests/ds-docs-experience.test.mjs · gate [plan:2026-09-29_132702-ds-docs-experience.md#phase-4] */
// Baseline 2026-09-29 ~57/100 (read 18·nav15·mob16·hyg8) → target ≥85 after Ph2/3. 0-100 (read30·nav30·mob25·hyg15) fail<85.
import{readFileSync as rf,existsSync as ex,readdirSync}from'node:fs';import{join,dirname}from'node:path';import{fileURLToPath}from'node:url';import{execSync}from'node:child_process';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');const R=p=>{try{return rf(join(root,p),'utf8')}catch{return''}};
const gh=R('gallery.html'),gcss=R('gallery.css'),gsub=R('gallery-subnav.css'),gchr=R('src/ds/gallery-chrome.css');
const sh=R('src/ds/gallery-shell.js'),sn=R('src/ds/gallery-subnav.js');
let extraJs='';try{for(const f of readdirSync(join(root,'src/ds'))) if(/^gallery-/.test(f)&&f.endsWith('.js')) extraJs+='\n'+R('src/ds/'+f);}catch{}
const aCss=gcss+'\n'+gsub+'\n'+gchr,aJs=sh+'\n'+sn+'\n'+extraJs;let F=[];const fix=m=>{if(m&&!F.includes(m))F.push(m)};let rd=0,nv=0,mb=0,hg=0;
// — readability 30 —
{const P=[...gh.matchAll(/data-panel="([^"]+)"/g)].map(m=>m[1]);if(gh.includes('data-tab="language"')&&!P.includes('language'))P.push('language');
let h=0;for(const s of gh.split(/data-panel="/).slice(1))if(/<h1[\s>]/i.test(s.slice(0,8000)))h++;const pts=Math.round(8*h/(P.length||1));rd+=pts;if(pts<8)fix(`readability: add one H1 per panel — ${h}/${P.length} have <h1>`);}
{let ok=false,any=false;for(const b of aCss.split('}')){const m=b.match(/max-width\s*:\s*([\d.]+)ch/);if(!m)continue;const v=Number(m[1]);if(v<=72)any=true;if(v<=72&&/(?:\.pad|prose|ch-lede|spec-note|tp-lead)/.test(b))ok=true;}
if(ok)rd+=8;else if(any){rd+=3;fix('readability: cap prose at ≤72ch on .pad/prose (found only spec-note 62ch); add 68ch to main prose');}else fix('readability: add max-width:68ch (≤72ch) to prose (.pad/.prose) in gallery.css');}
{let ok=0,tot=0;for(const b of gh.split('<div class="frame"').slice(1)){const d=[...b.matchAll(/data-doc="([^"]+)"/g)].map(m=>m[1]);if(!d.some(x=>x.includes('-lab.')))continue;tot++;const i=d.findIndex(x=>x.includes('intro')),l=d.findIndex(x=>x.includes('-lab.'));if(i!==-1&&l!==-1&&i<l)ok++;else fix(`readability: intro→lab→spec order — ${d.join(', ')}`);}rd+=Math.round(7*(tot?ok/tot:1));}
{const has=/data-lang|language-|code-label|\.tp-code::before/.test(aCss)||/data-lang/.test(gh+sh),css=/::before[^}]*attr\(data-lang/.test(aCss);
if(has&&css)rd+=7;else if(has){rd+=3;fix('readability: code samples need language badge (CSS ::before attr(data-lang))');}else fix('readability: add language label to code samples (data-lang + CSS badge)');}
// — nav 30 —
{const t=[...gh.matchAll(/data-tab="([^"]+)"/g)].map(m=>m[1]);const p=new Set([...gh.matchAll(/data-panel="([^"]+)"/g)].map(m=>m[1]));if(ex(join(root,'public/language-panel.html')))p.add('language');
let r=0;for(const x of t)if(p.has(x))r++;const pts=t.length?Math.round(8*r/t.length):0;nv+=pts;if(pts<8)fix(`nav: every data-tab needs [data-panel] — ${r}/${t.length} reachable`);}
{const ok=/<input[^>]*type="search"/i.test(gh)||/placeholder="[^"]*search/i.test(gh)||gh.includes('role="search"')||gh.includes('data-search');if(ok)nv+=7;else fix('nav: add <input type="search"> in .dnav/header for section filter');}
{const ok=/filter/i.test(aJs)&&/dnav__item/.test(aJs)||/filter.*dnav/i.test(aJs);if(ok)nv+=5;else fix('nav: wire search input to filter .dnav__item (input→hide non-match)');}
{const has=/class="[^"]*prev|class="[^"]*next|rel="prev"|rel="next"/i.test(gh)||/prev.*panel|next.*panel/i.test(aJs);if(has)nv+=5;else fix('nav: add prev/next footer resolving to next data-panel in section order');}
{const ok=/location\.hash/.test(aJs)&&/data-panel/.test(aJs)&&/dsTab/.test(aJs);if(ok)nv+=5;else fix('nav: hash deep-link (#tab) must map to real [data-panel] via dsTab and survive reload');}
// — mobile 25 —
{let pts=0;const a=/aria-expanded/.test(gh+aJs),s=/scrim/i.test(gh+aCss+aJs),e=/Escape/.test(aJs)&&/keydown/.test(aJs);if(a)pts+=3;else fix('mobile: drawer needs [aria-expanded] on menu button');
if(s)pts+=3;else fix('mobile: add scrim overlay for drawer (click to close, scroll lock)');if(e)pts+=4;else fix('mobile: handle ESC to close drawer (keydown Escape→close)');mb+=pts;}
{const ok=/@media[^}]*max-width\s*:\s*700px/.test(gcss)||/@media[^}]*max-width\s*:\s*700px/.test(gsub)||/@media[^}]*max-width\s*:\s*700px/.test(gchr);if(ok)mb+=5;else fix('mobile: add @media (max-width:700px) for drawer/ramp/table reflow');}
{const re=/min-width\s*:\s*(\d{3,})px/g;let bad=[];for(const [n,t] of [['gallery.css',gcss],['gallery-subnav.css',gsub],['gallery-chrome.css',gchr]]){let m;while(m=re.exec(t))bad.push(`${n} min-width:${m[1]}px`);}
if(!bad.length)mb+=5;else fix(`mobile: remove fixed min-width ≥100px (${bad.slice(0,2).join(', ')}) → min-width:0`);}
{const b=(gcss.match(/\.dnav__item\s*\{[^}]+\}/)||[''])[0]+(gsub.match(/\.dnav__item\s*\{[^}]+\}/)||[''])[0]+(gchr.match(/\.dnav__item\s*\{[^}]+\}/)||[''])[0];
let ok=false;if(b){const lg=/var\(--spacing-3\)|var\(--spacing-4\)|12px|16px/.test(b),sm=/var\(--spacing-2\)/.test(b)&&!/var\(--spacing-3\)|var\(--spacing-4\)/.test(b);ok=lg&&!sm;
const px=b.match(/padding[^;]*:\s*([\d.]+)px/);if(px&&Number(px[1])>=12)ok=true;}if(ok)mb+=5;else fix('mobile: .dnav__item padding ≥12px vertical (var(--spacing-3))');}
// — hygiene 15 —
{let ok=false;try{execSync('node scripts/lint-tokens.mjs',{stdio:'pipe'});ok=true}catch{}if(ok)hg+=7;else fix('hygiene: fix lint-tokens — no #hex, tokens only, ≤100 lines');}
{const t=['gallery.html','gallery.css','gallery-subnav.css','src/ds/gallery-chrome.css','src/ds/gallery-shell.js','src/ds/gallery-subnav.js','src/ds/gallery-hero.js','src/ds/gallery-filter.js','src/ds/gallery-drawer.js','src/ds/gallery-behavior.js'];let ov=[];for(const f of t){const c=R(f);const n=c?c.split('\n').length:0;if(n>100)ov.push(`${f} ${n}>100`);}
if(!ov.length)hg+=4;else fix(`hygiene: split to ≤100 lines — ${ov.slice(0,2).join(', ')}`);}
{const re=/#[0-9a-fA-F]{3,8}\b/g;let h=[];for(const [n,t] of [['gallery.html',gh],['gallery.css',gcss],['gallery-subnav.css',gsub],['src/ds/gallery-chrome.css',gchr],['src/ds/gallery-shell.js',sh],['src/ds/gallery-subnav.js',sn]]){
for(const [i,l] of t.split('\n').entries()){if(/^\s*--/.test(l))continue;const m=l.match(re);if(m&&!l.includes('var(--'))h.push(`${n}:${i+1} ${m[0]}`);}}
if(!h.length)hg+=4;else fix(`hygiene: no #hex — ${h.slice(0,2).join(', ')} → var(--token)`);}
const tot=rd+nv+mb+hg;const lab=`docs-experience ${tot}/100 (read ${rd} · nav ${nv} · mobile ${mb} · hyg ${hg})`;const top=F.slice(0,3).join(' | ');
const sum=top?`${lab} — fix: ${top}`:lab;if(tot>=85){console.log(`✓ ${sum}`);process.exit(0);}else{console.error(`✗ ${sum}`);
console.error(`  readability ${rd}/30 · navigation ${nv}/30 · mobile ${mb}/25 · hygiene ${hg}/15`);F.slice(0,3).forEach(f=>console.error(`   - ${f}`));process.exit(1);}
