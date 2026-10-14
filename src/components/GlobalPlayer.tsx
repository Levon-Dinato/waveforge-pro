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
// WAVEFORM PROGRESS BAR
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

  // Moins de barres en compact
  const displayPeaks = downsamplePeaks(peaks, compact ? 44 : 68);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, ratio)));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || compact) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setHoverRatio(Math.max(0, Math.min(1, ratio)));
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverRatio(null)}
      style={{
        width: '100%',
        height,
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 1 : 2,
        padding: '2px 0',
      }}
    >
      {displayPeaks.map((peak, i) => {
        const barRatio = i / displayPeaks.length;
        const isPlayed = barRatio <= progress;
        const isHovered = hoverRatio !== null && barRatio <= hoverRatio;
        const h = Math.max(3, (peak / 100) * height);
        const isTall = h > height * 0.7;

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
                ? isTall
                  ? '0 0 6px rgba(0, 217, 255, 0.9), 0 0 12px rgba(0, 217, 255, 0.4)'
                  : '0 0 3px rgba(0, 217, 255, 0.6)'
                : 'none',
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
            top: -1,
            bottom: -1,
            width: 2,
            background: '#fff',
            boxShadow: '0 0 10px #00d9ff, 0 0 5px #fff',
            borderRadius: 2,
            transform: 'translateX(-1px)',
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
const EqualizerBars: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 3,
        left: 3,
        right: 3,
        height: 14,
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
          50% { height: 13px; opacity: 1; }
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
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlay,
    stop,
    seek,
    setVolume,
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
      setTimeout(() => {
        setShouldMarquee(el.scrollWidth > el.clientWidth + 2);
      }, 50);
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
  // VERSION MOBILE — BARRE COMPACTE (style Spotify)
  // ═══════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 78, // juste au-dessus de la nav bottom (80px de haut)
          left: 8,
          right: 8,
          zIndex: 9999,
          background: 'linear-gradient(135deg, rgba(15, 18, 28, 0.98) 0%, rgba(10, 12, 20, 0.99) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(0, 217, 255, 0.35)',
          borderRadius: 12,
          padding: '8px 10px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(0, 217, 255, 0.25)',
          fontFamily: 'monospace',
          color: '#fff',
          animation: 'playerSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
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

        {/* Ligne 1 : Waveform fine + progression */}
        <div style={{ marginBottom: 2 }}>
          <WaveProgress
            peaks={currentTrack.peaks || []}
            progress={progress}
            onSeek={seek}
            height={14}
            duration={duration}
            compact={true}
          />
        </div>

        {/* Ligne 2 : Pochette + Titre + Play + Fermer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Pochette */}
          <Link
            to={currentTrack.user_id ? `/profil/${currentTrack.user_id}` : '#'}
            style={{
              width: 38,
              height: 38,
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
              boxShadow: isPlaying
                ? '0 0 12px rgba(0, 217, 255, 0.5)'
                : 'none',
            }}
          >
            {!currentTrack.cover_url && '🎵'}
            <EqualizerBars isPlaying={isPlaying} />
          </Link>

          {/* Titre + Artiste */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div
              style={{
                overflow: 'hidden',
                marginBottom: 1,
                position: 'relative',
              }}
            >
              <div
                ref={titleRef}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: shouldMarquee ? 'clip' : 'ellipsis',
                  animation: shouldMarquee
                    ? 'marqueeScrollMobile 14s linear infinite'
                    : 'none',
                  display: shouldMarquee ? 'inline-block' : 'block',
                  paddingRight: shouldMarquee ? 40 : 0,
                }}
              >
                {shouldMarquee
                  ? `${currentTrack.title}\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0${currentTrack.title}`
                  : currentTrack.title}
              </div>
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.55)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentTrack.artist} · {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Bouton Play/Pause compact */}
          <button
            onClick={togglePlay}
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isPlaying
                ? '0 0 16px rgba(0, 217, 255, 0.7)'
                : '0 0 10px rgba(0, 217, 255, 0.5)',
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          {/* Bouton Fermer */}
          <button
            onClick={stop}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(255, 60, 60, 0.1)',
              border: '1px solid rgba(255, 60, 60, 0.3)',
              color: '#ff5c5c',
              fontSize: 11,
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
  // VERSION DESKTOP — LE GROS PLAYER PREMIUM
  // ═══════════════════════════════════════════════════════════
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 440,
        maxWidth: 'calc(100vw - 40px)',
        background: 'linear-gradient(135deg, rgba(15, 18, 28, 0.96) 0%, rgba(10, 12, 20, 0.98) 100%)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: `1px solid ${isHovered ? 'rgba(0, 217, 255, 0.55)' : 'rgba(0, 217, 255, 0.28)'}`,
        borderRadius: 18,
        padding: 14,
        zIndex: 9999,
        boxShadow: isHovered
          ? '0 24px 70px rgba(0, 0, 0, 0.7), 0 0 40px rgba(0, 217, 255, 0.35), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 25px rgba(0, 217, 255, 0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
        fontFamily: 'monospace',
        color: '#fff',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        animation: 'playerSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <style>{`
        @keyframes playerSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
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

      {/* HAUT : Pochette + Titre + Artiste + Fermer */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
              ? '0 0 20px rgba(0, 217, 255, 0.5), inset 0 0 12px rgba(255,255,255,0.15)'
              : '0 0 12px rgba(0, 217, 255, 0.2)',
            transition: 'transform 0.25s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {!currentTrack.cover_url && '🎵'}
          <EqualizerBars isPlaying={isPlaying} />
        </Link>

        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{
            fontSize: 9, color: 'rgba(0, 217, 255, 0.6)',
            fontWeight: 800, letterSpacing: '1.5px', marginBottom: 3,
          }}>
            {isPlaying ? '▶ EN LECTURE' : '⏸ EN PAUSE'}
          </div>
          <div style={{ overflow: 'hidden', marginBottom: 3, position: 'relative' }}>
            <div
              ref={titleRef}
              style={{
                fontSize: '0.85rem', fontWeight: 700, color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden',
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
              fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)',
              textDecoration: 'none', display: 'block',
              overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#00d9ff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            🎧 {currentTrack.artist}
          </Link>
        </div>

        <button
          className="player-btn"
          onClick={stop}
          title="Fermer le player"
          style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(255, 60, 60, 0.08)',
            border: '1px solid rgba(255, 60, 60, 0.3)',
            color: '#ff5c5c', fontSize: 11, flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* MILIEU : Waveform + Temps */}
      <div>
        <WaveProgress
          peaks={currentTrack.peaks || []}
          progress={progress}
          onSeek={seek}
          height={30}
          duration={duration}
          compact={false}
        />
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: 'rgba(255,255,255,0.55)',
          marginTop: 4, fontWeight: 600,
        }}>
          <span style={{ color: '#00d9ff' }}>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* BAS : Volume + Play/Pause */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto', width: 90 }}>
          <button
            className="player-btn"
            onClick={handleVolumeToggle}
            title={isMuted ? 'Activer le son' : 'Couper le son'}
            style={{
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 14, padding: 0, width: 20,
            }}
          >
            {volumeIcon}
          </button>
          <input
            type="range" min="0" max="1" step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (v > 0) setIsMuted(false);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{ flex: 1, accentColor: '#00d9ff', cursor: 'pointer', height: 4 }}
          />
        </div>

        <button
          className="player-btn"
          onClick={togglePlay}
          title={isPlaying ? 'Pause' : 'Lecture'}
          style={{
            width: 46, height: 46, borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
            color: '#000', border: 'none', fontSize: 17, fontWeight: 900,
            flexShrink: 0,
            boxShadow: isPlaying
              ? '0 0 24px rgba(0, 217, 255, 0.8), inset 0 0 12px rgba(255,255,255,0.4)'
              : '0 0 16px rgba(0, 217, 255, 0.5), inset 0 0 8px rgba(255,255,255,0.2)',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={{ width: 90 }} />
      </div>
    </div>
  );
};