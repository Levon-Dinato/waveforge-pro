// src/contexts/AudioEngineContext.tsx
// Contexte LÉGER : contient uniquement le createContext + le hook de consommation.
// Le provider lourd (qui importe Tone.js) est dans AudioEngineProvider.tsx et est
// chargé en lazy uniquement sur les outils Premium.
import { createContext, useContext } from 'react';
import type { useAudioEngine } from '../hooks/useAudioEngine';

// ✅ Récupère automatiquement le type de retour de useAudioEngine (sans importer Tone.js au runtime)
export type AudioEngineType = ReturnType<typeof useAudioEngine>;

export const AudioEngineContext = createContext<AudioEngineType | null>(null);

/**
 * Hook pour accéder au moteur audio depuis n'importe quelle page Premium.
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
