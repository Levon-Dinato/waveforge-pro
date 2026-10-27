// src/main.tsx
// ... (ton code inchangé)

// ❌ SERVICE WORKER DÉSACTIVÉ TEMPORAIREMENT POUR DÉBLOQUER LA SITUATION
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