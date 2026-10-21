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

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentTrack) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rawPeaks = currentTrack.peaks;
    if (typeof rawPeaks === 'string') {
      try { rawPeaks = JSON.parse(rawPeaks); } catch (e) { rawPeaks = []; }
    }
    const peaks = Array.isArray(rawPeaks) && rawPeaks.length > 0 ? rawPeaks : Array(100).fill(20); 

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / peaks.length;
    const progressRatio = duration > 0 ? currentTime / duration : 0;

    ctx.clearRect(0, 0, width, height);

    peaks.forEach((peak, i) => {
      const barHeight = Math.max(2, (peak / 100) * height);
      const x = i * barWidth;
      const y = (height - barHeight) / 2;

      if (i / peaks.length < progressRatio) {
        ctx.fillStyle = '#00d9ff';
      } else {
        ctx.fillStyle = '#333333';
      }
      
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(1, barWidth - 1), barHeight, 2);
      ctx.fill();
    });
  }, [currentTrack, currentTime, duration]);

  // ✅ NOUVELLE FONCTION : Force le téléchargement
  const handleDownload = async () => {
    if (!currentTrack) return;
    try {
      const response = await fetch(currentTrack.audio_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentTrack.artist} - ${currentTrack.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur de téléchargement", error);
      alert("Impossible de télécharger le fichier. Vérifiez votre connexion.");
    }
  };

  if (!currentTrack) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 90,
      background: '#121212', borderTop: '1px solid #2a2a2a',
      display: 'flex', alignItems: 'center', padding: '0 24px',
      zIndex: 9999, fontFamily: 'Inter, sans-serif', color: '#fff',
    }}>
      
      {/* GAUCHE */}
      <div style={{ display: 'flex', alignItems: 'center', width: '30%', gap: 12, flexShrink: 0 }}>
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
          <div style={{ display: 'flex', gap: 6, fontSize: 10, color: '#666', marginTop: 4 }}>
            {currentTrack.bpm && <span style={{ color: '#fff', background: '#2a2a2a', padding: '1px 4px', borderRadius: 2 }}>{currentTrack.bpm} BPM</span>}
            {currentTrack.song_key && <span style={{ color: '#fff', background: '#2a2a2a', padding: '1px 4px', borderRadius: 2 }}>{currentTrack.song_key}</span>}
          </div>
        </div>
      </div>

      {/* CENTRE */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', minWidth: 0 }}>
        <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace', width: 40, textAlign: 'right', flexShrink: 0 }}>
          {formatTime(currentTime)}
        </span>
        
        <div style={{ flex: 1, height: 40, position: 'relative', cursor: 'pointer' }} onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            seek(percent);
        }}>
          <canvas ref={canvasRef} width={800} height={40} style={{ width: '100%', height: '100%' }} />
        </div>

        <span style={{ fontSize: 11, color: '#888', fontFamily: 'monospace', width: 40, flexShrink: 0 }}>
          {formatTime(duration)}
        </span>
      </div>

      {/* DROITE */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '30%', gap: 16, flexShrink: 0 }}>
        
        <button 
          onClick={togglePlay}
          style={{ 
            width: 44, height: 44, borderRadius: '50%', background: '#fff', border: 'none', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            color: '#000', fontSize: 18, paddingLeft: isPlaying ? 0 : 3, flexShrink: 0
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 100 }}>
          <span style={{ fontSize: 14, color: '#888' }}>🔊</span>
          <input 
            type="range" min="0" max="1" step="0.01" 
            value={volume} 
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#fff', height: 4 } as any} 
          />
        </div>

        {/* ✅ BOUTON DE TÉLÉCHARGEMENT CORRIGÉ */}
        <button 
          onClick={handleDownload}
          style={{ 
            background: 'rgba(0, 217, 255, 0.1)', border: 'none', color: '#00d9ff', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
            fontSize: 16, flexShrink: 0
          }}
          title="Télécharger le morceau"
        >
          ⬇️
        </button>

        <button onClick={stop} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, padding: 8, flexShrink: 0 }}>
          ✕
        </button>

      </div>
    </div>
  );
};