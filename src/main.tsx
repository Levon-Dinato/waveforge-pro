// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ui/Toast';
import { Analytics } from '@vercel/analytics/react';
import './i18n';
import './styles/designSystem.css';
import './styles/transitions.css';

// ✅ DÉBLOQUEUR AUDIO GLOBAL
// Les navigateurs bloquent l'audio tant qu'il n'y a pas d'interaction.
// Ce script débloque le contexte au premier clic/toucher/touche.
const setupAudioUnlock = () => {
  if (typeof window === 'undefined') return;

  const unlock = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            console.log('🔓 AudioContext débloqué par interaction utilisateur');
            ctx.close();
          });
        }
      }
    } catch (e) {
      console.warn('Audio unlock error', e);
    }
    
    // On retire les écouteurs une fois que c'est fait
    document.removeEventListener('click', unlock);
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('keydown', unlock);
  };

  document.addEventListener('click', unlock);
  document.addEventListener('touchstart', unlock);
  document.addEventListener('keydown', unlock);
};

setupAudioUnlock();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
      <Analytics />
    </ToastProvider>
  </React.StrictMode>
);

// ❌ SERVICE WORKER DÉSACTIVÉ DÉFINITIVEMENT
// Le Service Worker causait des redirections vers /auth et des pages blanches.
// On le supprime pour le moment. On le réactivera plus tard avec une meilleure stratégie.
//
// if ('serviceWorker' in navigator && import.meta.env.PROD) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker
//       .register('/sw.js')
//       .then((registration) => {
//         console.log('✅ Service Worker enregistré:', registration.scope);
//       })
//       .catch((error) => {
//         console.error('❌ Erreur SW:', error);
//       });
//   });
// }