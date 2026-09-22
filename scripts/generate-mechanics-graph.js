#!/usr/bin/env node
// Source: scripts/generate-mechanics-graph.js [plan:2026-09-22_155000-architecture-mechanics.md#phase-2]
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const KINDS = {
  "entry": {"label": "Entry","color": "--blue-600"},
  "state": {"label": "State","color": "--violet-600"},
  "game": {"label": "Game","color": "--amber-700"},
  "shop": {"label": "Shop","color": "--orange-600"},
  "audio": {"label": "Audio","color": "--emerald-700"},
  "visual": {"label": "Visual","color": "--rose-600"}
};

// GROUP_BY_FILE — product-only mapping (first match wins)
// CORE is single source; edit CORE below to change scheme.
const GROUP_BY_FILE = [
  [/^src\/logic\/funnel-machine\.js$/, 'machines'],
  [/^src\/logic\//, 'machines'],
  [/^DESIGN\.md$/, 'entities'],
  [/^tokens\/primitives\.json$/, 'categories'],
  [/^docs\/decisions\//, 'decisions'],
];

// ── CORE per lens ──
const LOGIC_GROUPS_DEF = [
  { id:"machines", label:"Machines", sub:"Funnel · temporal", tint:"--color-card", x:18, y:16, w:108 },
  { id:"states", label:"States", sub:"7 funnel states", tint:"--violet-50", x:162, y:16, w:108 },
  { id:"rules", label:"Rules", sub:"Transient vs temporal", tint:"--amber-50", x:162, y:244, w:124 },
  { id:"temporal", label:"Temporal", sub:"Time · scale", tint:"--stone-100", x:322, y:16, w:118 },
];
const LOGIC_NODES_DEF = [
  { id:"funnelMachine", file:"src/logic/funnel-machine.js", kind:"state", group:"machines", label:"funnelMachine", sub:"funnel-machine.js", desc:"7-state machine + NEXT" },
  { id:"temporal", file:"src/logic/temporal.js", kind:"state", group:"machines", label:"temporal", sub:"temporal.js", desc:"sliceTemporal governs display" },
  { id:"transient", file:"src/logic/transient.js", kind:"state", group:"machines", label:"transient", sub:"transient.js", desc:"filterTransient: now-only" },
  { id:"timeScale", file:"src/logic/time-scale.js", kind:"state", group:"machines", label:"timeScale", sub:"time-scale.js", desc:"getScale / scaled / later" },
  { id:"s-initial", file:"src/logic/funnel-machine.js", kind:"state", group:"states", label:"initial", sub:"funnel state", desc:"Entry state" },
  { id:"s-elastic", file:"src/logic/funnel-machine.js", kind:"state", group:"states", label:"elastic", sub:"funnel state", desc:"Elastic placeholder" },
  { id:"s-top", file:"src/logic/funnel-machine.js", kind:"state", group:"states", label:"top", sub:"funnel state", desc:"Top of funnel" },
  { id:"s-middle", file:"src/logic/funnel-machine.js", kind:"state", group:"states", label:"middle", sub:"funnel state", desc:"Middle" },
  { id:"s-bottom", file:"src/logic/funnel-machine.js", kind:"state", group:"states", label:"bottom", sub:"funnel state", desc:"Bottom" },
  { id:"s-closed", file:"src/logic/funnel-machine.js", kind:"state", group:"states", label:"closed", sub:"funnel state", desc:"Closed" },
  { id:"s-retained", file:"src/logic/funnel-machine.js", kind:"state", group:"states", label:"retained", sub:"funnel state", desc:"Retained" },
  { id:"rule-transient-temporal", file:"src/logic/transient.js", kind:"signal", group:"rules", label:"transientVsTemporal", sub:"rules", desc:"Transient vs temporal split" },
  { id:"rule-app-tab", file:"src/glass/BottomDock.jsx", kind:"signal", group:"rules", label:"appTabBridge", sub:"bridge", desc:"app-tab bridge: dock event drives machine" },
  { id:"rule-morph", file:"src/logic/morph-timing.js", kind:"signal", group:"rules", label:"morphPipeline", sub:"morph", desc:"Whitelisted clip geometry" },
  { id:"rule-next", file:"src/logic/funnel-machine.js", kind:"signal", group:"rules", label:"NEXT chain", sub:"NEXT", desc:"NEXT: initial→elastic→top→middle→bottom→closed→retained" },
];
const LOGIC_EDGES_DEF = [
  { from:"funnelMachine", to:"s-initial", kind:"data", label:"governs" },
  { from:"funnelMachine", to:"s-elastic", kind:"data", label:"governs" },
  { from:"funnelMachine", to:"s-top", kind:"data", label:"governs" },
  { from:"funnelMachine", to:"s-middle", kind:"data", label:"governs" },
  { from:"funnelMachine", to:"s-bottom", kind:"data", label:"governs" },
  { from:"funnelMachine", to:"s-closed", kind:"data", label:"governs" },
  { from:"funnelMachine", to:"s-retained", kind:"data", label:"governs" },
  { from:"s-initial", to:"s-elastic", kind:"signal", label:"NEXT" },
  { from:"s-elastic", to:"s-top", kind:"signal", label:"NEXT" },
  { from:"s-top", to:"s-middle", kind:"signal", label:"NEXT" },
  { from:"s-middle", to:"s-bottom", kind:"signal", label:"NEXT" },
  { from:"s-bottom", to:"s-closed", kind:"signal", label:"NEXT" },
  { from:"s-closed", to:"s-retained", kind:"signal", label:"NEXT" },
  { from:"s-top", to:"temporal", kind:"data", label:"data", access:"both" },
  { from:"s-middle", to:"transient", kind:"data", label:"data", access:"both" },
  { from:"temporal", to:"timeScale", kind:"data", label:"data", access:"both" },
  { from:"rule-transient-temporal", to:"transient", kind:"data", label:"governs" },
  { from:"rule-next", to:"s-top", kind:"signal", label:"NEXT" },
];

const SCHEMA_GROUPS_DEF = [
  { id:"entities", label:"Entities", sub:"Opportunity · Goal", tint:"--color-card", x:18, y:130, w:108 },
  { id:"fields", label:"Fields", sub:"Value · status · glyph", tint:"--violet-50", x:162, y:16, w:108 },
  { id:"categories", label:"Categories", sub:"Sapphire · Citrine", tint:"--amber-50", x:162, y:244, w:124 },
  { id:"flows", label:"Flows", sub:"Operate vs Monitor", tint:"--stone-100", x:322, y:16, w:108 },
];
const SCHEMA_NODES_DEF = [
  { id:"ent-opportunity", file:"DESIGN.md", kind:"state", group:"entities", label:"Opportunity", sub:"entity", desc:"Core deal shape — value, chance, status" },
  { id:"ent-prospect", file:"DESIGN.md", kind:"state", group:"entities", label:"Prospect", sub:"entity", desc:"Prospect linked to opportunity" },
  { id:"ent-goal", file:"DESIGN.md", kind:"state", group:"entities", label:"Goal", sub:"entity", desc:"Goal bar — gem progress" },
  { id:"ent-funnel", file:"src/logic/funnel-machine.js", kind:"state", group:"entities", label:"Funnel", sub:"entity", desc:"Funnel entity — 7-state progression" },
  { id:"ent-gem", file:"DESIGN.md", kind:"state", group:"entities", label:"GemReward", sub:"entity", desc:"Gem reward — ceremony not chrome" },
  { id:"fld-value", file:"DESIGN.md", kind:"visual", group:"fields", label:"value-amount", sub:"field", desc:"Value field — sapphire-anchored amount" },
  { id:"fld-chance", file:"DESIGN.md", kind:"visual", group:"fields", label:"chance-value", sub:"field", desc:"Chance field — red-beryl risk" },
  { id:"fld-status", file:"DESIGN.md", kind:"visual", group:"fields", label:"status-pill", sub:"field", desc:"Status pill — accepted/progress/new" },
  { id:"fld-glyph", file:"DESIGN.md", kind:"visual", group:"fields", label:"funnel-glyph", sub:"field", desc:"Funnel glyph — sapphire body" },
  { id:"fld-card", file:"DESIGN.md", kind:"visual", group:"fields", label:"funnel-card", sub:"field", desc:"Funnel card — stage container" },
  { id:"fld-goalbar", file:"DESIGN.md", kind:"visual", group:"fields", label:"goal-bar", sub:"field", desc:"Goal bar — amethyst fill" },
  { id:"cat-sapphire", file:"tokens/primitives.json", kind:"shop", group:"categories", label:"Sapphire", sub:"gem", desc:"Sapphire — sole action hue / gamification" },
  { id:"cat-citrine", file:"tokens/primitives.json", kind:"shop", group:"categories", label:"Citrine", sub:"gem", desc:"Citrine — warning/caution gem" },
  { id:"cat-redberyl", file:"tokens/primitives.json", kind:"shop", group:"categories", label:"RedBeryl", sub:"gem", desc:"Red Beryl — error/critical gem" },
  { id:"cat-amethyst", file:"tokens/primitives.json", kind:"shop", group:"categories", label:"Amethyst", sub:"gem", desc:"Amethyst — goal-bar fill gem" },
  { id:"cat-amber", file:"tokens/primitives.json", kind:"shop", group:"categories", label:"signal-amber", sub:"signal", desc:"Signal amber — citrine signal variant" },
  { id:"cat-teal", file:"tokens/primitives.json", kind:"shop", group:"categories", label:"signal-teal", sub:"signal", desc:"Signal teal — green signal variant" },
  { id:"flow-operate", file:"src/patterns/OperateScreen", kind:"entry", group:"flows", label:"Operate", sub:"flow", desc:"Operate surface — opportunities, prospects, actions" },
  { id:"flow-monitor", file:"src/patterns/MonitorScreen", kind:"entry", group:"flows", label:"Monitor", sub:"flow", desc:"Monitor surface — funnel, reports, goals" },
];
const SCHEMA_EDGES_DEF = [
  { from:"ent-opportunity", to:"fld-value", kind:"call", label:"contains" },
  { from:"ent-opportunity", to:"fld-chance", kind:"call", label:"contains" },
  { from:"ent-opportunity", to:"fld-status", kind:"call", label:"contains" },
  { from:"ent-funnel", to:"fld-glyph", kind:"call", label:"contains" },
  { from:"ent-funnel", to:"fld-card", kind:"call", label:"contains" },
  { from:"ent-goal", to:"fld-goalbar", kind:"call", label:"contains" },
  { from:"ent-prospect", to:"fld-status", kind:"call", label:"contains" },
  { from:"ent-gem", to:"fld-goalbar", kind:"call", label:"contains" },
  { from:"ent-funnel", to:"fld-glyph", kind:"data", label:"governs" },
  { from:"ent-funnel", to:"fld-card", kind:"data", label:"governs" },
  { from:"cat-sapphire", to:"fld-goalbar", kind:"signal", label:"fills" },
  { from:"cat-amethyst", to:"fld-goalbar", kind:"signal", label:"fills" },
  { from:"cat-citrine", to:"fld-value", kind:"signal", label:"fills" },
  { from:"flow-operate", to:"ent-opportunity", kind:"data", label:"operate" },
  { from:"flow-monitor", to:"ent-funnel", kind:"data", label:"monitor" },
  { from:"flow-monitor", to:"ent-goal", kind:"data", label:"monitor" },
];

const DECISIONS_GROUPS_DEF = [
  { id:"product", label:"Product", sub:"Operate · funnel · gems", tint:"--color-card", x:18, y:16, w:108 },
  { id:"system", label:"System", sub:"Tokens · swap-slot", tint:"--violet-50", x:162, y:16, w:108 },
  { id:"architecture", label:"Architecture", sub:"Shell · device · OS", tint:"--amber-50", x:162, y:244, w:124 },
  { id:"constraints", label:"Constraints", sub:"Decisions", tint:"--stone-100", x:322, y:16, w:108 },
];
const DECISIONS_NODES_DEF = [
  { id:"dec-001-shell-split", file:"docs/decisions/001-layer-map.md", kind:"entry", group:"architecture", label:"001 shell split", sub:"decision", desc:"Split by layer ownership" },
  { id:"dec-002-os-extract", file:"docs/decisions/002-os-extraction.md", kind:"entry", group:"architecture", label:"002 OS extraction", sub:"decision", desc:"Verbatim moves proven by rule-diff" },
  { id:"dec-003-index-budget", file:"docs/decisions/003-index-budget.md", kind:"entry", group:"architecture", label:"003 index budget", sub:"decision", desc:"Device mounts-only budget 70→3 lines" },
  { id:"dec-004-dead-appbar", file:"docs/decisions/004-dead-appbar.md", kind:"entry", group:"system", label:"004 dead appbar", sub:"decision", desc:"Delete dead DeviceAppBar + single clock owner" },
  { id:"dec-005-glass-budget", file:"docs/decisions/005-glass-budget.md", kind:"entry", group:"system", label:"005 glass budget", sub:"decision", desc:"Split by concern: optics / rect-zoom / bands" },
  { id:"dec-006-atlas-presentation", file:"docs/decisions/006-atlas-presentation.md", kind:"entry", group:"architecture", label:"006 atlas presentation", sub:"decision", desc:"SVG deterministic layout over canvas blur" },
  { id:"dec-007-mechanics-budget", file:"docs/decisions/007-mechanics-budget.md", kind:"entry", group:"constraints", label:"007 mechanics budget", sub:"decision", desc:"Waive 100-line for render.js verbatim" },
  { id:"dec-sapphire-sole-hue", file:"DESIGN.md", kind:"entry", group:"product", label:"Sapphire sole hue", sub:"decision", desc:"Sapphire sole action hue — never decorative" },
  { id:"dec-operate-monitor-split", file:"docs/decisions/001-layer-map.md", kind:"entry", group:"product", label:"Operate vs Monitor", sub:"decision", desc:"Two surfaces never mixed" },
  { id:"dec-transient-vs-temporal", file:"src/logic/transient.js", kind:"state", group:"system", label:"transient vs temporal", sub:"decision", desc:"Now-only vs display window" },
  { id:"dec-signal-swap-slot", file:"tokens/primitives.json", kind:"state", group:"system", label:"signal swap-slot", sub:"decision", desc:"Tokens swap-slot primitives 50–900 via --signal" },
  { id:"dec-gems-ceremony", file:"DESIGN.md", kind:"entry", group:"product", label:"gems ceremony", sub:"decision", desc:"Gems ceremony not chrome — reward fills only" },
  { id:"dec-light-first-type", file:"ARCHITECTURE.md", kind:"entry", group:"constraints", label:"light-first type", sub:"decision", desc:"Light-first Inter hierarchy 400–700" },
];
const DECISIONS_EDGES_DEF = [
  { from:"dec-001-shell-split", to:"dec-002-os-extract", kind:"call", label:"contains" },
  { from:"dec-001-shell-split", to:"dec-003-index-budget", kind:"call", label:"contains" },
  { from:"dec-005-glass-budget", to:"dec-004-dead-appbar", kind:"call", label:"contains" },
  { from:"dec-sapphire-sole-hue", to:"dec-signal-swap-slot", kind:"data", label:"governs" },
  { from:"dec-sapphire-sole-hue", to:"dec-gems-ceremony", kind:"data", label:"governs" },
  { from:"dec-operate-monitor-split", to:"dec-001-shell-split", kind:"data", label:"governs" },
  { from:"dec-transient-vs-temporal", to:"dec-light-first-type", kind:"data", label:"governs" },
  { from:"dec-signal-swap-slot", to:"dec-sapphire-sole-hue", kind:"data", label:"governs" },
  { from:"dec-gems-ceremony", to:"dec-light-first-type", kind:"data", label:"governs" },
  { from:"dec-006-atlas-presentation", to:"dec-007-mechanics-budget", kind:"call", label:"contains" },
  { from:"dec-007-mechanics-budget", to:"dec-sapphire-sole-hue", kind:"data", label:"governs" },
];

// ── layout: COLS 2-row grid formula ──
function layout(groupsDef, nodesDef){
  const groups = groupsDef.map(g=>({ ...g }));
  const nodes = nodesDef.map(n=>({ ...n }));
  const byGroup = {};
  for(const g of groups) byGroup[g.id]=[];
  for(const n of nodes) (byGroup[n.group]??(byGroup[n.group]=[])).push(n);
  for(const g of groups){
    const list = byGroup[g.id]||[];
    const count = list.length;
    g.h = 32+4*2 + count*18 + Math.max(0,count-1)*3;
    list.forEach((n,idx)=>{
      n.w = g.w-6;
      n.h = 18;
      n.x = g.x+3;
      n.y = g.y+32+4+idx*21;
    });
  }
  return { groups, nodes };
}

const LOGIC = layout(LOGIC_GROUPS_DEF, LOGIC_NODES_DEF);
const SCHEMA = layout(SCHEMA_GROUPS_DEF, SCHEMA_NODES_DEF);
const DECISIONS = layout(DECISIONS_GROUPS_DEF, DECISIONS_NODES_DEF);

// ── merge graphData.manual.json ──
let manual = {};
try { manual = JSON.parse(fs.readFileSync(join(root,'scripts/graphData.manual.json'),'utf8')); } catch {}
function applyManual(nodes, groups){
  for(const [id,patch] of Object.entries(manual)){
    const n = nodes.find(x=>x.id===id);
    if(n) Object.assign(n,patch);
    else {
      const g = groups[0];
      const count = nodes.filter(x=>x.group===g.id).length;
      const y = g.y+32+4+count*21;
      nodes.push({ id, file:patch.file||'manual', kind:patch.kind||'entry', group:g.id, label:patch.label||id, sub:patch.sub||'manual', desc:patch.desc||'', w:g.w-6, h:18, x:g.x+3, y });
      g.h = 32+4*2 + (count+1)*18 + count*3;
    }
  }
}
applyManual(LOGIC.nodes, LOGIC.groups);
applyManual(SCHEMA.nodes, SCHEMA.groups);
applyManual(DECISIONS.nodes, DECISIONS.groups);

// ── staleness: sources mtimes same as atlas.json ──
function mtimeOf(rel){
  try { return Math.floor(fs.statSync(join(root, rel)).mtimeMs); } catch { return 0; }
}
const allNodesForSources = [...LOGIC.nodes, ...SCHEMA.nodes, ...DECISIONS.nodes];
let prevMeta = null;
try {
  const prevRaw = fs.readFileSync(join(root,'src/js/mechanics/graphData.js'),'utf8');
  const m = prevRaw.match(/export const META = (.*?);\n/);
  if(m) prevMeta = JSON.parse(m[1]);
} catch {}
const meta = { generatedAt: new Date().toISOString(), sources: {} };
for(const n of allNodesForSources){
  if(n.file) meta.sources[n.file] = mtimeOf(n.file);
}
function attachStale(nodes){
  const threshold = prevMeta ? Date.parse(prevMeta.generatedAt) : Date.parse(meta.generatedAt);
  return nodes.map(n => ({ ...n, stale: (meta.sources[n.file]||0) > threshold }));
}
const LOGIC_NODES_STALE = attachStale(LOGIC.nodes);
const SCHEMA_NODES_STALE = attachStale(SCHEMA.nodes);
const DECISIONS_NODES_STALE = attachStale(DECISIONS.nodes);

function render(GROUPS,NODES,EDGES){
  const header = '// @generated — do not edit. Source: scripts/generate-mechanics-graph.js [plan:2026-09-22_155000-architecture-mechanics.md#phase-2]';
  return `${header}\nexport const GROUPS = ${JSON.stringify(GROUPS)};\nexport const NODES = ${JSON.stringify(NODES)};\nexport const EDGES = ${JSON.stringify(EDGES)};\nexport const KINDS = ${JSON.stringify(KINDS)};\nexport const META = ${JSON.stringify(meta)};\n`;
}

const outputs = [
  [join(root,'src/js/mechanics/graphData.js'), render(LOGIC.groups, LOGIC_NODES_STALE, LOGIC_EDGES_DEF)],
  [join(root,'src/js/mechanics/graphData.logic.js'), render(LOGIC.groups, LOGIC_NODES_STALE, LOGIC_EDGES_DEF)],
  [join(root,'src/js/mechanics/graphData.schema.js'), render(SCHEMA.groups, SCHEMA_NODES_STALE, SCHEMA_EDGES_DEF)],
  [join(root,'src/js/mechanics/graphData.decisions.js'), render(DECISIONS.groups, DECISIONS_NODES_STALE, DECISIONS_EDGES_DEF)],
];

function parseExport(content, name){
  const re = new RegExp(`export const ${name} = (.*?);\n`);
  const m = content.match(re);
  if(!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

if(check){
  let hasError=false;
  for(const [path, expected] of outputs){
    let current='';
    try{ current=fs.readFileSync(path,'utf8'); } catch{ current=''; }
    if(!current){
      console.error(`✗ verify:mechanics — missing: ${path.replace(root+'/','')} — run \`npm run gen:mechanics\``);
      hasError=true;
      continue;
    }
    // drift check: compare GROUPS/NODES/EDGES ignoring META timestamp/sources drift (normalize)
    const expGroups = parseExport(expected,'GROUPS');
    const expNodes = parseExport(expected,'NODES');
    const expEdges = parseExport(expected,'EDGES');
    const curGroups = parseExport(current,'GROUPS');
    const curNodes = parseExport(current,'NODES');
    const curEdges = parseExport(current,'EDGES');
    const curMeta = parseExport(current,'META');
    // normalize nodes: compare without stale? stale depends on timing, so compare shape without stale for drift
    const stripStale = arr => (arr||[]).map(({stale,...rest})=>rest);
    if(JSON.stringify(curGroups) !== JSON.stringify(expGroups) ||
       JSON.stringify(stripStale(curNodes)) !== JSON.stringify(stripStale(expNodes)) ||
       JSON.stringify(curEdges) !== JSON.stringify(expEdges)){
      console.error(`✗ verify:mechanics — drift: ${path.replace(root+'/','')} — run \`npm run gen:mechanics\``);
      hasError=true;
    }
    // staleness check: sources mtimes vs stored meta.sources (same as atlas.json)
    if(curMeta && curMeta.sources){
      for(const [rel, stored] of Object.entries(curMeta.sources)){
        const curMtime = mtimeOf(rel);
        if(curMtime !== stored){
          console.error(`✗ verify:mechanics — stale: ${rel} changed since manifest; run \`npm run gen:mechanics\``);
          hasError=true;
          break;
        }
      }
    } else {
      console.error(`✗ verify:mechanics — stale: missing META in ${path.replace(root+'/','')}`);
      hasError=true;
    }
  }
  // ensure no stale ia/components/truth files linger
  for(const staleFile of ['src/js/mechanics/graphData.components.js','src/js/mechanics/graphData.ia.js','src/js/mechanics/graphData.truth.js']){
    if(fs.existsSync(join(root,staleFile))){
      console.error(`✗ verify:mechanics — unexpected file: ${staleFile} — presentation graphs are out of scope`);
      hasError=true;
    }
  }
  if(hasError) process.exit(1);
  console.log('✓ verify:mechanics — graph fresh');
} else {
  for(const [path,content] of outputs){
    fs.mkdirSync(dirname(path),{recursive:true});
    const prev = fs.existsSync(path) ? fs.readFileSync(path,'utf8') : null;
    if(prev !== content) fs.writeFileSync(path, content);
  }
  // clean presentation-only graphs if present
  for(const staleFile of ['src/js/mechanics/graphData.components.js','src/js/mechanics/graphData.ia.js','src/js/mechanics/graphData.truth.js']){
    const p = join(root,staleFile);
    if(fs.existsSync(p)) fs.unlinkSync(p);
  }
  console.log(`✓ gen:mechanics — ${LOGIC_NODES_STALE.length}/${SCHEMA_NODES_STALE.length}/${DECISIONS_NODES_STALE.length} nodes · ${LOGIC.groups.length} groups each`);
}
