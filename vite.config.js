import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: '0.0.0.0', open: false },
  appType: 'mpa',
  // gallery.html + preview.html + app.html are entry pages
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'app.html'),
        gallery: resolve(__dirname, 'gallery.html'),
        preview: resolve(__dirname, 'preview.html'),
      },
    },
  },
});
