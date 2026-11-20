// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import { VitePWA } from 'vite-plugin-pwa'; // ❌ DÉSACTIVÉ TEMPORAIREMENT

export default defineConfig({
  plugins: [
    react(),
    // ❌ DÉSACTIVÉ TEMPORAIREMENT
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   ...
    // })
  ],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['essentia.js'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'react-helmet-async'],
          'audio-vendor': ['music-metadata-browser'],
          'supabase-vendor': ['@supabase/supabase-js'],
          // ✅ Grosses libs isolées pour éviter de gonfler le bundle initial
          'tone-vendor': ['tone'],
          'midi-vendor': ['@tonejs/midi'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});