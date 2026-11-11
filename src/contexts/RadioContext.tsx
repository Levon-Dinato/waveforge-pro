// src/contexts/RadioContext.tsx
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { usePlayer } from './PlayerContext';

export interface RadioContextType {
  tracks: any[];
  currentIndex: number;
  currentTrack: any;
  isPlaying: boolean;
  progress: number;
  duration: number;
  isLive: boolean;
  liveUrl: string;
  isRadioActive: boolean;
  needsGesture: boolean;
  startRadio: (newTracks: any[], live: boolean, url: string, startIndex?: number, startTime?: number) => void;
  updateRadioSettings: (crossfadeEnabled: boolean, crossfadeDuration: number) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  seek: (time: number) => void;
  stopRadio: () => void;
  unlockAudio: () => void;
}

const RadioContext = createContext<RadioContextType | undefined>(undefined);

export const RadioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tracks, setTracks] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');
  const [isRadioActive, setIsRadioActive] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  
  // ✅ Paramètres du Crossfade
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(false);
  const [crossfadeDuration, setCrossfadeDuration] = useState(3); // en secondes
  const isCrossfadingRef = useRef(false);

  // ✅ Double lecteur audio pour le fondu
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const activePlayerRef = useRef<'A' | 'B'>('A');

  const pendingSeekRef = useRef<number | null>(null);
  const isActiveRef = useRef(false); 
  const { stop: stopMainPlayer } = usePlayer();

  const currentTrack = tracks[currentIndex];

  // ✅ Fonction appelée par le RadioLayout pour injecter les réglages
  const updateRadioSettings = useCallback((enabled: boolean, dur: number) => {
    setCrossfadeEnabled(enabled);
    setCrossfadeDuration(dur);
  }, []);

  const startRadio = useCallback((newTracks: any[], live: boolean, url: string, startIndex: number = 0, startTime?: number) => {
    if (isActiveRef.current) {
      if (live !== isLive || url !== liveUrl) {
        setIsLive(live);
        setLiveUrl(url);
      }
      return;
    }

    isActiveRef.current = true;
    stopMainPlayer();
    setTracks(newTracks);
    setCurrentIndex(startIndex);
    setIsLive(live);
    setLiveUrl(url);
    setIsRadioActive(true);
    setIsPlaying(true);
    setProgress(0);
    setNeedsGesture(false);
    isCrossfadingRef.current = false;
    
    if (startTime !== undefined && startTime > 0) {
      pendingSeekRef.current = startTime;
    } else {
      pendingSeekRef.current = null;
    }
  }, [isLive, liveUrl, stopMainPlayer]);

  const unlockAudio = useCallback(() => {
    setNeedsGesture(false);
    setIsPlaying(true);
    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    if (currentAudio) {
       currentAudio.play().catch(e => {
         if (e.name === 'NotAllowedError') setNeedsGesture(true);
       });
    }
  }, []);

  const togglePlay = useCallback(() => {
    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    if (!currentAudio) return;
    if (isPlaying) {
      currentAudio.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      setNeedsGesture(false);
      currentAudio.play().catch(e => {
         if (e.name === 'NotAllowedError') setNeedsGesture(true);
      });
    }
  }, [isPlaying]);

  // ✅ Fonction de transition avec Crossfade
  const transitionToTrack = useCallback((nextIndex: number) => {
    if (isLive || tracks.length === 0) return;
    
    const nextTrack = tracks[nextIndex];
    if (!nextTrack) return;

    // Si le crossfade est désactivé ou que c'est le premier lancement
    if (!crossfadeEnabled || !isPlaying) {
      setCurrentIndex(nextIndex);
      return;
    }

    // Déclenchement du fondu
    isCrossfadingRef.current = true;
    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    const nextAudio = activePlayerRef.current === 'A' ? audioBRef.current : audioARef.current;
    
    if (!currentAudio || !nextAudio) {
      setCurrentIndex(nextIndex);
      return;
    }

    // Configuration de la piste suivante
    nextAudio.src = nextTrack.audio_url;
    nextAudio.volume = 0;
    nextAudio.play().catch(console.error);

    // Animation du volume (Fade In / Fade Out)
    const startTime = performance.now();
    const durationMs = crossfadeDuration * 1000;

    const animateFade = (time: number) => {
      const elapsed = time - startTime;
      const progressFade = Math.min(1, elapsed / durationMs);

      // Baisse le son de l'ancienne piste
      if (currentAudio) currentAudio.volume = 1 - progressFade;
      // Monte le son de la nouvelle piste
      if (nextAudio) nextAudio.volume = progressFade;

      if (progressFade < 1) {
        requestAnimationFrame(animateFade);
      } else {
        // Fin du fondu : on arrête la piste précédente et on valide le changement
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.volume = 1; // Reset pour la prochaine fois
        nextAudio.volume = 1;
        
        // On inverse le lecteur actif (A devient B, B devient A)
        activePlayerRef.current = activePlayerRef.current === 'A' ? 'B' : 'A';
        isCrossfadingRef.current = false;
        
        // Mise à jour de l'index React
        setCurrentIndex(nextIndex);
      }
    };
    
    requestAnimationFrame(animateFade);
  }, [crossfadeEnabled, crossfadeDuration, isLive, isPlaying, tracks]);

  const playNext = useCallback(() => {
    if (isLive || tracks.length === 0) return;
    const nextIndex = (currentIndex + 1) % tracks.length;
    transitionToTrack(nextIndex);
  }, [isLive, tracks.length, currentIndex, transitionToTrack]);

  const playPrev = useCallback(() => {
    if (isLive || tracks.length === 0) return;
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    transitionToTrack(prevIndex);
  }, [isLive, tracks.length, currentIndex, transitionToTrack]);

  const seek = useCallback((time: number) => {
    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    if (currentAudio && !isLive) {
      currentAudio.currentTime = time;
      setProgress(time);
    }
  }, [isLive]);

  const stopRadio = useCallback(() => {
    isActiveRef.current = false;
    setIsPlaying(false);
    setIsRadioActive(false);
    setNeedsGesture(false);
    isCrossfadingRef.current = false;
    if (audioARef.current) { audioARef.current.pause(); audioARef.current.currentTime = 0; }
    if (audioBRef.current) { audioBRef.current.pause(); audioBRef.current.currentTime = 0; }
    activePlayerRef.current = 'A';
  }, []);

  // ✅ Déclencheur automatique de fin de piste (avec anticipation pour le crossfade)
  const handleTimeUpdate = () => {
    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    if (!currentAudio) return;

    setProgress(currentAudio.currentTime);
    setDuration(currentAudio.duration || 0);

    // Si le crossfade est activé et qu'on approche de la fin
    if (crossfadeEnabled && !isCrossfadingRef.current && currentAudio.duration > 0) {
      const timeLeft = currentAudio.duration - currentAudio.currentTime;
      if (timeLeft <= crossfadeDuration) {
        const nextIndex = (currentIndex + 1) % tracks.length;
        transitionToTrack(nextIndex);
      }
    }
  };

  useEffect(() => {
    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    if (currentAudio && !isCrossfadingRef.current) {
      if (isPlaying) {
        currentAudio.play().catch((e) => {
          if (e.name === 'NotAllowedError') {
            setNeedsGesture(true);
            setIsPlaying(false);
          }
        });
      } else {
        currentAudio.pause();
      }
    }
  }, [isPlaying, currentIndex, isLive, tracks, currentTrack?.audio_url]);

  return (
    <RadioContext.Provider value={{
      tracks, currentIndex, currentTrack, isPlaying, progress, duration,
      isLive, liveUrl, isRadioActive, needsGesture,
      startRadio, updateRadioSettings, togglePlay, playNext, playPrev, seek, stopRadio, unlockAudio
    }}>
      {children}
      
      {/* ✅ PISTE A */}
      <audio
        ref={audioARef}
        src={activePlayerRef.current === 'A' ? (isLive ? liveUrl : (currentTrack?.audio_url || '')) : undefined}
        preload="auto"
        onLoadedMetadata={() => {
          if (activePlayerRef.current === 'A' && pendingSeekRef.current !== null && audioARef.current) {
            audioARef.current.currentTime = pendingSeekRef.current;
            setProgress(pendingSeekRef.current);
            pendingSeekRef.current = null;
          }
        }}
        onTimeUpdate={handleTimeUpdate}
        onEnded={isLive ? undefined : playNext}
        crossOrigin="anonymous"
      />

      {/* ✅ PISTE B (Cachée, utilisée uniquement pour le crossfade) */}
      <audio
        ref={audioBRef}
        preload="auto"
        onTimeUpdate={() => {
          // On ne met à jour l'UI que si c'est le lecteur actif
          if (activePlayerRef.current === 'B') {
            setProgress(audioBRef.current?.currentTime || 0);
            setDuration(audioBRef.current?.duration || 0);
          }
        }}
        onEnded={() => {
          // La piste B est devenue la piste principale après le fondu
          if (activePlayerRef.current === 'B') playNext();
        }}
        crossOrigin="anonymous"
      />
    </RadioContext.Provider>
  );
};

export const useRadio = () => {
  const context = useContext(RadioContext);
  if (!context) throw new Error('useRadio must be used within RadioProvider');
  return context;
};