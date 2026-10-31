import { resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, statSync, existsSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveHead, applyDueEdit } from './src/pitch/changelog/due-core.js';
function rawSourceRefsPlugin(){
  // The DS gallery and the preview load their scripts as classic <script src="src/…">, which Vite leaves
  // untouched in the build (only module scripts and stylesheets get rewritten). Without the files themselves
  // in dist/ every one of those scripts 404s in a deployment — dead sidebar, no panels. Copy what the built
  // HTML still points at, verbatim, at the same relative path.
  const walk=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap((e)=>e.isDirectory()?walk(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
  return {
    name:'raw-source-refs',
    apply:'build',
    closeBundle(){
      const dist=resolve(__dirname,'dist');
      const refs=new Set();
      for(const file of walk(dist).filter((f)=>f.endsWith('.html'))){
        for(const m of readFileSync(file,'utf8').matchAll(/(?:src|href)="(?:\.\/)?(src\/[^"]+)"/g)) refs.add(m[1]);
      }
      for(const ref of refs){
        if(!statSync(ref,{throwIfNoEntry:false})) continue;
        const dest=`${dist}/${ref}`;
        mkdirSync(dirname(dest),{recursive:true});
        copyFileSync(ref,dest);
      }
      if(refs.size) console.log(`raw-source-refs — copied ${refs.size} raw source files into dist/`);
    },
  };
}
function mechanicsGraphPlugin(){
  let timer=null; let busy=false; let queued=false;
  function run(){
    if(busy){ queued=true; return; }
    busy=true;
    const p=spawn('node',['scripts/generate-mechanics-graph.js'],{stdio:'inherit'});
    p.on('close',()=>{ busy=false; if(queued){ queued=false; run(); } });
  }
  return {
    name:'mechanics-graph',
    buildStart(){
      return new Promise((res)=>{
        const p=spawn('node',['scripts/generate-mechanics-graph.js'],{stdio:'inherit'});
        p.on('close',res);
      });
    },
    configureServer(server){
      const schedule=()=>{ if(timer) clearTimeout(timer); timer=setTimeout(run,150); };
      const onChange=(f)=>{ if(f.startsWith('src/') && !f.includes('/mechanics/')) schedule(); };
      server.watcher.on('change',onChange);
      server.watcher.on('add',onChange);
      server.watcher.on('unlink',onChange);
    }
  };
}
function dsDueWriter(){
  // Dev/preview-only plan Due writer. POST /__ds/due {file, head, due} edits the
  // live section body in the plan file (filenames locked, no paths/traversal).
  // Static builds have no writer — the client keeps a localStorage override layer.
  const PLAN_RE = /^\d{4}-\d{2}-\d{2}[_-].+\.md$/;
  const DUE_RE = /^(20\d{2}-\d{2}-\d{2})?$/;
  const json = (res, code, obj) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(obj)); };
  const handle = (req, res) => {
    if (req.method !== 'POST' || req.url.split('?')[0] !== '/__ds/due') return false;
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 65536) req.destroy(); });
    req.on('end', () => {
      let q = null;
      try { q = JSON.parse(raw || '{}'); } catch { return json(res, 400, { ok: false, error: 'parse' }); }
      const file = String((q && q.file) || '');
      const head = String((q && q.head) || '');
      const due = String((q && q.due) || '');
      if (file.includes('..') || file.includes('/') || !PLAN_RE.test(file) || !DUE_RE.test(due)) {
        return json(res, 400, { ok: false, error: 'shape' });
      }
      const path = resolve(__dirname, '.hermes/plans', file);
      if (!existsSync(path)) return json(res, 404, { ok: false, error: 'head-not-found' });
      const md = readFileSync(path, 'utf8');
      const canon = resolveHead(md, head);
      if (!canon) return json(res, 404, { ok: false, error: 'head-not-found' });
      const next = applyDueEdit(md, canon, due);
      if (next === null || next === md) return json(res, 200, { ok: true, head: canon, unchanged: true, content: md });
      writeFileSync(path, next);
      return json(res, 200, { ok: true, head: canon, content: next });
    });
    return true;
  };
  const mount = (server) => { server.middlewares.use((req, res, next) => { if (!handle(req, res)) next(); }); };
  return { name: 'ds-due-writer', configureServer: mount, configurePreviewServer: mount };
}
export default defineConfig({
  plugins: [react(), rawSourceRefsPlugin(), mechanicsGraphPlugin(), dsDueWriter()],
  server: { port: 5173, host: '0.0.0.0', open: false },
  appType: 'mpa',
  // index.html is the app entry (serves /); app.html is a redirect shim
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
        gallery: resolve(__dirname, 'gallery.html'),
        pitch: resolve(__dirname, 'pitch.html'),
        changelog: resolve(__dirname, 'changelog.html'),
        preview: resolve(__dirname, 'preview.html'),
        cube: resolve(__dirname, 'cube.html'),
        deck: resolve(__dirname, 'deck.html'),
        cubespline: resolve(__dirname, 'cube-spline.html'),
        illusion: resolve(__dirname, 'cube-illusion.html'),
      },
    },
  },
});
