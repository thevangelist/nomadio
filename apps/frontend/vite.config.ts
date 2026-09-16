import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Same-origin in dev too, so config.json can stay empty everywhere.
  server: {
    port: 3000,
    host: true,
    proxy: { '/api': { target: 'http://localhost:4000', ws: true } },
  },
  preview: { port: 3000, host: true },
});
