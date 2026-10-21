// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ui/Toast';
import { Analytics } from '@vercel/analytics/react'; // ✅ 1. Ajout de l'import Vercel
import './i18n';

// ✅ Ordre IMPORTANT : designSystem d'abord (styles globaux), transitions en dernier (Mixer)
import './styles/designSystem.css';
import './styles/transitions.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
      <Analytics /> {/* ✅ 2. Ajout du composant Analytics */}
    </ToastProvider>
  </React.StrictMode>
);

// Enregistrement du Service Worker (PWA)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker enregistré:', registration.scope);
      })
      .catch((error) => {
        console.error('❌ Erreur SW:', error);
      });
  });
}