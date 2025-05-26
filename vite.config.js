import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          datgui: ['dat.gui']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['three', 'dat.gui']
  }
}); 