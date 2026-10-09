import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // ✅ Proxy pour Treblo API : contourne le CORS
      '/api/treblo': {
        target: 'https://api.treblo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/treblo/, '/v1'),
        secure: true,
      },
    },
  },
});