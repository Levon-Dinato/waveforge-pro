// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es', // Important pour les Workers avec import
  },
  optimizeDeps: {
    exclude: ['essentia.js'], // Évite les conflits WASM avec Vite
  },
});