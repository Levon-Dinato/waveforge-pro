// src/contexts/AudioEngineContext.tsx
import React, { createContext, useContext, type ReactNode } from 'react';
import { useAudioEngine } from '../hooks/useAudioEngine';

// ✅ Récupère automatiquement le type de retour de useAudioEngine
type AudioEngineType = ReturnType<typeof useAudioEngine>;

const AudioEngineContext = createContext<AudioEngineType | null>(null);

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

/**
 * Hook pour accéder au moteur audio depuis n'importe quelle page.
 * Lance une erreur si utilisé en dehors du provider.
 */
export function useAudioEngineContext(): AudioEngineType {
  const context = useContext(AudioEngineContext);
  if (!context) {
    throw new Error(
      'useAudioEngineContext doit être utilisé à l\'intérieur d\'un <AudioEngineProvider>'
    );
  }
  return context;
}