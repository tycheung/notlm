/**
 * Vite config — types come from the workspace-root `vite` only (no nested copy).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assistantRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: {
      allow: [assistantRoot],
    },
  },
});
