// src/components/GlobalPlayer.tsx
import React, { useRef, useEffect, useMemo, useState } from 'react';
import { usePlayer } from '../contexts/PlayerContext';

interface GlobalPlayerProps {
  currentTrack: any;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
}

const forceDownload = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Erreur lors du téléchargement:", error);
    window.open(url, '_blank');
  }
};

export const GlobalPlayer: React.FC<GlobalPlayerProps> = ({ currentTrack, isPlaying, onTogglePlay, onStop }) => {
  const { currentTime, duration, seek } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Détection de la taille de l'écran
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const mockPeaks = useMemo(() => {
    return Array.from({ length: 150 }, () => Math.random() * 70 + 30);
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

    if (safePeaks.length === 0) {
      safePeaks = mockPeaks;
    }

    const barCount = 300;
    const step = Math.ceil(safePeaks.length / barCount);
    const displayPeaks = safePeaks.filter((_: any, i: number) => i % step === 0).slice(0, barCount);

    const centerY = H / 2;
    const maxAmplitude = H * 0.45;
    const playedRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
    const playedX = playedRatio * W;

    // Partie non jouée
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < displayPeaks.length; i++) {
      const x = (i / displayPeaks.length) * W;
      const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
      const barHeight = Math.max(val * maxAmplitude, 2);
      if (x >= playedX) {
        ctx.fillRect(x, centerY - barHeight, 1, barHeight * 2);
      }
    }

    // Partie jouée
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, playedX, H);
    ctx.clip();

    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, 'rgba(0, 217, 255, 0.2)');
    gradient.addColorStop(0.5, 'rgba(0, 217, 255, 1)');
    gradient.addColorStop(1, 'rgba(0, 217, 255, 0.2)');

    ctx.fillStyle = gradient;
    ctx.shadowColor = '#00d9ff';
    ctx.shadowBlur = 6;

    for (let i = 0; i < displayPeaks.length; i++) {
      const x = (i / displayPeaks.length) * W;
      const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
      const barHeight = Math.max(val * maxAmplitude, 2);
      ctx.fillRect(x, centerY - barHeight, 1, barHeight * 2);
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // Tête de lecture
    if (duration > 0 && playedRatio < 1) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(playedX, 0);
      ctx.lineTo(playedX, H);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [currentTrack, currentTime, duration, mockPeaks, isMobile]);

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
      position: 'fixed', 
      bottom: isMobile ? 70 : 0, // ✅ Sur mobile, on le place au-dessus de la barre de nav
      left: 0, right: 0, zIndex: 1000,
      background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid #222',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', 
        height: isMobile ? '60px' : '80px', // ✅ Plus compact sur mobile
        display: 'flex', alignItems: 'center', 
        gap: isMobile ? '12px' : '24px', 
        padding: isMobile ? '0 12px' : '0 24px'
      }}>
        
        {/* Infos musique */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, width: isMobile ? 'auto' : '260px', flexShrink: 0 }}>
          <div style={{ 
            width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, borderRadius: 8, 
            background: currentTrack.cover_url ? `url(${currentTrack.cover_url}) center/cover` : '#1a1a1a',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
          }} />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', maxWidth: isMobile ? '80px' : 'none' }}>
            <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack.title}</div>
            <div style={{ fontSize: isMobile ? 9 : 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{currentTrack.artist}</div>
          </div>
        </div>

        {/* Contrôles */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
          <button onClick={onTogglePlay} style={{ 
            width: isMobile ? 30 : 36, height: isMobile ? 30 : 36, borderRadius: '50%', background: '#fff', color: '#000', 
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            cursor: 'pointer', flexShrink: 0
          }}>
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            )}
          </button>

          {/* Temps cachés sur mobile pour gagner de la place */}
          {!isMobile && (
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#888', width: 35, textAlign: 'right' }}>
              {formatTime(currentTime)}
            </span>
          )}
          
          <div style={{ flex: 1, height: isMobile ? 35 : 50, position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <canvas ref={canvasRef} onClick={handleSeek} style={{ width: '100%', height: '100%' }} />
          </div>
          
          {!isMobile && (
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#888', width: 35 }}>
              {formatTime(duration)}
            </span>
          )}
        </div>

        {/* Actions (Télécharger / Fermer) */}
        <div style={{ display: 'flex', gap: isMobile ? 8 : 16, alignItems: 'center', justifyContent: 'flex-end', width: isMobile ? 'auto' : '80px' }}>
          
          {/* Bouton télécharger caché sur mobile */}
          {!isMobile && (
            <button 
              onClick={() => forceDownload(currentTrack.audio_url, `${currentTrack.artist} - ${currentTrack.title}.mp3`)}
              title="Télécharger ce son"
              style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
          )}

          <button onClick={onStop} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Fermer le lecteur">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

      </div>
    </div>
  );
};