// src/components/GlobalPlayer.tsx
import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../contexts/PlayerContext';
import { useIsMobile } from '../hooks/useIsMobile';

const formatTime = (sec: number): string => {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
};

const downsamplePeaks = (peaks: number[], targetCount: number): number[] => {
  if (!peaks || peaks.length === 0) {
    return Array.from({ length: targetCount }, (_, i) => {
      const wave = Math.sin(i / 4) * 0.4 + Math.sin(i / 9) * 0.3 + 0.5;
      return Math.round(Math.max(0.15, Math.min(1, wave)) * 100);
    });
  }
  if (peaks.length <= targetCount) return peaks;
  const step = peaks.length / targetCount;
  const result: number[] = [];
  for (let i = 0; i < targetCount; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    let max = 0;
    for (let j = start; j < end && j < peaks.length; j++) {
      if (peaks[j] > max) max = peaks[j];
    }
    result.push(max);
  }
  return result;
};

interface WaveProgressProps {
  peaks: number[];
  progress: number;
  onSeek: (ratio: number) => void;
  height?: number;
  compact?: boolean;
}

const WaveProgress: React.FC<WaveProgressProps> = ({
  peaks, progress, onSeek, height = 30, compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setHoverRatio] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayPeaks = downsamplePeaks(peaks, compact ? 80 : 120);

  const getRatio = (clientX: number): number | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const ratio = getRatio(e.clientX);
    if (ratio === null) return;
    setIsDragging(true);
    onSeek(ratio);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const ratio = getRatio(e.clientX);
    if (ratio === null) return;
    setHoverRatio(ratio);
    if (isDragging) onSeek(ratio);
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const handler = () => setIsDragging(false);
    window.addEventListener('mouseup', handler);
    return () => window.removeEventListener('mouseup', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setHoverRatio(null); setIsDragging(false); }}
      style={{
        width: '100%',
        height,
        cursor: isDragging ? 'grabbing' : 'pointer',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        userSelect: 'none',
      }}
    >
      {displayPeaks.map((peak, i) => {
        const barRatio = i / displayPeaks.length;
        const isPlayed = barRatio <= progress;
        const h = Math.max(2, (peak / 100) * height);

        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: h,
              borderRadius: 1,
              background: isPlayed ? '#00d9ff' : 'rgba(255, 255, 255, 0.15)',
              transition: 'background 0.05s',
            }}
          />
        );
      })}
    </div>
  );
};

export const GlobalPlayer: React.FC = () => {
  const {
    currentTrack, isPlaying, currentTime, duration, volume,
    togglePlay, stop, seek, setVolume,
  } = usePlayer();
  const isMobile = useIsMobile(768);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);

  if (!currentTrack) return null;

  const progress = duration > 0 ? currentTime / duration : 0;

  const handleVolumeToggle = () => {
    if (isMuted) {
      setVolume(prevVolume || 0.8);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const volumeIcon = isMuted || volume === 0 ? '🔇' : volume < 0.4 ? '🔉' : '🔊';

  // ═══════════════════════════════════════════════════════════
  // MOBILE
  // ═══════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div style={{
        position: 'fixed', bottom: 78, left: 0, right: 0, zIndex: 9999,
        background: '#0f0f0f', borderTop: '1px solid #2a2a2a',
        padding: '8px 12px 10px', display: 'flex', flexDirection: 'column', gap: 6,
        fontFamily: 'Inter, sans-serif', color: '#fff',
      }}>
        <WaveProgress peaks={currentTrack.peaks || []} progress={progress} onSeek={seek} height={10} compact={true} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to={currentTrack.user_id ? `/profil/${currentTrack.user_id}` : '#'} style={{
            width: 40, height: 40, borderRadius: 4, flexShrink: 0,
            background: currentTrack.cover_url ? `url(${currentTrack.cover_url}) center/cover` : '#1a1a1a',
            border: '1px solid #2a2a2a',
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack.title}
            </div>
            <div style={{ fontSize: 11, color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack.artist}
            </div>
          </div>
          <button onClick={togglePlay} style={{ width: 36, height: 36, borderRadius: '50%', background: '#00d9ff', color: '#000', border: 'none', fontSize: 14, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={stop} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // DESKTOP
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 72, zIndex: 9999,
      background: '#0f0f0f', borderTop: '1px solid #2a2a2a',
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: 20,
      fontFamily: 'Inter, sans-serif', color: '#fff',
    }}>
      {/* GAUCHE : Pochette + Titre + Artiste */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 280, flexShrink: 0 }}>
        <Link
          to={currentTrack.user_id ? `/profil/${currentTrack.user_id}` : '#'}
          style={{
            width: 48, height: 48, borderRadius: 4, flexShrink: 0,
            background: currentTrack.cover_url ? `url(${currentTrack.cover_url}) center/cover` : '#1a1a1a',
            border: '1px solid #2a2a2a', textDecoration: 'none', position: 'relative',
          }}
        >
          {!currentTrack.cover_url && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 20 }}>🎵</div>}
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
            {currentTrack.title}
          </div>
          <Link to={currentTrack.user_id ? `/profil/${currentTrack.user_id}` : '#'} style={{ fontSize: 12, color: '#999', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack.artist}
          </Link>
        </div>
      </div>

      {/* CENTRE : Contrôles + Waveform */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={togglePlay} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#fff', color: '#000', border: 'none',
          fontSize: 14, fontWeight: 900, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#666', width: 35, textAlign: 'right' }}>{formatTime(currentTime)}</span>
          <div style={{ flex: 1 }}>
            <WaveProgress peaks={currentTrack.peaks || []} progress={progress} onSeek={seek} height={20} />
          </div>
          <span style={{ fontSize: 11, color: '#666', width: 35 }}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* DROITE : Volume + Fermer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={handleVolumeToggle} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: 14, cursor: 'pointer' }}>
            {volumeIcon}
          </button>
          <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (v > 0) setIsMuted(false); }} style={{ width: 60, accentColor: '#00d9ff', cursor: 'pointer' }} />
        </div>

        <button onClick={stop} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: 16, cursor: 'pointer' }}>
          ✕
        </button>
      </div>
    </div>
  );
};