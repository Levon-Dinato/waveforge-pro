// src/pages/MasteringPage.tsx
import React from 'react';
import { MasteringPanel } from '../components/MasteringPanel';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';

export const MasteringPage: React.FC = () => {
  const engine = useAudioEngineContext();

  return (
    <div className="fade-in" style={{ padding: 20, display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          🎚️ <span style={{ color: 'var(--cyan)' }}>Mastering</span>
        </h2>
        <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
          Presets Warm/Balanced/Open/Master · analyse LUFS · export WAV
        </p>
      </div>

      {!engine.audioBuffer && (
        <div className="panel" style={{ padding: 20, borderColor: 'rgba(255, 92, 240, 0.3)' }}>
          <div style={{ fontSize: 13, color: '#ff5cf0' }}>
            ⚠️ Charge d'abord un audio dans la page <strong>Studio</strong> pour utiliser le mastering.
          </div>
        </div>
      )}

      <MasteringPanel
        audioContext={engine.audioContext}
        sourceNode={null}
        sourceBuffer={engine.audioBuffer}
      />
    </div>
  );
};