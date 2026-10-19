// src/components/GlobalPlayer.tsx
import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

const formatTime = (sec: number): string => {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
};

// ═══════════════════════════════════════════════════════════
// DOWNSAMPLE PEAKS
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// WAVEFORM DRAGGABLE
// ═══════════════════════════════════════════════════════════
interface WaveProgressProps {
  peaks: number[];
  progress: number;
  onSeek: (ratio: number) => void;
  height?: number;
  duration: number;
  compact?: boolean;
}

const WaveProgress: React.FC<WaveProgressProps> = ({
  peaks, progress, onSeek, height = 30, duration, compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayPeaks = downsamplePeaks(peaks, compact ? 60 : 100);

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

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const ratio = getRatio(touch.clientX);
    if (ratio === null) return;
    setIsDragging(true);
    onSeek(ratio);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const ratio = getRatio(touch.clientX);
    if (ratio !== null) onSeek(ratio);
  };

  const handleTouchEnd = () => setIsDragging(false);

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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: '100%',
        height,
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 1 : 1.5,
        padding: '2px 0',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
    >
      {displayPeaks.map((peak, i) => {
        const barRatio = i / displayPeaks.length;
        const isPlayed = barRatio <= progress;
        const isHovered = hoverRatio !== null && barRatio <= hoverRatio;
        const h = Math.max(2, (peak / 100) * height);

        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: h,
              borderRadius: 1.5,
              background: isPlayed
                ? 'linear-gradient(180deg, #00e5ff, #0088ff)'
                : isHovered
                ? 'rgba(0, 217, 255, 0.55)'
                : 'rgba(255, 255, 255, 0.18)',
              boxShadow: isPlayed ? '0 0 4px rgba(0, 217, 255, 0.6)' : 'none',
              transition: 'background 0.08s, box-shadow 0.08s',
            }}
          />
        );
      })}

      {progress > 0 && progress < 1 && !compact && (
        <div
          style={{
            position: 'absolute',
            left: `${progress * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 0 10px #00d9ff, 0 0 3px #fff',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}

      {hoverRatio !== null && duration > 0 && !compact && (
        <div
          style={{
            position: 'absolute',
            left: `${hoverRatio * 100}%`,
            bottom: height + 6,
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.92)',
            border: '1px solid rgba(0, 217, 255, 0.5)',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 9,
            fontFamily: 'monospace',
            color: '#00d9ff',
            fontWeight: 700,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: 3,
          }}
        >
          {formatTime(hoverRatio * duration)}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ÉGALISEUR ANIMÉ
// ═══════════════════════════════════════════════════════════
const EqualizerBars: React.FC<{ isPlaying: boolean; small?: boolean }> = ({ isPlaying, small }) => {
  const h = small ? 8 : 10;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 2,
        left: 3,
        right: 3,
        height: h,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 2,
        opacity: isPlaying ? 1 : 0,
        transition: 'opacity 0.3s',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: 2,
            background: '#fff',
            borderRadius: 1,
            boxShadow: '0 0 4px #00d9ff',
            animation: isPlaying
              ? `eqBar 0.8s ease-in-out infinite ${i * 0.15}s`
              : 'none',
            height: isPlaying ? undefined : 3,
          }}
        />
      ))}
      <style>{`
        @keyframes eqBar {
          0%, 100% { height: 3px; opacity: 0.7; }
          50% { height: ${small ? '7' : '9'}px; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════
export const GlobalPlayer: React.FC = () => {
  const {
    currentTrack, isPlaying, currentTime, duration, volume,
    togglePlay, stop, seek, setVolume,
  } = usePlayer();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [isHovered, setIsHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const titleRef = useRef<HTMLDivElement>(null);
  const [shouldMarquee, setShouldMarquee] = useState(false);

  useEffect(() => {
    if (titleRef.current) {
      const el = titleRef.current;
      setTimeout(() => setShouldMarquee(el.scrollWidth > el.clientWidth + 2), 50);
    }
  }, [currentTrack?.title]);

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

  const handleDownload = async () => {
    if (!currentTrack) return;

    if (!user) {
      if (window.confirm('Vous devez être connecté pour télécharger.\n\nSe connecter maintenant ?')) {
        navigate('/auth');
      }
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(currentTrack.audio_url);
      if (!response.ok) throw new Error('Impossible de récupérer le fichier');
      const blob = await response.blob();

      const safeTitle = currentTrack.title.replace(/[^a-zA-Z0-9._-]/g, '_');
      const safeArtist = currentTrack.artist.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${safeArtist}_-_${safeTitle}.mp3`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Erreur téléchargement:', err);
      alert('Erreur téléchargement : ' + (err.message || err));
    } finally {
      setIsDownloading(false);
    }
  };

  const volumeIcon = isMuted || volume === 0 ? '🔇' : volume < 0.4 ? '🔉' : '🔊';

  // ═══════════════════════════════════════════════════════════
  // MOBILE
  // ═══════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 78,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'linear-gradient(180deg, rgba(15, 18, 28, 0.98) 0%, rgba(10, 12, 20, 1) 100%)',
          borderTop: '1px solid rgba(0, 217, 255, 0.4)',
          borderBottom: '1px solid rgba(0, 217, 255, 0.15)',
          boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 217, 255, 0.15)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          fontFamily: 'monospace',
          color: '#fff',
          padding: '7px 10px 5px',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          animation: 'playerSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes playerSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <WaveProgress
          peaks={currentTrack.peaks || []}
          progress={progress}
          onSeek={seek}
          height={10}
          duration={duration}
          compact={true}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            to={currentTrack.user_id ? `/profil/${currentTrack.user_id}` : '#'}
            style={{
              width: 34,
              height: 34,
              borderRadius: 6,
              flexShrink: 0,
              position: 'relative',
              background: currentTrack.cover_url
                ? `url(${currentTrack.cover_url}) center/cover`
                : 'linear-gradient(135deg, #00d9ff, #7c5cff)',
              border: '1px solid rgba(0, 217, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              fontSize: 13,
              overflow: 'hidden',
              boxShadow: isPlaying ? '0 0 10px rgba(0, 217, 255, 0.5)' : 'none',
            }}
          >
            {!currentTrack.cover_url && '🎵'}
            <EqualizerBars isPlaying={isPlaying} small />
          </Link>

          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginBottom: 1,
              }}
            >
              {currentTrack.title}
            </div>
            <div
              style={{
                fontSize: '0.6rem',
                color: 'rgba(255,255,255,0.55)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentTrack.artist} · {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: user ? 'rgba(0, 217, 255, 0.15)' : 'rgba(255,255,255,0.05)',
              border: user ? '1px solid rgba(0, 217, 255, 0.4)' : '1px solid rgba(255,255,255,0.15)',
              color: user ? '#00d9ff' : 'rgba(255,255,255,0.4)',
              fontSize: 11,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isDownloading ? 'wait' : 'pointer',
            }}
            title={user ? 'Télécharger' : 'Connectez-vous'}
          >
            {isDownloading ? '...' : user ? '⬇' : '🔒'}
          </button>

          <button
            onClick={togglePlay}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
              color: '#000',
              border: 'none',
              fontSize: 12,
              fontWeight: 900,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isPlaying ? '0 0 12px rgba(0, 217, 255, 0.7)' : '0 0 8px rgba(0, 217, 255, 0.5)',
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={stop}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'rgba(255, 60, 60, 0.1)',
              border: '1px solid rgba(255, 60, 60, 0.3)',
              color: '#ff5c5c',
              fontSize: 9,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // DESKTOP — BARRE DE TÂCHE COMPACTE (64px)
  // ═══════════════════════════════════════════════════════════
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        zIndex: 9999,
        background: 'linear-gradient(180deg, rgba(15, 18, 28, 0.97) 0%, rgba(10, 12, 20, 0.99) 100%)',
        borderTop: `1px solid ${isHovered ? 'rgba(0, 217, 255, 0.6)' : 'rgba(0, 217, 255, 0.35)'}`,
        boxShadow: isHovered
          ? '0 -12px 50px rgba(0, 0, 0, 0.7), 0 0 40px rgba(0, 217, 255, 0.2)'
          : '0 -8px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(0, 217, 255, 0.12)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        transition: 'all 0.25s ease',
        display: 'grid',
        gridTemplateColumns: '1fr 2fr 1fr',
        alignItems: 'center',
        padding: '0 18px',
        gap: 18,
        fontFamily: 'monospace',
        color: '#fff',
        animation: 'playerSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes playerSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes marqueeScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .player-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }
        .player-btn:hover { transform: scale(1.1); }
        .player-btn:active { transform: scale(0.95); }
      `}</style>

      {/* ═══ GAUCHE : Pochette + Titre + Artiste ═══ */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
        <Link
          to={currentTrack.user_id ? `/profil/${currentTrack.user_id}` : '#'}
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            flexShrink: 0,
            position: 'relative',
            background: currentTrack.cover_url
              ? `url(${currentTrack.cover_url}) center/cover`
              : 'linear-gradient(135deg, #00d9ff, #7c5cff)',
            border: '1px solid rgba(0, 217, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            fontSize: 18,
            overflow: 'hidden',
            boxShadow: isPlaying
              ? '0 0 20px rgba(0, 217, 255, 0.55), inset 0 0 10px rgba(255,255,255,0.15)'
              : '0 0 12px rgba(0, 217, 255, 0.25)',
            transition: 'transform 0.25s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {!currentTrack.cover_url && '🎵'}
          <EqualizerBars isPlaying={isPlaying} />
        </Link>

        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div
            style={{
              fontSize: 8,
              color: 'rgba(0, 217, 255, 0.7)',
              fontWeight: 800,
              letterSpacing: '1.5px',
              marginBottom: 2,
            }}
          >
            {isPlaying ? '▶ EN LECTURE' : '⏸ EN PAUSE'}
          </div>

          <div style={{ overflow: 'hidden', marginBottom: 2 }}>
            <div
              ref={titleRef}
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: shouldMarquee ? 'clip' : 'ellipsis',
                animation: shouldMarquee ? 'marqueeScroll 14s linear infinite' : 'none',
                display: shouldMarquee ? 'inline-block' : 'block',
                paddingRight: shouldMarquee ? 40 : 0,
              }}
            >
              {shouldMarquee
                ? `${currentTrack.title}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${currentTrack.title}`
                : currentTrack.title}
            </div>
          </div>

          <Link
            to={currentTrack.user_id ? `/profil/${currentTrack.user_id}` : '#'}
            style={{
              fontSize: '0.65rem',
              color: 'rgba(255,255,255,0.6)',
              textDecoration: 'none',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#00d9ff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            🎧 {currentTrack.artist}
          </Link>
        </div>
      </div>

      {/* ═══ CENTRE : Waveform + Contrôles ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <button
          className="player-btn"
          onClick={togglePlay}
          title={isPlaying ? 'Pause' : 'Lecture'}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
            color: '#000',
            border: 'none',
            fontSize: 14,
            fontWeight: 900,
            flexShrink: 0,
            boxShadow: isPlaying
              ? '0 0 20px rgba(0, 217, 255, 0.8), inset 0 0 10px rgba(255,255,255,0.4)'
              : '0 0 14px rgba(0, 217, 255, 0.5), inset 0 0 6px rgba(255,255,255,0.2)',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 9,
                color: '#00d9ff',
                fontWeight: 700,
                fontFamily: 'monospace',
                width: 32,
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {formatTime(currentTime)}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <WaveProgress
                peaks={currentTrack.peaks || []}
                progress={progress}
                onSeek={seek}
                height={18}
                duration={duration}
              />
            </div>

            <span
              style={{
                fontSize: 9,
                color: 'rgba(255,255,255,0.55)',
                fontWeight: 600,
                fontFamily: 'monospace',
                width: 32,
                flexShrink: 0,
              }}
            >
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ DROITE : Volume + Download + Fermer ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
          <button
            className="player-btn"
            onClick={handleVolumeToggle}
            title={isMuted ? 'Activer le son' : 'Couper le son'}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13,
              padding: 0,
              width: 20,
            }}
          >
            {volumeIcon}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (v > 0) setIsMuted(false);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              accentColor: '#00d9ff',
              cursor: 'pointer',
              height: 4,
            }}
          />
        </div>

        <button
          className="player-btn"
          onClick={handleDownload}
          disabled={isDownloading}
          title={user ? 'Télécharger ce morceau' : 'Connectez-vous pour télécharger'}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: user
              ? 'linear-gradient(135deg, #00d9ff, #0088ff)'
              : 'rgba(255,255,255,0.05)',
            border: user ? 'none' : '1px solid rgba(255,255,255,0.15)',
            color: user ? '#000' : 'rgba(255,255,255,0.5)',
            fontSize: 10,
            fontWeight: 800,
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
            cursor: isDownloading ? 'wait' : 'pointer',
            boxShadow: user ? '0 2px 10px rgba(0, 217, 255, 0.3)' : 'none',
            letterSpacing: '0.5px',
          }}
        >
          {isDownloading ? (
            '...'
          ) : user ? (
            <>
              <span style={{ fontSize: 12 }}>⬇</span>
              DL
            </>
          ) : (
            <>
              <span style={{ fontSize: 12 }}>🔒</span>
              LOGIN
            </>
          )}
        </button>

        <button
          className="player-btn"
          onClick={stop}
          title="Fermer le player"
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'rgba(255, 60, 60, 0.08)',
            border: '1px solid rgba(255, 60, 60, 0.3)',
            color: '#ff5c5c',
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};