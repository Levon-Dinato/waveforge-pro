// src/contexts/PlayerContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  cover_url: string | null;
  user_id: string | null;
  duration?: number;
  peaks?: number[];
  bpm?: number | null;
  song_key?: string | null;
  genre?: string | null;
}

interface PlayerContextValue {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  play: (track: PlayerTrack) => void;
  togglePlay: () => void;
  stop: () => void;
  seek: (ratio: number) => void;
  setVolume: (v: number) => void;
  isCurrentTrack: (id: string) => boolean;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const play = (track: PlayerTrack) => {
    // Si c'est le même morceau, on toggle Play/Pause
    if (currentTrack?.id === track.id && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch((e) => console.error("Lecture bloquée:", e));
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    // Si c'est un nouveau morceau, on arrête l'ancien
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Création de l'élément audio
    const audio = new Audio(track.audio_url);
    audio.volume = volume;
    audioRef.current = audio;
    
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(track.duration || 0);

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration || 0);
    });
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    // Tentative de lecture
    audio.play().catch((e) => {
      console.error('Erreur de lecture (navigateur bloque ?):', e);
      setIsPlaying(false);
    });
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch((e) => console.error(e));
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const seek = (ratio: number) => {
    if (audioRef.current && duration > 0) {
      const t = ratio * duration;
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const setVolume = (v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const isCurrentTrack = (id: string) => currentTrack?.id === id;

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        play,
        togglePlay,
        stop,
        seek,
        setVolume,
        isCurrentTrack,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = (): PlayerContextValue => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer doit être utilisé dans PlayerProvider');
  return ctx;
};