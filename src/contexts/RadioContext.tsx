// src/contexts/RadioContext.tsx
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react'; // ✅ Type importé séparément pour éviter les erreurs TS
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
  startRadio: (newTracks: any[], live: boolean, url: string) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrev: () => void;
  seek: (time: number) => void;
  stopRadio: () => void;
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
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { stop: stopMainPlayer } = usePlayer(); // Pour couper le lecteur principal si besoin

  const currentTrack = tracks[currentIndex];

  const startRadio = (newTracks: any[], live: boolean, url: string) => {
    // Si c'est déjà la même radio qui joue, on ne reset pas
    if (isRadioActive && newTracks.length > 0 && tracks.length > 0 && newTracks[0].user_id === tracks[0].user_id) {
      if (live !== isLive || url !== liveUrl) {
        setIsLive(live);
        setLiveUrl(url);
      }
      return;
    }

    stopMainPlayer(); // On coupe la musique principale si elle jouait
    setTracks(newTracks);
    setCurrentIndex(0);
    setIsLive(live);
    setLiveUrl(url);
    setIsRadioActive(true);
    setIsPlaying(true);
    setProgress(0);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.error(e));
      setIsPlaying(true);
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Gestion automatique de la lecture quand l'index change
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Autoplay bloqué:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex, isLive, tracks]);

  return (
    <RadioContext.Provider value={{
      tracks, currentIndex, currentTrack, isPlaying, progress, duration,
      isLive, liveUrl, isRadioActive, startRadio, togglePlay, playNext, playPrev, seek, stopRadio
    }}>
      {children}
      <audio
        ref={audioRef}
        src={isLive ? liveUrl : (currentTrack?.audio_url || '')}
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