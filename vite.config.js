import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './fantasy-app/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://cat11.onrender.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
