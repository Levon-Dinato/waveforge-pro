// src/contexts/RadioContext.tsx
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
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
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSeekRef = useRef<number | null>(null); // ✅ Stocke la seconde où on doit aller
  const { stop: stopMainPlayer } = usePlayer();

  const currentTrack = tracks[currentIndex];

  const startRadio = (newTracks: any[], live: boolean, url: string, startIndex: number = 0, startTime?: number) => {
    if (isRadioActive && newTracks.length > 0 && tracks.length > 0 && newTracks[0].user_id === tracks[0].user_id) {
      if (live !== isLive || url !== liveUrl) {
        setIsLive(live);
        setLiveUrl(url);
      }
      return;
    }

    stopMainPlayer();
    setTracks(newTracks);
    setCurrentIndex(startIndex);
    setIsLive(live);
    setLiveUrl(url);
    setIsRadioActive(true);
    setIsPlaying(true);
    setProgress(0);
    setNeedsGesture(false);
    
    // ✅ On enregistre la seconde à laquelle on doit démarrer
    if (startTime !== undefined && startTime > 0) {
      pendingSeekRef.current = startTime;
    } else {
      pendingSeekRef.current = null;
    }
  };

  const unlockAudio = () => {
    setNeedsGesture(false);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.play().catch(e => {
         // Si ça bloque encore, on redemande l'interaction
         if (e.name === 'NotAllowedError') setNeedsGesture(true);
      });
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => {
         if (e.name === 'NotAllowedError') setNeedsGesture(true);
      });
      setIsPlaying(true);
      setNeedsGesture(false);
    }
  };

  const playNext = () => {
    if (isLive || tracks.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
  };

  const playPrev = () => {
    if (isLive || tracks.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  const seek = (time: number) => {
    if (audioRef.current && !isLive) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const stopRadio = () => {
    setIsPlaying(false);
    setIsRadioActive(false);
    setNeedsGesture(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            if (e.name === 'NotAllowedError') {
              setNeedsGesture(true);
              setIsPlaying(false);
            }
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex, isLive, tracks, currentTrack?.audio_url]);

  return (
    <RadioContext.Provider value={{
      tracks, currentIndex, currentTrack, isPlaying, progress, duration,
      isLive, liveUrl, isRadioActive, needsGesture,
      startRadio, togglePlay, playNext, playPrev, seek, stopRadio, unlockAudio
    }}>
      {children}
      <audio
        ref={audioRef}
        src={isLive ? liveUrl : (currentTrack?.audio_url || '')}
        preload="auto"
        onLoadedMetadata={() => {
          // ✅ Quand l'audio est prêt, on saute à la bonne seconde
          if (pendingSeekRef.current !== null && audioRef.current) {
            audioRef.current.currentTime = pendingSeekRef.current;
            setProgress(pendingSeekRef.current);
            pendingSeekRef.current = null;
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
          }
        }}
        onEnded={isLive ? undefined : playNext}
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