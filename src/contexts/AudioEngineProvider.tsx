// src/contexts/AudioEngineProvider.tsx
// Provider LOURD : importe Tone.js (via useAudioEngine). Chargé en lazy uniquement
// sur les outils Premium pour ne pas alourdir le bundle initial.
import React, { type ReactNode } from 'react';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { AudioEngineContext } from './AudioEngineContext';

interface AudioEngineProviderProps {
  children: ReactNode;
}

export const AudioEngineProvider: React.FC<AudioEngineProviderProps> = ({ children }) => {
  const engine = useAudioEngine();

  return (
    <AudioEngineContext.Provider value={engine}>
      {children}
    </AudioEngineContext.Provider>
  );
};
