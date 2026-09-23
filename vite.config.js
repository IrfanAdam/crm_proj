import { resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
export default defineConfig({
  plugins: [react(), rawSourceRefsPlugin(), mechanicsGraphPlugin()],
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
        preview: resolve(__dirname, 'preview.html'),
      },
    },
  },
});
