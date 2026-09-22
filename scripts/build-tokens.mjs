import fs from 'fs'; import {fileURLToPath} from 'url'; import {dirname,join} from 'path';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const j=p=>JSON.parse(fs.readFileSync(join(root,p),'utf8'));
const p=j('tokens/primitives.json'), L=j('tokens/semantic-light.json'), D=j('tokens/semantic-dark.json'); let motion=null; try{motion=j('tokens/motion.json')}catch{}
let compat=null; try{compat=j('tokens/mechanics-compat.json')}catch{}
const g=(pre,obj)=>Object.entries(obj).map(([k,v])=>`--${pre}-${k}:${v};`).join(' ');
const ag=p['aliases-gray'], as=p['aliases-sapphire'], agm=p['aliases-gem'];
const font=`--font-family-sans:${p.font['family-sans']}; `+g('font-size',{xs:p.font.xs,sm:p.font.sm,md:p.font.md,lg:p.font.lg,xl:p.font.xl,'2xl':p.font['2xl'],'3xl':p.font['3xl']})+' '+g('font-weight',{regular:p.font.regular,medium:p.font.medium,semibold:p.font.semibold,bold:p.font.bold})+' '+g('font-leading',{tight:p.font['leading-tight'],snug:p.font['leading-snug'],normal:p.font['leading-normal'],relaxed:p.font['leading-relaxed']})+' '+g('font-tracking',{tight:p.font['tracking-tight'],normal:p.font['tracking-normal'],wide:p.font['tracking-wide']});
let out=`/* GENERATED — do not hand-edit. Source: tokens/*.json. Regenerate: npm run build. */\n:root{\n`;
out+=` ${font}\n`;
if(p.type) out+=` ${g('type',p.type)}\n`;
out+=` ${g('spacing',p.spacing)}\n`;
out+=` ${g('radius',p.radius)}\n`;
out+=` ${g('border-width',p.borderWidth)}\n`;
out+=` ${g('z-index',p.zIndex)}\n`;
out+=` ${g('icon-size',p.iconSize)}\n`;
out+=` ${g('opacity',p.opacity)}\n`;
out+=` ${g('transition',p.transition)}\n`;
out+=` ${g('shadow',p.shadow)}\n`;
out+=` ${g('glass',p.glass)}\n`;
if(motion){ out+=` ${g('motion-duration',motion.duration)}\n`; out+=` ${g('motion-easing',motion.easing)}\n`; out+=` ${g('motion-spring',motion.spring)}\n`; out+=` ${g('motion-translate',motion.translate)}\n`; }
out+=` ${g('primitive-neutral-light',p['neutral-light'])} ${g('primitive-neutral-dark',p['neutral-dark'])}\n`;
out+=` --primitive-gray-white:${ag.white}; ${Object.entries({50:ag['50'],100:ag['100'],200:ag['200'],300:ag['300'],550:ag['550'],700:ag['700'],800:ag['800'],900:ag['900']}).map(([k,v])=>`--primitive-gray-${k}:${v};`).join(' ')} --primitive-gray-black:${ag.black};\n`;
out+=` ${g('primitive-sapphire-ui',p['sapphire-ui'])} ${g('primitive-sapphire-gamification',p['sapphire-gamification'])}\n`;
out+=` ${Object.entries(as).map(([k,v])=>`--primitive-sapphire-${k}:${v};`).join(' ')}\n`;
out+=` ${g('primitive-citrine',p.citrine)} ${g('primitive-red-beryl',p['red-beryl'])} ${g('primitive-amethyst',p.amethyst)}\n`;
out+=` ${g('primitive-orange',p.orange)} ${g('primitive-red',p.red)} ${g('primitive-green',p.green)}\n`;
out+=` ${Object.entries(agm).filter(([k,v])=>v!==`var(--primitive-${k})`).map(([k,v])=>`--primitive-${k}:${v};`).join(' ')} --primitive-ink:${p.ink}; --primitive-dim:${p.dim}; --signal:${p.signal.default}; --signal-amber:${p.signal.amber}; --signal-teal:${p.signal.teal};\n`;
const cleanCompat=s=>s.split(';').filter(x=>{const m=x.match(/--([\w-]+):(.+)/);return !m||m[2].trim()!=='var(--'+m[1]+')'}).join(';');
if(compat){
  const emit=(pre,obj)=>Object.entries(obj).map(([k,v])=>`--${pre}-${k}:${v};`).join(' ');
  const flat=[];
  // stone / violet / amber / emerald / rose / orange / blue are palette aliases
  for(const cat of ['stone','violet','amber','emerald','rose','orange','blue']){
    if(compat[cat]) flat.push(emit(cat, compat[cat]));
  }
  // semantic already contains --color-bg etc but stored without leading --
  if(compat.semantic) flat.push(Object.entries(compat.semantic).map(([k,v])=>`--${k}:${v};`).join(' '));
  if(compat.spacingAliases) flat.push(Object.entries(compat.spacingAliases).map(([k,v])=>`--${k}:${v};`).join(' '));
  if(compat.z) flat.push(Object.entries(compat.z).map(([k,v])=>`--${k}:${v};`).join(' '));
  if(compat.size) flat.push(Object.entries(compat.size).map(([k,v])=>`--${k}:${v};`).join(' '));
  if(compat.typeAliases) flat.push(Object.entries(compat.typeAliases).map(([k,v])=>`--${k}:${v};`).join(' '));
  if(flat.length) out+=` /* mechanics compat — aliases to ALPHA primitives [plan:2026-09-22_155000-architecture-mechanics.md#phase-1] */\n ${cleanCompat(flat.join(' '))}\n`;
}
out+=`}\n`;
const sEmit=(obj)=>{let s=` --bg-primary:${obj.bg.primary}; --bg-surface:${obj.bg.surface}; --bg-surface-glass:${obj.bg['surface-glass']}; --bg-surface-glass-active:${obj.bg['surface-glass-active']}; --bg-surface-elevated:${obj.bg['surface-elevated']}; --bg-interactive:${obj.bg.interactive}; --bg-interactive-hover:${obj.bg['interactive-hover']}; --bg-interactive-active:${obj.bg['interactive-active']}; --border-thin:${obj.border.thin}; --border-medium:${obj.border.medium}; --border-thick:${obj.border.thick}; --border-accent:${obj.border.accent}; --text-primary:${obj.text.primary}; --text-secondary:${obj.text.secondary}; --text-muted:${obj.text.muted}; --text-dim:${obj.text.dim}; --text-accent:${obj.text.accent}; --color-accent-brand:${obj.accent.brand}; --color-accent-success:${obj.accent.success}; --color-accent-warning:${obj.accent.warning}; --color-accent-error:${obj.accent.error}; --shadow-sm:${obj.shadow.sm}; --shadow-md:${obj.shadow.md}; --shadow-lg:${obj.shadow.lg};${obj.shadow.mark?` --shadow-mark:${obj.shadow.mark};`:''} --achievement-card-bg:${obj.achievement['card-bg']}; --achievement-overlay-bg:${obj.achievement['overlay-bg']}; --focus-ring:${obj.focus.ring}; --focus-ring-offset:${obj.focus['ring-offset']}; --border-width-hairline:${obj.borderWidth.hairline}; --border-width-thin:${obj.borderWidth.thin};`; s+=obj.role?` --role-action:${obj.role['action']}; --role-action-soft:${obj.role['action-soft']}; --role-action-ink:${obj.role['action-ink']}; --role-measure:${obj.role['measure']}; --role-measure-soft:${obj.role['measure-soft']}; --role-measure-strong:${obj.role['measure-strong']}; --role-score:${obj.role['score']}; --role-warn:${obj.role['warn']}; --role-mark:${obj.role['mark']}; --role-mark-soft:${obj.role['mark-soft']}; --role-mark-strong:${obj.role['mark-strong']}; --role-action-strong:${obj.role['action-strong']}; --role-score-soft:${obj.role['score-soft']}; --role-score-strong:${obj.role['score-strong']}; --role-warn-soft:${obj.role['warn-soft']}; --role-warn-strong:${obj.role['warn-strong']};`:''; s+=obj.type?` --type-title:${obj.type.title}; --type-card:${obj.type.card}; --type-body:${obj.type.body}; --type-meta:${obj.type.meta}; --type-micro:${obj.type.micro};`:''; return s+` `;};
out+=`:root,[data-theme="light"]{color-scheme:light;${sEmit(L)}}\n`;
out+=`[data-theme="dark"]{color-scheme:dark;${sEmit(D)}}\n`;
out+=`@media (forced-colors:active){ :root{ --border-thin:CanvasText; --text-primary:CanvasText; } }\n`;
const target=join(root,'design-system/tokens.css');
fs.writeFileSync(target,out); console.log(`✓ build-tokens — ${out.split('\n').length} lines → design-system/tokens.css`);
