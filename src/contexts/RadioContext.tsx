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
  
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(false);
  const [crossfadeDuration, setCrossfadeDuration] = useState(3);
  const isCrossfadingRef = useRef(false);

  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const activePlayerRef = useRef<'A' | 'B'>('A');

  const pendingSeekRef = useRef<number | null>(null);
  const isActiveRef = useRef(false); 
  const { stop: stopMainPlayer } = usePlayer();

  // ✅ SYNCHRONISATION ENTRE LES FENÊTRES
  const broadcastChannel = useRef<BroadcastChannel | null>(null);
  const isReceivingSync = useRef(false);

  const currentTrack = tracks[currentIndex];

  // Initialisation du canal de communication
  useEffect(() => {
    broadcastChannel.current = new BroadcastChannel('dropzone_radio_sync');
    
    broadcastChannel.current.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'SYNC_STATE' && !isReceivingSync.current) {
        isReceivingSync.current = true;
        
        // Mise à jour de l'état local sans déclencher un nouvel envoi
        if (data.isPlaying !== isPlaying) setIsPlaying(data.isPlaying);
        if (data.currentIndex !== currentIndex) setCurrentIndex(data.currentIndex);
        
        // Synchronisation du temps (si le décalage est supérieur à 2 secondes)
        const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
        if (currentAudio && Math.abs(currentAudio.currentTime - data.progress) > 2) {
          currentAudio.currentTime = data.progress;
          setProgress(data.progress);
        }
        
        setTimeout(() => { isReceivingSync.current = false; }, 100);
      }
    };

    return () => {
      broadcastChannel.current?.close();
    };
  }, [isPlaying, currentIndex, progress]);

  // Fonction pour envoyer l'état aux autres fenêtres
  const broadcastState = useCallback((state: { isPlaying?: boolean, currentIndex?: number, progress?: number }) => {
    if (isReceivingSync.current) return; // On n'envoie pas si on vient de recevoir
    broadcastChannel.current?.postMessage({
      type: 'SYNC_STATE',
      isPlaying: state.isPlaying !== undefined ? state.isPlaying : isPlaying,
      currentIndex: state.currentIndex !== undefined ? state.currentIndex : currentIndex,
      progress: state.progress !== undefined ? state.progress : progress
    });
  }, [isPlaying, currentIndex, progress]);

  const updateRadioSettings = useCallback((enabled: boolean, dur: number) => {
    setCrossfadeEnabled(enabled);
    setCrossfadeDuration(dur);
  }, []);

  const startRadio = useCallback((newTracks: any[], live: boolean, url: string, startIndex: number = 0, startTime?: number) => {
    if (isActiveRef.current) return;

    isActiveRef.current = true;
    stopMainPlayer();
    setTracks(newTracks);
    setCurrentIndex(startIndex);
    setIsLive(live);
    setLiveUrl(url);
    setIsRadioActive(true);
    setIsPlaying(true);
    setProgress(startTime || 0);
    setNeedsGesture(false);
    isCrossfadingRef.current = false;
    
    if (startTime !== undefined && startTime > 0) {
      pendingSeekRef.current = startTime;
    } else {
      pendingSeekRef.current = 0;
    }

    // On informe l'autre fenêtre qu'on a démarré
    setTimeout(() => broadcastState({ isPlaying: true, currentIndex: startIndex, progress: startTime || 0 }), 500);
  }, [stopMainPlayer, broadcastState]);

  const unlockAudio = useCallback(() => {
    setNeedsGesture(false);
    setIsPlaying(true);
    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    if (currentAudio) currentAudio.play().catch(() => setNeedsGesture(true));
    broadcastState({ isPlaying: true });
  }, [broadcastState]);

  const togglePlay = useCallback(() => {
    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    if (!currentAudio) return;
    
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    
    if (!newPlayingState) {
      currentAudio.pause();
    } else {
      setNeedsGesture(false);
      currentAudio.play().catch(() => setNeedsGesture(true));
    }
    
    // On informe l'autre fenêtre
    broadcastState({ isPlaying: newPlayingState });
  }, [isPlaying, broadcastState]);

  const transitionToTrack = useCallback((nextIndex: number) => {
    if (isLive || tracks.length === 0) return;
    const nextTrack = tracks[nextIndex];
    if (!nextTrack) return;

    if (!crossfadeEnabled || !isPlaying || nextTrack.is_jingle || currentTrack?.is_jingle) {
      isCrossfadingRef.current = false;
      setCurrentIndex(nextIndex);
      broadcastState({ currentIndex: nextIndex, progress: 0 });
      return;
    }

    isCrossfadingRef.current = true;
    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    const nextAudio = activePlayerRef.current === 'A' ? audioBRef.current : audioARef.current;
    
    if (!currentAudio || !nextAudio) { setCurrentIndex(nextIndex); return; }

    nextAudio.src = nextTrack.audio_url;
    nextAudio.volume = 0;
    nextAudio.play().catch(console.error);

    const startTime = performance.now();
    const durationMs = crossfadeDuration * 1000;

    const animateFade = (time: number) => {
      const elapsed = time - startTime;
      const progressFade = Math.min(1, elapsed / durationMs);
      if (currentAudio) currentAudio.volume = 1 - progressFade;
      if (nextAudio) nextAudio.volume = progressFade;

      if (progressFade < 1) {
        requestAnimationFrame(animateFade);
      } else {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.volume = 1;
        nextAudio.volume = 1;
        activePlayerRef.current = activePlayerRef.current === 'A' ? 'B' : 'A';
        isCrossfadingRef.current = false;
        setCurrentIndex(nextIndex);
        broadcastState({ currentIndex: nextIndex, progress: 0 });
      }
    };
    requestAnimationFrame(animateFade);
  }, [crossfadeEnabled, crossfadeDuration, isLive, isPlaying, tracks, currentTrack?.is_jingle, broadcastState]);

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
      broadcastState({ progress: time });
    }
  }, [isLive, broadcastState]);

  const stopRadio = useCallback(() => {
    isActiveRef.current = false;
    setIsPlaying(false);
    setIsRadioActive(false);
    setNeedsGesture(false);
    isCrossfadingRef.current = false;
    if (audioARef.current) { audioARef.current.pause(); audioARef.current.currentTime = 0; }
    if (audioBRef.current) { audioBRef.current.pause(); audioBRef.current.currentTime = 0; }
    activePlayerRef.current = 'A';
    broadcastState({ isPlaying: false });
  }, [broadcastState]);

  // Envoi régulier de l'état (toutes les 3 secondes) pour garder la synchro
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && isRadioActive) {
        broadcastState({ progress });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isPlaying, isRadioActive, progress, broadcastState]);

  const handleTimeUpdate = () => {
    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    if (!currentAudio) return;
    setProgress(currentAudio.currentTime);
    setDuration(currentAudio.duration || 0);

    if (crossfadeEnabled && !isCrossfadingRef.current && currentAudio.duration > 0 && !currentTrack?.is_jingle) {
      const timeLeft = currentAudio.duration - currentAudio.currentTime;
      if (timeLeft <= crossfadeDuration) {
        const nextIndex = (currentIndex + 1) % tracks.length;
        transitionToTrack(nextIndex);
      }
    }
  };

  useEffect(() => {
    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    if (!currentAudio || !currentTrack) return;

    const desiredSrc = isLive ? liveUrl : currentTrack.audio_url;
    if (!desiredSrc) return;

    if (currentAudio.src !== desiredSrc) {
      currentAudio.src = desiredSrc;
      currentAudio.load();
    }

    const onCanPlay = () => {
      if (pendingSeekRef.current !== null && pendingSeekRef.current > 0) {
        currentAudio.currentTime = pendingSeekRef.current;
        setProgress(pendingSeekRef.current);
        pendingSeekRef.current = null;
      }
      if (isPlaying) {
        currentAudio.play().catch((e) => {
          if (e.name === 'NotAllowedError') {
            setNeedsGesture(true);
            setIsPlaying(false);
          }
        });
      }
      currentAudio.removeEventListener('canplay', onCanPlay);
    };

    currentAudio.addEventListener('canplay', onCanPlay);

    return () => {
      currentAudio.removeEventListener('canplay', onCanPlay);
    };
  }, [currentTrack, isLive, liveUrl, isPlaying]);

  return (
    <RadioContext.Provider value={{
      tracks, currentIndex, currentTrack, isPlaying, progress, duration,
      isLive, liveUrl, isRadioActive, needsGesture,
      startRadio, updateRadioSettings, togglePlay, playNext, playPrev, seek, stopRadio, unlockAudio
    }}>
      {children}
      
      <audio ref={audioARef} preload="auto" onTimeUpdate={handleTimeUpdate} onEnded={isLive ? undefined : playNext} crossOrigin="anonymous" />
      <audio ref={audioBRef} preload="auto" onTimeUpdate={() => { if (activePlayerRef.current === 'B') { setProgress(audioBRef.current?.currentTime || 0); setDuration(audioBRef.current?.duration || 0); } }} onEnded={() => { if (activePlayerRef.current === 'B') playNext(); }} crossOrigin="anonymous" />
    </RadioContext.Provider>
  );
};

export const useRadio = () => {
  const context = useContext(RadioContext);
  if (!context) throw new Error('useRadio must be used within RadioProvider');
  return context;
};