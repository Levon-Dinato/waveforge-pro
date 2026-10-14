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
        const h = Math.max(3, (peak / 100) * height);

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
              boxShadow: isPlayed
                ? '0 0 4px rgba(0, 217, 255, 0.6)'
                : 'none',
              transition: 'background 0.08s, box-shadow 0.08s',
            }}
          />
        );
      })}

      {/* Curseur point */}
      {progress > 0 && progress < 1 && !compact && (
        <div
          style={{
            position: 'absolute',
            left: `${progress * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 0 10px #00d9ff, 0 0 3px #fff',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}

      {/* Tooltip hover */}
      {hoverRatio !== null && duration > 0 && !compact && (
        <div
          style={{
            position: 'absolute',
            left: `${hoverRatio * 100}%`,
            bottom: height + 8,
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
  const h = small ? 10 : 14;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 3,
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
          50% { height: ${small ? '9' : '13'}px; opacity: 1; }
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
  const isMobile = useIsMobile(768);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [isHovered, setIsHovered] = useState(false);

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

  const volumeIcon = isMuted || volume === 0 ? '🔇' : volume < 0.4 ? '🔉' : '🔊';

  // ═══════════════════════════════════════════════════════════
  // MOBILE — BARRE COMPACTE AU-DESSUS DE LA NAV
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
          padding: '8px 10px 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          animation: 'playerSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes playerSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes marqueeScrollMobile {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>

        {/* Waveform fine */}
        <WaveProgress
          peaks={currentTrack.peaks || []}
          progress={progress}
          onSeek={seek}
          height={12}
          duration={duration}
          compact={true}
        />

        {/* Ligne compacte */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            to={currentTrack.user_id ? `/profil/${currentTrack.user_id}` : '#'}
            style={{
              width: 36,
              height: 36,
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
              fontSize: 14,
              overflow: 'hidden',
              boxShadow: isPlaying ? '0 0 12px rgba(0, 217, 255, 0.5)' : 'none',
            }}
          >
            {!currentTrack.cover_url && '🎵'}
            <EqualizerBars isPlaying={isPlaying} small />
          </Link>

          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '0.76rem',
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
                fontSize: '0.62rem',
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
            onClick={togglePlay}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
              color: '#000',
              border: 'none',
              fontSize: 13,
              fontWeight: 900,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isPlaying ? '0 0 14px rgba(0, 217, 255, 0.7)' : '0 0 10px rgba(0, 217, 255, 0.5)',
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={stop}
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'rgba(255, 60, 60, 0.1)',
              border: '1px solid rgba(255, 60, 60, 0.3)',
              color: '#ff5c5c',
              fontSize: 10,
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
  // DESKTOP — BARRE DE TÂCHE PLEINE LARGEUR (style Spotify)
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
        height: 84,
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
        padding: '0 24px',
        gap: 24,
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
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 217, 255, 0.5), inset 0 0 12px rgba(255,255,255,0.15); }
          50% { box-shadow: 0 0 32px rgba(0, 217, 255, 0.8), inset 0 0 16px rgba(255,255,255,0.25); }
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
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
        <Link
          to={currentTrack.user_id ? `/profil/${currentTrack.user_id}` : '#'}
          style={{
            width: 56,
            height: 56,
            borderRadius: 10,
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
            fontSize: 22,
            overflow: 'hidden',
            boxShadow: isPlaying
              ? '0 0 24px rgba(0, 217, 255, 0.55), inset 0 0 12px rgba(255,255,255,0.15)'
              : '0 0 14px rgba(0, 217, 255, 0.25)',
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
              fontSize: 9,
              color: 'rgba(0, 217, 255, 0.7)',
              fontWeight: 800,
              letterSpacing: '1.5px',
              marginBottom: 3,
            }}
          >
            {isPlaying ? '▶ EN LECTURE' : '⏸ EN PAUSE'}
          </div>

          <div style={{ overflow: 'hidden', marginBottom: 3 }}>
            <div
              ref={titleRef}
              style={{
                fontSize: '0.85rem',
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
              fontSize: '0.7rem',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        {/* Play/Pause */}
        <button
          className="player-btn"
          onClick={togglePlay}
          title={isPlaying ? 'Pause' : 'Lecture'}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
            color: '#000',
            border: 'none',
            fontSize: 16,
            fontWeight: 900,
            flexShrink: 0,
            boxShadow: isPlaying
              ? '0 0 24px rgba(0, 217, 255, 0.8), inset 0 0 12px rgba(255,255,255,0.4)'
              : '0 0 16px rgba(0, 217, 255, 0.5), inset 0 0 8px rgba(255,255,255,0.2)',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Waveform + temps */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 10,
                color: '#00d9ff',
                fontWeight: 700,
                fontFamily: 'monospace',
                width: 36,
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
                height={28}
                duration={duration}
              />
            </div>

            <span
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.55)',
                fontWeight: 600,
                fontFamily: 'monospace',
                width: 36,
                flexShrink: 0,
              }}
            >
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ DROITE : Volume + Fermer ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
          <button
            className="player-btn"
            onClick={handleVolumeToggle}
            title={isMuted ? 'Activer le son' : 'Couper le son'}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 15,
              padding: 0,
              width: 22,
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

        {/* Fermer */}
        <button
          className="player-btn"
          onClick={stop}
          title="Fermer le player"
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'rgba(255, 60, 60, 0.08)',
            border: '1px solid rgba(255, 60, 60, 0.3)',
            color: '#ff5c5c',
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};