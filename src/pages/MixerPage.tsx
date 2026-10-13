// src/pages/MixerPage.tsx
import React from 'react';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { DualDeckMixer } from '../components/mixer/DualDeckMixer';

export const MixerPage: React.FC = () => {
  const engine = useAudioEngineContext();
  return <DualDeckMixer audioContext={engine.audioContext} />;
};