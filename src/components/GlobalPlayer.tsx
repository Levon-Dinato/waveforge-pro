import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../contexts/PlayerContext';
import { useIsMobile } from '../hooks/useIsMobile';

const formatTime = (sec: number): string => {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
};

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
  const waveformRef = useRef<HTMLDivElement>(null);

  if (!currentTrack) return null;

  const progress = duration > 0 ? currentTime / duration : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(Math.max(0, Math.min(1, ratio)));
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isMobile ? 90 : 20,
        right: isMobile ? 12 : 20,
        left: isMobile ? 12 : 'auto',
        width: isMobile ? 'auto' : 400,
        maxWidth: 'calc(100vw - 40px)',
        background: 'rgba(10, 12, 20, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 217, 255, 0.35)',
        borderRadius: 14,
        padding: 12,
        zIndex: 9999,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.55), 0 0 30px rgba(0, 217, 255, 0.2)',
        fontFamily: 'monospace',
        color: '#fff',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Pochette cliquable */}
      <Link
        to={currentTrack.user_id ? `/profil/${currentTrack.user_id}` : '#'}
        style={{
          width: 52,
          height: 52,
          borderRadius: 8,
          flexShrink: 0,
          background: currentTrack.cover_url
            ? `url(${currentTrack.cover_url}) center/cover`
            : 'linear-gradient(135deg, #00d9ff, #7c5cff)',
          border: '1px solid rgba(0, 217, 255, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          fontSize: 20,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {!currentTrack.cover_url && '🎵'}
      </Link>

      {/* Infos + progression */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              color: '#fff',
            }}
          >
            {currentTrack.title}
          </span>
          <span
            style={{
              fontSize: '0.68rem',
              color: 'rgba(255,255,255,0.5)',
              flexShrink: 0,
            }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Barre de progression cliquable */}
        <div
          ref={waveformRef}
          onClick={handleSeekClick}
          style={{
            width: '100%',
            height: 5,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 3,
            position: 'relative',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #00d9ff, #0088ff)',
              boxShadow: '0 0 8px #00d9ff',
              transition: 'width 0.15s linear',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 3,
          }}
        >
          <span
            style={{
              fontSize: '0.65rem',
              color: 'rgba(255,255,255,0.5)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '60%',
            }}
          >
            {currentTrack.artist}
          </span>

          {/* Volume mini */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 50,
                accentColor: '#00d9ff',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      </div>

      {/* Boutons */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        <button
          onClick={togglePlay}
          title={isPlaying ? 'Pause' : 'Lecture'}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d9ff, #0088ff)',
            color: '#000',
            border: 'none',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(0, 217, 255, 0.55)',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          onClick={stop}
          title="Fermer le player"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(255, 60, 60, 0.12)',
            border: '1px solid rgba(255, 60, 60, 0.4)',
            color: '#ff5c5c',
            cursor: 'pointer',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};