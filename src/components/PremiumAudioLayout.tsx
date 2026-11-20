// src/components/PremiumAudioLayout.tsx
// Layout route qui charge le moteur audio (Tone.js) en lazy, UNIQUEMENT pour
// les outils Premium. Ainsi, Tone.js ne pèse plus sur le bundle initial.
import React, { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

const AudioEngineProvider = lazy(() =>
  import('../contexts/AudioEngineProvider').then((m) => ({ default: m.AudioEngineProvider }))
);

export const PremiumAudioLayout: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16,
            color: '#888',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid rgba(0, 217, 255, 0.2)',
              borderTop: '3px solid #00d9ff',
              borderRadius: '50%',
              animation: 'premium-spin 0.8s linear infinite',
            }}
          />
          <div style={{ fontSize: 11, letterSpacing: '2px', fontFamily: 'monospace' }}>
            CHARGEMENT DU MOTEUR AUDIO...
          </div>
          <style>{`@keyframes premium-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <AudioEngineProvider>
        <Outlet />
      </AudioEngineProvider>
    </Suspense>
  );
};
