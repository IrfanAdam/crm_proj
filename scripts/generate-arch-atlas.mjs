/* ADAM/TOOL — scripts/generate-arch-atlas.mjs · essence manifest [plan:2026-09-22_082844-arch-atlas.md#phase-1] */
// — Exports: buildAtlas() + CLI (write | --check) —
import fs from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const manual = JSON.parse(fs.readFileSync(join(root, 'scripts/arch-atlas.manual.json'), 'utf8'));
const TOK = { 'opp-card': 'OpportunityCard', avatar: 'Avatar', chip: 'Chip', kpi: 'KpiStat', tabbar: 'TabBar', funnel: 'FunnelCard', 'goal-bar': 'GoalBar', gem: 'GemReward', timeline: 'Timeline', sparkline: 'Sparkline' };
const pretty = (s) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export function buildAtlas(res) {
  const level = res || manual.resolution || 'L1';
  const mtimeOf = (rel) => { try { return Math.floor(fs.statSync(join(root, rel)).mtimeMs); } catch { return 0; } };
  const sources = {};
  const stamp = (rel) => { sources[rel] = mtimeOf(rel); return rel; };
  const nodes = [], edges = [];
  const addN = (id, lens, title, source, detail) => nodes.push({ id, lens, title, source: stamp(source), detail: detail || '' });
  const addE = (from, to, kind, label) => edges.push({ from, to, kind, label: label || kind });
  for (const f of fs.readdirSync(join(root, 'src/logic')).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(join(root, 'src/logic', f), 'utf8');
    const ex = [...src.matchAll(/^export (?:const|function|class) (\w+)/gm)].map((m) => m[1]);
    addN('logic:' + basename(f, '.js'), 'logic', pretty(basename(f, '.js')), 'src/logic/' + f, ex.slice(0, 6).join(', '));
  }
  const compDirs = fs.readdirSync(join(root, 'src/components')).filter((d) => fs.existsSync(join(root, 'src/components', d, basename(d).toLowerCase() + '.css')) || fs.readdirSync(join(root, 'src/components', d)).some((f) => f.endsWith('.css')));
  const patSrc = ['OppsHome/opps-home.js', 'OperateScreen/operate-screen.js', 'MonitorScreen/monitor-screen.js', 'ReportsMatrix/reports-matrix.js'].map((p) => { try { return fs.readFileSync(join(root, 'src/patterns', p), 'utf8'); } catch { return ''; } }).join('\n');
  for (const d of compDirs.sort()) {
    const uses = patSrc.split('\n').filter((l) => l.includes(d.toLowerCase()) || l.includes(d.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase())).length;
    addN('component:' + d, 'components', d, 'src/components/' + d, uses + ' referencing lines in patterns');
  }
  addN('app', 'ia', 'ALPHA App', 'index.html', 'shell frame: header, game-layout, footer');
  for (const t of ['Home', 'Leads', 'Opps']) addN('tab:' + t, 'ia', t + ' Tab', 'src/glass/BottomDock.jsx', 'dock tab; bridges via app-tab event');
  for (const d of fs.readdirSync(join(root, 'src/patterns')).filter((d) => !d.startsWith('.'))) addN('screen:' + d, 'ia', pretty(d), 'src/patterns/' + d, 'pattern screen; mount(page) branch');
  for (const t of ['Home', 'Leads', 'Opps']) { addE('app', 'tab:' + t, 'contains'); addE('tab:' + t, 'screen:OppsHome', 'contains', t === 'Opps' ? 'full screen' : 'empty placeholder'); }
  const gov = manual.overrides?.opportunity;
  if (gov) addE('logic:funnel-machine', 'screen:OppsHome', 'governs', gov.note || 'governs');
  const fm = nodes.find((n) => n.id === 'logic:funnel-machine');
  if (fm) {
    const src = fs.readFileSync(join(root, 'src/logic/funnel-machine.js'), 'utf8');
    const want = ['initial', 'elastic', 'top', 'middle', 'bottom', 'closed', 'retained'];
    fm.states = want.filter((s) => src.includes(`'${s}'`));
    fm.detail = `${fm.states.length} states: ${fm.states.join('→')} · transient vs temporal · app-tab bridge · src/logic/funnel-machine.js:1`;
  }
  if (nodes.some((n) => n.id === 'component:OpportunityCard')) addE('logic:funnel-machine', 'component:OpportunityCard', 'governs', 'funnel states drive card status');
  const seen = new Set();
  for (const [tok, comp] of Object.entries(TOK)) {
    if (patSrc.includes(tok) && compDirs.includes(comp) && !seen.has(comp)) { seen.add(comp); addE('screen:OppsHome', 'component:' + comp, 'composes'); }
  }
  nodes.sort((a, b) => a.id.localeCompare(b.id)); edges.sort((a, b) => (a.from + a.to).localeCompare(b.from + b.to));
  if (level !== 'L1') {
    const contract = { logic: 'contract: pure; reads state; writes via onChange', components: 'contract: reads tokens; writes DOM; no app state', ia: 'contract: reads mount(page); events in/out over app-tab' };
    for (const n of nodes) {
      n.detail += ` · ${contract[n.lens]}`;
      if (level === 'L3') n.detail += ` · impl: ${n.source}:1`;
    }
  }
  return { meta: { generatedAt: new Date().toISOString(), resolution: level, lenses: manual.lenses, sources }, nodes, edges };
}
const isCLI = (process.argv[1] || '').endsWith('generate-arch-atlas.mjs');
const atlas = isCLI ? buildAtlas() : null;
const out = join(root, 'src/arch/atlas.json');
if (!isCLI) {} else if (check) {
  const prev = JSON.parse(fs.readFileSync(out, 'utf8'));
  const norm = (a) => JSON.stringify({ ...a, meta: { ...a.meta, generatedAt: 'x', sources: 'x' } });
  if (norm(prev) !== norm(atlas)) { console.error('✗ verify:atlas — drift: run `npm run gen:atlas`'); process.exit(1); }
  const stale = Object.entries(prev.meta.sources || {}).filter(([rel, t]) => { try { return Math.floor(fs.statSync(join(root, rel)).mtimeMs) !== t; } catch { return true; } }).map(([rel]) => rel);
  if (stale.length) { console.error(`✗ verify:atlas — stale: ${stale.join(', ')} changed since manifest; run \`npm run gen:atlas\``); process.exit(1); }
  console.log('✓ verify:atlas — manifest fresh');
} else {
  fs.mkdirSync(join(root, 'src/arch'), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(atlas, null, 2));
  console.log(`✓ gen:atlas — ${atlas.nodes.length} nodes · ${atlas.edges.length} edges`);
}
