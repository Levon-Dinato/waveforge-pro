// src/contexts/RadioContext.tsx
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { usePlayer } from './PlayerContext';
import { supabase } from '../lib/supabase';

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
  startRadio: (newTracks: any[], live: boolean, url: string, startIndex?: number, startTime?: number, force?: boolean) => void;
  updateRadioSettings: (crossfadeEnabled: boolean, crossfadeDuration: number) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  seek: (time: number) => void;
  stopRadio: () => void;
  unlockAudio: () => void;
  volume: number;
  setVolume: (v: number) => void;
}

const RadioContext = createContext<RadioContextType | undefined>(undefined);

const SYNC_KEY = 'elektraq_global_radio_state';

export const RadioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const getInitialState = () => {
    // ✅ On vérifie qu'on est sur une page radio ou player avant de charger l'état
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/radio/') && !window.location.pathname.includes('/player/')) {
      return null; 
    }
    
    try {
      const saved = localStorage.getItem(SYNC_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isRadioActive && parsed.tracks && parsed.tracks.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  };

  const initialState = getInitialState();

  const [tracks, setTracks] = useState<any[]>(initialState?.tracks || []);
  const [currentIndex, setCurrentIndex] = useState(initialState?.currentIndex || 0);
  const [isPlaying, setIsPlaying] = useState(initialState?.isPlaying || false);
  const [progress, setProgress] = useState(initialState?.progress || 0);
  const [duration, setDuration] = useState(0);
  const [isLive, setIsLive] = useState(initialState?.isLive || false);
  const [liveUrl, setLiveUrl] = useState(initialState?.liveUrl || '');
  const [isRadioActive, setIsRadioActive] = useState(initialState?.isRadioActive || false);
  const [needsGesture, setNeedsGesture] = useState(false);
  
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(false);
  const [crossfadeDuration, setCrossfadeDuration] = useState(3);
  const [volume, setVolume] = useState(1);
  const isCrossfadingRef = useRef(false);

  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const activePlayerRef = useRef<'A' | 'B'>('A');
  // 🎚️ Limiteur anti-saturation : homogénéise le niveau des titres et empêche l'écrêtage
  const audioCtxRef = useRef<AudioContext | null>(null);
  const glueRef = useRef<DynamicsCompressorNode | null>(null);
  const limiterRef = useRef<DynamicsCompressorNode | null>(null);
  const wiredARef = useRef<HTMLAudioElement | null>(null);
  const wiredBRef = useRef<HTMLAudioElement | null>(null);

  const pendingSeekRef = useRef<number | null>(initialState?.progress || null);
  const isActiveRef = useRef(initialState?.isRadioActive || false); 
  const { stop: stopMainPlayer } = usePlayer();

  // ==== LIMITEUR / NORMALISATION DU NIVEAU (Web Audio) ====
  const resumeAudioCtx = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }, []);

  const ensureLimiterGraph = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtxRef.current) {
        const ctx = new AudioCtx();
        // Étage 1 : compresseur « glue » — rapproche les niveaux (titre calme remonté, titre fort adouci)
        const glue = ctx.createDynamicsCompressor();
        glue.threshold.value = -18;
        glue.knee.value = 12;
        glue.ratio.value = 3;
        glue.attack.value = 0.004;
        glue.release.value = 0.18;
        // Étage 2 : limiteur « brickwall » — plafonne les crêtes, aucune saturation possible
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -1;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.001;
        limiter.release.value = 0.08;
        glue.connect(limiter);
        limiter.connect(ctx.destination);
        audioCtxRef.current = ctx;
        glueRef.current = glue;
        limiterRef.current = limiter;
      }
      return audioCtxRef.current;
    } catch (e) {
      console.warn('[Radio] Limiteur audio indisponible:', e);
      return null;
    }
  }, []);

  const wireLimiter = useCallback((el: HTMLAudioElement | null, slot: 'A' | 'B') => {
    const wiredRef = slot === 'A' ? wiredARef : wiredBRef;
    if (!el || wiredRef.current === el) return;
    const ctx = ensureLimiterGraph();
    if (!ctx) return;
    try {
      const source = ctx.createMediaElementSource(el);
      source.connect(glueRef.current!);
      wiredRef.current = el;
    } catch (e) {
      console.warn(`[Radio] Routage audio ${slot} impossible:`, e);
    }
  }, [ensureLimiterGraph]);

  const currentTrack = tracks[currentIndex];

  // ✅ Met à jour "last_played_at" à chaque changement de titre (page radio ET popup)
  useEffect(() => {
    if (currentTrack?.id) {
      supabase.from('tracks').update({ last_played_at: new Date().toISOString() }).eq('id', currentTrack.id).then();
    }
  }, [currentTrack?.id]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SYNC_KEY && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.isRadioActive && data.tracks && data.tracks.length > 0) {
            setIsRadioActive(true);
            setIsLive(data.isLive);
            setLiveUrl(data.liveUrl);
            setTracks(data.tracks);
            setCurrentIndex(data.currentIndex);
            setIsPlaying(data.isPlaying);

            const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
            if (currentAudio && Math.abs(currentAudio.currentTime - data.progress) > 1.5) {
              currentAudio.currentTime = data.progress;
              setProgress(data.progress);
            }
          } else if (!data.isRadioActive) {
             setIsPlaying(false);
             setIsRadioActive(false);
          }
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveStateToLocalStorage = useCallback((customData = {}) => {
    if (!isRadioActive || tracks.length === 0) return;

    const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
    const currentProgress = currentAudio ? currentAudio.currentTime : progress;

    // ✅ ON NE SAUVEGARDE QUE SI L'AUDIO EST BIEN AVANCÉ (évite de sauvegarder 0)
    if (currentProgress > 0 || customData.hasOwnProperty('progress')) {
      localStorage.setItem(SYNC_KEY, JSON.stringify({
        isRadioActive: true,
        isLive,
        liveUrl,
        tracks, 
        currentIndex,
        isPlaying,
        progress: currentProgress,
        ...customData
      }));
    }
  }, [isRadioActive, isLive, liveUrl, tracks, currentIndex, isPlaying, progress]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && isRadioActive) {
        saveStateToLocalStorage();
      }
    }, 1000); 
    return () => clearInterval(interval);
  }, [isPlaying, isRadioActive, saveStateToLocalStorage]);

  const updateRadioSettings = useCallback((enabled: boolean, dur: number) => {
    setCrossfadeEnabled(enabled);
    setCrossfadeDuration(dur);
  }, []);

  const startRadio = useCallback((newTracks: any[], live: boolean, url: string, startIndex: number = 0, startTime?: number, force: boolean = false) => {
    // ✅ En mode forcé (chargement initial), on repositionne toujours sur le point calculé
    // par l'epoch pour une radio réellement synchronisée, même si l'état persisté dit "active".
    if (!force && isActiveRef.current && tracks.length > 0) return;

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
    
    pendingSeekRef.current = startTime || 0;
    resumeAudioCtx();

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
    if (currentAudio) { resumeAudioCtx(); currentAudio.play().catch(() => setNeedsGesture(true)); }
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
      resumeAudioCtx();
      currentAudio.play().catch(() => setNeedsGesture(true));
    }
    saveStateToLocalStorage({ isPlaying: newPlayingState });
  }, [isPlaying, saveStateToLocalStorage]);

  const transitionToTrack = useCallback((nextIndex: number) => {
    if (isLive || tracks.length === 0) return;
    if (isCrossfadingRef.current) return;
    const nextTrack = tracks[nextIndex];
    if (!nextTrack) return;

    if (!crossfadeEnabled || !isPlaying || nextTrack.is_jingle || currentTrack?.is_jingle) {
      isCrossfadingRef.current = false;
      setCurrentIndex(nextIndex);
      setTimeout(() => saveStateToLocalStorage({ currentIndex: nextIndex, progress: 0 }), 50);
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

    // Filet de sécurité : garantit la fin de la transition même si requestAnimationFrame est interrompu
    setTimeout(() => {
      if (!isCrossfadingRef.current) return;
      isCrossfadingRef.current = false;
      if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio.volume = 1; }
      if (nextAudio) nextAudio.volume = 1;
      activePlayerRef.current = activePlayerRef.current === 'A' ? 'B' : 'A';
      setCurrentIndex(nextIndex);
      saveStateToLocalStorage({ currentIndex: nextIndex, progress: 0 });
    }, durationMs + 150);
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

  // 🎚️ Route les éléments audio A/B à travers le limiteur
  useEffect(() => {
    wireLimiter(audioARef.current, 'A');
    wireLimiter(audioBRef.current, 'B');
  }, [wireLimiter, currentTrack?.id, isLive, liveUrl]);

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
      // ✅ ON FORCE LE SAUT SEULEMENT QUAND LE FICHIER EST PRÊT
      if (pendingSeekRef.current !== null && pendingSeekRef.current > 0) {
        currentAudio.currentTime = pendingSeekRef.current;
        setProgress(pendingSeekRef.current);
        pendingSeekRef.current = null;
      }
      if (isPlaying) {
        resumeAudioCtx();
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

  // ✅ Applique le volume aux deux lecteurs audio
  useEffect(() => {
    if (audioARef.current) audioARef.current.volume = volume;
    if (audioBRef.current) audioBRef.current.volume = volume;
  }, [volume, currentTrack?.id]);

  // 🎵 Media Session API (contrôles sur écran verrouillé + lecture en arrière-plan)
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist || 'ELEKTRAQ Radio',
      album: 'ELEKTRAQ Radio',
      artwork: [{ src: currentTrack.cover_url || '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }]
    });
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    navigator.mediaSession.setActionHandler('play', () => { if (!isPlaying) togglePlay(); });
    navigator.mediaSession.setActionHandler('pause', () => { if (isPlaying) togglePlay(); });
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
    };
  }, [currentTrack, isPlaying]);

  // 📱 Reprend la lecture quand l'écran se déverrouille / l'onglet redevient visible (iOS)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const currentAudio = activePlayerRef.current === 'A' ? audioARef.current : audioBRef.current;
        if (currentAudio && currentAudio.paused && isPlaying) {
          currentAudio.play().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isPlaying]);

  return (
    <RadioContext.Provider value={{
      tracks, currentIndex, currentTrack, isPlaying, progress, duration,
      isLive, liveUrl, isRadioActive, needsGesture,
      startRadio, updateRadioSettings, togglePlay, playNext, playPrev, seek, stopRadio, unlockAudio,
      volume, setVolume
    }}>
      {children}
      {/* ✅ AJOUT DE LA CLÉ POUR FORCER LE CHANGEMENT D'ÉTAT AUDIO */}
      <audio key={`audio-A-${currentTrack?.id || 'empty'}`} ref={audioARef} preload="auto" playsInline onTimeUpdate={handleTimeUpdate} onEnded={isLive ? undefined : playNext} crossOrigin="anonymous" />
      <audio key={`audio-B-${currentTrack?.id || 'empty'}`} ref={audioBRef} preload="auto" playsInline onTimeUpdate={() => { if (activePlayerRef.current === 'B') { setProgress(audioBRef.current?.currentTime || 0); setDuration(audioBRef.current?.duration || 0); } }} onEnded={() => { if (activePlayerRef.current === 'B') playNext(); }} crossOrigin="anonymous" />
    </RadioContext.Provider>
  );
};

export const useRadio = () => {
  const context = useContext(RadioContext);
  if (!context) throw new Error('useRadio must be used within RadioProvider');
  return context;
};