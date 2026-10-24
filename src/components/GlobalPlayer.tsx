// src/components/GlobalPlayer.tsx
import React, { useRef, useEffect, useMemo } from 'react';
import { usePlayer, type PlayerTrack } from '../contexts/PlayerContext';

interface GlobalPlayerProps {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
}

export const GlobalPlayer: React.FC<GlobalPlayerProps> = ({ currentTrack, isPlaying, onTogglePlay, onStop }) => {
  const { currentTime, duration, seek } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Génère une fausse waveform stable (qui ne change pas à chaque re-render) si les vraies données manquent
  const mockPeaks = useMemo(() => {
    return Array.from({ length: 120 }, () => Math.random() * 0.6 + 0.2);
  }, [currentTrack?.id]);

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentTrack) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;

    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, W, H);

    // 🛡️ Vérification des peaks (vrais ou faux)
    let rawPeaks = currentTrack.peaks as any;
    let safePeaks: number[] = [];

    if (Array.isArray(rawPeaks) && rawPeaks.length > 0) {
      safePeaks = rawPeaks;
    } else if (typeof rawPeaks === 'string') {
      try {
        const parsed = JSON.parse(rawPeaks);
        if (Array.isArray(parsed) && parsed.length > 0) safePeaks = parsed;
      } catch (e) {}
    }

    // Si aucune vraie donnée, on utilise la fausse waveform pour le style
    if (safePeaks.length === 0) {
      safePeaks = mockPeaks;
    }

    const maxBars = 120;
    const step = Math.ceil(safePeaks.length / maxBars);
    const displayedPeaks = safePeaks.filter((_, i) => i % step === 0);
    
    if (displayedPeaks.length === 0) return;

    const barWidth = W / displayedPeaks.length;
    const gap = 2; // Espace entre les barres
    const playedRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;

    displayedPeaks.forEach((peak, index) => {
      const safePeak = typeof peak === 'number' && !isNaN(peak) ? peak : 0.2;
      
      const x = index * barWidth;
      const barHeight = Math.max(Math.min(safePeak * H * 0.8, H), 3); 
      const y = (H - barHeight) / 2;
      
      const isPlayed = (index / displayedPeaks.length) <= playedRatio;
      
      // ✅ Style "Pro" : Dégradé cyan pour la partie jouée, gris translucide pour le reste
      if (isPlayed) {
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#00d9ff');
        gradient.addColorStop(1, '#0077ff');
        ctx.fillStyle = gradient;
        ctx.shadowColor = '#00d9ff';
        ctx.shadowBlur = 4;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.shadowBlur = 0;
      }

      // Dessin de la barre avec des coins arrondis si possible
      const r = Math.min(2, barWidth / 2); // Rayon des coins
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, Math.max(barWidth - gap, 1), barHeight, r);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, Math.max(barWidth - gap, 1), barHeight);
      }
    });

    ctx.shadowBlur = 0;
  }, [currentTrack, currentTime, duration, mockPeaks]);

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentTrack || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    seek(ratio);
  };

  if (!currentTrack) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
      background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid #222',
    }}>
      {/* ✅ CONTENEUR CENTRÉ (max-width) pour ne pas étirer la barre à l'infini */}
      <div style={{
        maxWidth: 1200, margin: '0 auto', height: '80px',
        display: 'flex', alignItems: 'center', gap: '24px', padding: '0 24px'
      }}>
        
        {/* 1. Infos de la musique (Gauche) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '260px', flexShrink: 0 }}>
          <div style={{ 
            width: 44, height: 44, borderRadius: 8, 
            background: currentTrack.cover_url ? `url(${currentTrack.cover_url}) center/cover` : '#1a1a1a',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
          }} />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack.title}</div>
            <div style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{currentTrack.artist}</div>
          </div>
        </div>

        {/* 2. Contrôles & Waveform (Centre) */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
          
          <button onClick={onTogglePlay} style={{ 
            width: 36, height: 36, borderRadius: '50%', background: '#fff', color: '#000', 
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            cursor: 'pointer', transition: 'transform 0.1s' 
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            )}
          </button>

          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#888', width: 35, textAlign: 'right' }}>
            {formatTime(currentTime)}
          </span>
          
          {/* ✅ LA WAVEFORM */}
          <div style={{ flex: 1, height: 32, position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <canvas 
              ref={canvasRef}
              onClick={handleSeek}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#888', width: 35 }}>
            {formatTime(duration)}
          </span>
        </div>

        {/* 3. Fermer (Droite) */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '40px', justifyContent: 'flex-end' }}>
          <button onClick={onStop} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Fermer le lecteur">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

      </div>
    </div>
  );
};