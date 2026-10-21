// src/components/GlobalPlayer.tsx
import React, { useRef, useEffect } from 'react';
import { usePlayer } from '../contexts/PlayerContext';

export const GlobalPlayer: React.FC = () => {
  const { 
    currentTrack, 
    isPlaying, 
    togglePlay, 
    currentTime, 
    duration, 
    volume, 
    setVolume, 
    seek, 
    stop 
  } = usePlayer();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Formater le temps (ex: 02:34)
  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Dessin de la waveform basée sur les "peaks"
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentTrack) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Si pas de peaks, on génère une ligne plate par défaut
    const peaks = currentTrack.peaks && currentTrack.peaks.length > 0 
      ? currentTrack.peaks 
      : Array(100).fill(20); 

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / peaks.length;
    const progressRatio = duration > 0 ? currentTime / duration : 0;

    ctx.clearRect(0, 0, width, height);

    peaks.forEach((peak, i) => {
      const barHeight = Math.max(2, (peak / 100) * height);
      const x = i * barWidth;
      const y = (height - barHeight) / 2; // Centré verticalement

      // Couleur : Cyan si joué, Gris si à venir
      if (i / peaks.length < progressRatio) {
        ctx.fillStyle = '#00d9ff'; // --accent-primary
      } else {
        ctx.fillStyle = '#333333';
      }
      
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(1, barWidth - 1), barHeight, 2);
      ctx.fill();
    });
  }, [currentTrack, currentTime, duration]);

  if (!currentTrack) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 90,
      background: '#121212',
      borderTop: '1px solid #2a2a2a',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      zIndex: 9999,
      fontFamily: 'Inter, sans-serif',
      color: '#fff',
    }}>
      
      {/* --- GAUCHE : Infos du son --- */}
      <div style={{ display: 'flex', alignItems: 'center', width: '25%', minWidth: 220, gap: 12 }}>
        <div style={{ 
          width: 56, height: 56, borderRadius: 4, 
          background: currentTrack.cover_url ? `url(${currentTrack.cover_url}) center/cover` : '#222',
          border: '1px solid #333', flexShrink: 0
        }} />
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack.title}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack.artist}
          </div>
          {/* Métadonnées (Style Beatport) */}
          <div style={{ display: 'flex', gap: 6, fontSize: 10, color: '#666', marginTop: 4 }}>
            {currentTrack.bpm && <span style={{ color: '#fff', background: '#2a2a2a', padding: '1px 4px', borderRadius: 2 }}>{currentTrack.bpm} BPM</span>}
            {currentTrack.song_key && <span style={{ color: '#fff', background: '#2a2a2a', padding: '1px 4px', borderRadius: 2 }}>{currentTrack.song_key}</span>}
            {currentTrack.genre && <span style={{ color: '#fff', background: '#2a2a2a', padding: '1px 4px', borderRadius: 2 }}>{currentTrack.genre}</span>}
          </div>
        </div>
      </div>

      {/* --- CENTRE : Waveform & Timeline --- */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px' }}>
        <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace', width: 40, textAlign: 'right' }}>
          {formatTime(currentTime)}
        </span>
        
        {/* Canvas Waveform */}
        <div style={{ flex: 1, height: 40, position: 'relative', cursor: 'pointer' }} onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            seek(percent);
        }}>
          <canvas ref={canvasRef} width={800} height={40} style={{ width: '100%', height: '100%' }} />
        </div>

        <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace', width: 40 }}>
          {formatTime(duration)}
        </span>
      </div>

      {/* --- DROITE : Contrôles --- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '25%', minWidth: 220, gap: 16 }}>
        
        {/* Play/Pause */}
        <button 
          onClick={togglePlay}
          style={{ 
            width: 40, height: 40, borderRadius: '50%', background: '#fff', border: 'none', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            color: '#000', fontSize: 16, paddingLeft: isPlaying ? 0 : 2
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 90 }}>
          <span style={{ fontSize: 12, color: '#888' }}>🔊</span>
          <input 
            type="range" min="0" max="1" step="0.01" 
            value={volume} 
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#fff', height: 4 } as any} 
          />
        </div>

        {/* Close */}
        <button 
          onClick={stop}
          style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 16 }}
        >
          ✕
        </button>

      </div>
    </div>
  );
};