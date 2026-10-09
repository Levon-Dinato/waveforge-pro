// src/pages/RemixPage.tsx
import React from 'react';
import { RemixPanel } from '../components/RemixPanel';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';

export const RemixPage: React.FC = () => {
  const engine = useAudioEngineContext();

  return (
    <div className="fade-in" style={{ padding: 20, display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          🎛️ <span style={{ color: '#ff5cf0' }}>Remix AI</span>
        </h2>
        <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
          Transformation IA avec Treblo · apprentissage continu
        </p>
      </div>

      {!engine.sourceFile && (
        <div className="panel" style={{ padding: 20, borderColor: 'rgba(255, 92, 240, 0.3)' }}>
          <div style={{ fontSize: 13, color: '#ff5cf0' }}>
            ⚠️ Charge d'abord un audio dans la page <strong>Studio</strong> pour utiliser le remix IA.
          </div>
        </div>
      )}

      <RemixPanel
        sourceAudioFile={engine.sourceFile}
        sourceBPM={engine.result?.bpm ?? 120}
      />
    </div>
  );
};