// src/main.tsx

// ✅ SÉCURITÉ ANTI-CACHE POUR VERCEL (Empêche l'écran noir après un déploiement)
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});
// ---------------------------------------------------------------------------

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ui/Toast';
import { Analytics } from '@vercel/analytics/react';
// ✅ IMPORT DU THEME PROVIDER
import { ThemeProvider } from './contexts/ThemeContext'; 
import './i18n';
import './styles/designSystem.css';
import './styles/transitions.css';

// ✅ FIX POUR MUSIC-METADATA-BROWSER (Erreur Buffer is not defined)
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;
// ---------------------------------------------------------

// ✅ DÉBLOQUEUR AUDIO GLOBAL
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
    {/* ✅ ON ENVELOPPE TOUT DANS LE THEME PROVIDER */}
    <ThemeProvider>
      <ToastProvider>
        <App />
        <Analytics />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);