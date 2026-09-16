import { defineConfig } from 'vite';
export default defineConfig({
  server: { port: 5173, host: '0.0.0.0', open: false },
  appType: 'mpa',
  // gallery.html + preview.html are entry pages
});
