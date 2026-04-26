import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@api': path.resolve(__dirname, './src/api'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/v0': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Function-form manualChunks lets us route any @tiptap/* or
        // prosemirror-* module into the `editor` chunk without enumerating
        // every subpath (Tiptap pulls in 15+ ProseMirror packages
        // transitively, several of which have no top-level entry).
        manualChunks(id) {
          // Phase 10 (Card Canvas) — Tiptap + ProseMirror live in the
          // `editor` chunk. CardCanvasPage is React.lazy-imported, so
          // these bytes only ship to users who open `?canvas=1`.
          if (
            id.includes('node_modules/@tiptap/') ||
            id.includes('node_modules/prosemirror-') ||
            id.includes('node_modules/orderedmap/') ||
            id.includes('node_modules/rope-sequence/') ||
            id.includes('node_modules/w3c-keyname/')
          ) {
            return 'editor';
          }
          // Phase 2a renderer registry — papaparse is dynamically imported
          // inside the CSV renderers; isolate so the bytes are deferred
          // until a Card actually mounts CsvTableRenderer or CsvChartRenderer.
          if (id.includes('node_modules/papaparse/')) {
            return 'render-csv';
          }
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'vendor';
          }
          if (id.includes('node_modules/@tanstack/react-query/')) {
            return 'query';
          }
          if (
            id.includes('node_modules/lucide-react/') ||
            id.includes('node_modules/recharts/')
          ) {
            return 'ui';
          }
          if (id.includes('node_modules/@xyflow/react/')) {
            return 'reactflow';
          }
          return undefined;
        },
      },
    },
  },
});
