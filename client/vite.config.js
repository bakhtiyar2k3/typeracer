import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// `shared/` lives one level up; allow importing it from the client.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@shared': path.resolve(import.meta.dirname, '..', 'shared'),
    },
  },
  server: {
    port: 5173,
    // Allow importing files from the sibling `shared/` directory in dev.
    fs: { allow: ['..'] },
    proxy: {
      // Proxy REST calls to the API server in dev so the client can use /api.
      // Target overridable via VITE_PROXY_TARGET (defaults to the API on :4000).
      '/api': process.env.VITE_PROXY_TARGET || 'http://localhost:4000',
    },
  },
});
