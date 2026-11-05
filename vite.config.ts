// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'; // ✅ Import du plugin

export default defineConfig({
  plugins: [
    react(),
    // ✅ Ajout de la configuration PWA
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'og-image.jpg', 'logo.jpg'],
      manifest: {
        name: 'DropZone.dj',
        short_name: 'DropZone',
        description: 'La plateforme des DJs indépendants. Partagez vos sons, mixez et connectez-vous.',
        theme_color: '#050505',
        background_color: '#050505',
        display: 'standalone', // ✅ Cache la barre d'adresse URL (Effet App Native)
        orientation: 'portrait',
        icons: [
          {
            src: '/og-image.jpg', // ⚠️ Assure-toi que cette image existe dans /public
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any'
          },
          {
            src: '/og-image.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any'
          },
          {
            src: '/og-image.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'maskable' // Pour les icônes Android
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,mp3}'], // Mise en cache des audios récurrents
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // Jusqu'à 10 Mo pour le cache
      }
    })
  ],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['essentia.js'],
  },
});