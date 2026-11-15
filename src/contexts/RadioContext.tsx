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

const SYNC_KEY = 'dropzone_global_radio_state';

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

  const currentTrack = tracks[currentIndex];

  // 1. ÉCOUTE DES CHANGEMENTS FAITS PAR L'AUTRE ONGLET
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SYNC_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          
          // Si l'autre onglet a une radio active et qu'on n'est pas le "chef" actuel
          if (data.isRadioActive && data.tracks && data.tracks.length > 0) {
            setIsRadioActive(true);
            setIsLive(data.isLive);
            setLiveUrl(data.liveUrl);
            
            // On synchronise la playlist si on ne l'a pas (ex: nouveau popup)
            if (tracks.length === 0) {
              setTracks(data.tracks);
            }
            
            if (data.currentIndex !== currentIndex) setCurrentIndex(data.currentIndex);
            if (data.isPlaying !== isPlaying) setIsPlaying(data.isPlaying);

            // On recale le temps si le décalage est supérieur à 3 secondes
            const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
            if (currentAudio && Math.abs(currentAudio.currentTime - data.progress) > 3) {
              currentAudio.currentTime = data.progress;
              setProgress(data.progress);
            }
          } else if (!data.isRadioActive && isRadioActive) {
             // L'autre onglet a arrêté la radio
             setIsPlaying(false);
             setIsRadioActive(false);
          }
        } catch (err) {
          console.error("Erreur de lecture du localStorage", err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [tracks.length, currentIndex, isPlaying, isRadioActive]);

  // 2. FONCTION POUR SAUVEGARDER NOTRE ÉTAT POUR L'AUTRE ONGLET
  const saveStateToLocalStorage = useCallback((customData = {}) => {
    if (!isRadioActive || tracks.length === 0) return;

    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    const currentProgress = currentAudio ? currentAudio.currentTime : progress;

    // On sauvegarde la playlist entière pour que le popup l'ait aussi (avec les jingles inclus)
    const stateToSave = {
      isRadioActive: true,
      isLive,
      liveUrl,
      tracks,
      currentIndex,
      isPlaying,
      progress: currentProgress,
      ...customData
    };
    localStorage.setItem(SYNC_KEY, JSON.stringify(stateToSave));
  }, [isRadioActive, isLive, liveUrl, tracks, currentIndex, isPlaying, progress]);

  // 3. ENVOI RÉGULIER DE NOTRE ÉTAT (Toutes les 2 secondes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && isRadioActive) {
        saveStateToLocalStorage();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isPlaying, isRadioActive, saveStateToLocalStorage]);

  // --- LE RESTE DES FONCTIONS ---

  const updateRadioSettings = useCallback((enabled: boolean, dur: number) => {
    setCrossfadeEnabled(enabled);
    setCrossfadeDuration(dur);
  }, []);

  const startRadio = useCallback((newTracks: any[], live: boolean, url: string, startIndex: number = 0, startTime?: number) => {
    if (isActiveRef.current && tracks.length > 0) return; // Si on est déjà le chef

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

    // On sauvegarde immédiatement pour prévenir l'autre fenêtre
    setTimeout(() => {
      localStorage.setItem(SYNC_KEY, JSON.stringify({
        isRadioActive: true, isLive: live, liveUrl: url, tracks: newTracks,
        currentIndex: startIndex, isPlaying: true, progress: startTime || 0
      }));
    }, 500);

  }, [stopMainPlayer, tracks.length]);

  const unlockAudio = useCallback(() => {
    setNeedsGesture(false);
    setIsPlaying(true);
    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    if (currentAudio) currentAudio.play().catch(() => setNeedsGesture(true));
    saveStateToLocalStorage({ isPlaying: true });
  }, [saveStateToLocalStorage]);

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
    saveStateToLocalStorage({ isPlaying: newPlayingState });
  }, [isPlaying, saveStateToLocalStorage]);

  const transitionToTrack = useCallback((nextIndex: number) => {
    if (isLive || tracks.length === 0) return;
    const nextTrack = tracks[nextIndex];
    if (!nextTrack) return;

    // ✅ Gestion des jingles (pas de crossfade)
    if (!crossfadeEnabled || !isPlaying || nextTrack.is_jingle || currentTrack?.is_jingle) {
      isCrossfadingRef.current = false;
      setCurrentIndex(nextIndex);
      saveStateToLocalStorage({ currentIndex: nextIndex, progress: 0 });
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
        saveStateToLocalStorage({ currentIndex: nextIndex, progress: 0 });
      }
    };
    requestAnimationFrame(animateFade);
  }, [crossfadeEnabled, crossfadeDuration, isLive, isPlaying, tracks, currentTrack?.is_jingle, saveStateToLocalStorage]);

  const playNext = useCallback(() => {
    if (isLive || tracks.length === 0) return;
    transitionToTrack((currentIndex + 1) % tracks.length);
  }, [isLive, tracks.length, currentIndex, transitionToTrack]);

  const playPrev = useCallback(() => {
    if (isLive || tracks.length === 0) return;
    transitionToTrack((currentIndex - 1 + tracks.length) % tracks.length);
  }, [isLive, tracks.length, currentIndex, transitionToTrack]);

  const seek = useCallback((time: number) => {
    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    if (currentAudio && !isLive) {
      currentAudio.currentTime = time;
      setProgress(time);
      saveStateToLocalStorage({ progress: time });
    }
  }, [isLive, saveStateToLocalStorage]);

  const stopRadio = useCallback(() => {
    isActiveRef.current = false;
    setIsPlaying(false);
    setIsRadioActive(false);
    setNeedsGesture(false);
    isCrossfadingRef.current = false;
    if (audioARef.current) { audioARef.current.pause(); audioARef.current.currentTime = 0; }
    if (audioBRef.current) { audioBRef.current.pause(); audioBRef.current.currentTime = 0; }
    activePlayerRef.current = 'A';
    localStorage.removeItem(SYNC_KEY);
  }, []);

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
    return () => currentAudio.removeEventListener('canplay', onCanPlay);
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