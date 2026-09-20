import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      // VersionIndicator probes /health to report the real compute backend
      '/health': 'http://localhost:4000',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split node_modules into chunks by package
          if (id.includes('node_modules')) {
            if (id.includes('maplibre')) return 'maplibre';
            if (id.includes('mapillary')) return 'mapillary';
            if (id.includes('lucide')) return 'lucide';
            if (id.includes('react-spring')) return 'animation';
            if (id.includes('@material')) return 'material-utils';
            if (id.includes('supercluster')) return 'clustering';
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 400,
  },
});
