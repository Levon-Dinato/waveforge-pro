// src/pages/GeneratorPage.tsx
import React from 'react';
import { MelodyGenerator } from '../components/MelodyGenerator';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';

export const GeneratorPage: React.FC = () => {
  const engine = useAudioEngineContext();

  return (
    <div className="fade-in" style={{ padding: 20, display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          🎼 <span style={{ color: '#ffd43b' }}>Générateur de Mélodies</span>
        </h2>
        <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
          Pop · Trap · Lo-Fi · Drill · House
        </p>
      </div>

      <MelodyGenerator bpm={engine.result?.bpm ?? 120} />
    </div>
  );
};