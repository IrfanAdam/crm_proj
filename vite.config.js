import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
  plugins: [react(), mechanicsGraphPlugin()],
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
