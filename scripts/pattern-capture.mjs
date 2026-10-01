/* ADAM/TOOL — scripts/pattern-capture.mjs · scan UI paths, audit tokens, update pattern catalog */
// Export map: collectFiles · extractSignals · loadCatalog · updateCatalog · parseArgs · main
// — Section: imports —
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// — Section: paths —
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = join(root, '.hermes', 'patterns', 'catalog.json');
// — Section: collect —
function collectFiles(targets) {
  const out = [];
  for (const t of targets) {
    const p = join(root, t);
    let stat = null;
    try { stat = fs.statSync(p); } catch { continue; }
    if (stat.isFile()) { out.push(p); continue; }
    let entries = [];
    try { entries = fs.readdirSync(p, { recursive: true }); } catch { continue; }
    for (const f of entries) {
      const fp = join(p, f);
      if (/\.(js|jsx|css|html)$/.test(fp)) { out.push(fp); }
    }
  }
  return out;
}
// — Section: signals —
function extractSignals(files) {
  const components = new Set();
  const tokens = new Set();
  const hex = new Set();
  const interactions = new Set();
  for (const f of files) {
    let text = '';
    try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
    for (const m of text.matchAll(/components\/([A-Za-z]+)/g)) { components.add(m[1]); }
    for (const m of text.matchAll(/var\(--([a-z0-9-]+)\)/g)) { tokens.add(m[1]); }
    for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) { hex.add(m[0]); }
    for (const m of text.matchAll(/on[A-Z][A-Za-z]+/g)) { interactions.add(m[0]); }
  }
  return { components, tokens, hex, interactions };
}
// — Section: catalog —
function loadCatalog() {
  try { return JSON.parse(fs.readFileSync(catalogPath, 'utf8')); } catch { return { version: 1, patterns: {} }; }
}
function updateCatalog(name, signals, location) {
  const catalog = loadCatalog();
  const prev = catalog.patterns[name] || {};
  catalog.patterns[name] = {
    status: 'captured',
    location: location || prev.location || '',
    components: [...signals.components],
    tokens: [...signals.tokens],
    hexLeaks: [...signals.hex],
    interactions: [...signals.interactions].slice(0, 40),
    docs: prev.docs || { intro: null, lab: null, spec: null },
    updated: new Date().toISOString(),
  };
  fs.mkdirSync(dirname(catalogPath), { recursive: true });
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  return catalog.patterns[name];
}
// — Section: cli —
function parseArgs(argv) {
  const out = { pattern: null, location: '', targets: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pattern') { out.pattern = argv[i + 1]; i++; }
    else if (a === '--location') { out.location = argv[i + 1]; i++; }
    else { out.targets.push(a); }
  }
  return out;
}
function main(argv) {
  const args = parseArgs(argv);
  if (!args.pattern || args.targets.length === 0) {
    console.log('usage: pattern-capture.mjs --pattern <name> [--location <tab>] <paths...>');
    process.exit(1);
  }
  const files = collectFiles(args.targets);
  const signals = extractSignals(files);
  const entry = updateCatalog(args.pattern, signals, args.location);
  console.log(`✓ pattern-capture — ${args.pattern} · ${files.length} files · ${entry.components.length} components · ${entry.tokens.length} tokens · ${entry.hexLeaks.length} hex leaks`);
}
main(process.argv.slice(2));
