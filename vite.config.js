import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dsDueWriter } from './scripts/ds-due-writer.mjs';
import { gemBootPlugin } from './scripts/vite/gem-boot.mjs';
import { entryPreloadPlugin, rawSourceRefsPlugin } from './scripts/vite/entry-preload.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));

function mechanicsGraphPlugin() {
  let timer = null;
  let busy = false;
  let queued = false;
  function run() {
    if (busy) {
      queued = true;
      return;
    }
    busy = true;
    const p = spawn('node', ['scripts/generate-mechanics-graph.js'], { stdio: 'inherit' });
    p.on('close', () => {
      busy = false;
      if (queued) {
        queued = false;
        run();
      }
    });
  }
  return {
    name: 'mechanics-graph',
    buildStart() {
      return new Promise((res) => {
        const p = spawn('node', ['scripts/generate-mechanics-graph.js'], { stdio: 'inherit' });
        p.on('close', res);
      });
    },
    configureServer(server) {
      const schedule = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(run, 150);
      };
      const onChange = (f) => {
        if (f.startsWith('src/') && !f.includes('/mechanics/')) schedule();
      };
      server.watcher.on('change', onChange);
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}

export default defineConfig({
  plugins: [react(), gemBootPlugin(), entryPreloadPlugin(), rawSourceRefsPlugin(), mechanicsGraphPlugin(), dsDueWriter()],
  server: { port: 5173, host: '0.0.0.0', open: false },
  appType: 'mpa',
  // index.html is the app entry (serves /); app.html is a redirect shim
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(ROOT, 'index.html'),
        app: resolve(ROOT, 'app.html'),
        gallery: resolve(ROOT, 'gallery.html'),
        pitch: resolve(ROOT, 'pitch.html'),
        changelog: resolve(ROOT, 'changelog.html'),
        preview: resolve(ROOT, 'preview.html'),
        cube: resolve(ROOT, 'cube.html'),
        deck: resolve(ROOT, 'deck.html'),
        cubespline: resolve(ROOT, 'cube-spline.html'),
        illusion: resolve(ROOT, 'cube-illusion.html'),
      },
    },
  },
});
