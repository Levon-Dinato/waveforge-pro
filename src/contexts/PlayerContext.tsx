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
  player_bg_image_url?: string | null;
  player_bg_color?: string | null;
}

interface PlayerContextValue {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  hasNext: boolean;
  hasPrevious: boolean;
  play: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
  togglePlay: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
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

  // File d'attente (queue)
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const queueRef = useRef<PlayerTrack[]>([]);
  const indexRef = useRef(-1);
  const volumeRef = useRef(0.8);

  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // ✅ AJOUT : MEDIA SESSION API (Contrôles sur écran verrouillé / TV)
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: 'ELEKTRAQ',
      artwork: [
        {
          src: currentTrack.cover_url || `${window.location.origin}/og-image.jpg`,
          sizes: '512x512',
          type: 'image/jpeg'
        }
      ]
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    navigator.mediaSession.setActionHandler('play', () => { if (!isPlaying) togglePlay(); });
    navigator.mediaSession.setActionHandler('pause', () => { if (isPlaying) togglePlay(); });
    navigator.mediaSession.setActionHandler('seekbackward', () => { if (duration > 0) seek(Math.max(0, (currentTime - 10) / duration)); });
    navigator.mediaSession.setActionHandler('seekforward', () => { if (duration > 0) seek(Math.min(1, (currentTime + 10) / duration)); });
    navigator.mediaSession.setActionHandler('seekto', (details) => { if (details.seekTime && duration > 0) seek(details.seekTime / duration); });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [currentTrack, isPlaying, currentTime, duration]);

  // Démarre la lecture d'une piste (crée un nouvel élément audio)
  const startAudio = (track: PlayerTrack) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(track.audio_url);
    audio.volume = volumeRef.current;
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
      const q = queueRef.current;
      const idx = indexRef.current;
      if (idx >= 0 && idx < q.length - 1) {
        const nextTrack = q[idx + 1];
        indexRef.current = idx + 1;
        setCurrentIndex(idx + 1);
        startAudio(nextTrack);
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    });

    audio.play().catch((e) => {
      console.error('Erreur de lecture (navigateur bloque ?):', e);
      setIsPlaying(false);
    });
  };

  const play = (track: PlayerTrack, newQueue?: PlayerTrack[]) => {
    // Même piste : bascule lecture/pause
    if (currentTrack?.id === track.id && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch((e) => console.error('Lecture bloquée:', e));
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    if (newQueue && newQueue.length > 0) {
      const idx = newQueue.findIndex((t) => t.id === track.id);
      queueRef.current = newQueue;
      indexRef.current = idx;
      setQueue(newQueue);
      setCurrentIndex(idx);
    } else {
      queueRef.current = [];
      indexRef.current = -1;
      setQueue([]);
      setCurrentIndex(-1);
    }

    startAudio(track);
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
    queueRef.current = [];
    indexRef.current = -1;
    setQueue([]);
    setCurrentIndex(-1);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
  };

  const next = () => {
    const q = queueRef.current;
    const idx = indexRef.current;
    if (idx >= 0 && idx < q.length - 1) {
      const nextTrack = q[idx + 1];
      indexRef.current = idx + 1;
      setCurrentIndex(idx + 1);
      startAudio(nextTrack);
    }
  };

  const previous = () => {
    const q = queueRef.current;
    const idx = indexRef.current;
    if (idx > 0) {
      const prevTrack = q[idx - 1];
      indexRef.current = idx - 1;
      setCurrentIndex(idx - 1);
      startAudio(prevTrack);
    }
  };

  const seek = (ratio: number) => {
    if (audioRef.current && duration > 0) {
      const t = ratio * duration;
      audioRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const setVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    volumeRef.current = clamped;
    if (audioRef.current) audioRef.current.volume = clamped;
  };

  const isCurrentTrack = (id: string) => currentTrack?.id === id;

  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;
  const hasPrevious = currentIndex > 0;

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        hasNext,
        hasPrevious,
        play,
        togglePlay,
        stop,
        next,
        previous,
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
