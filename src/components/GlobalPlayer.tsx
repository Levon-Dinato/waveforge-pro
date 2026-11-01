// src/components/GlobalPlayer.tsx
import React, { useRef, useEffect, useMemo, useState } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { useTheme } from '../contexts/ThemeContext'; // ✅ Import du thème

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
    window.open(url, '_blank');
  }
};

export const GlobalPlayer: React.FC<GlobalPlayerProps> = ({ currentTrack, isPlaying, onTogglePlay, onStop }) => {
  const { currentTime, duration, seek } = usePlayer();
  const { theme } = useTheme(); // ✅ Récupération du thème
  const isDark = theme === 'dark';
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // ✅ PALETTE DE COULEURS DYNAMIQUES
  const colors = {
    bg: isDark ? '#09090b' : '#ffffff',
    border: isDark ? '#27272a' : '#e5e7eb',
    textMain: isDark ? '#ffffff' : '#1a1a1a',
    textMuted: isDark ? '#a1a1aa' : '#666666',
    playBtnBg: isDark ? '#ffffff' : '#1a1a1a',
    playBtnText: isDark ? '#000000' : '#ffffff',
    coverPlaceholder: isDark ? '#18181b' : '#f3f4f6',
    shadow: isDark ? '0 -10px 40px rgba(0,0,0,0.8)' : '0 -4px 20px rgba(0,0,0,0.05)',
  };

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

  // ✅ LE CANVAS PREND EN COMPTE LE THEME (isDark ajouté dans les dépendances)
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

    const barCount = isMobile ? 150 : 300;
    const step = Math.ceil(safePeaks.length / barCount);
    const displayPeaks = safePeaks.filter((_: any, i: number) => i % step === 0).slice(0, barCount);

    const centerY = H / 2;
    const maxAmplitude = H * 0.45;
    const playedRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
    const playedX = playedRatio * W;

    // Partie non jouée (gris clair sur dark, gris foncé sur light)
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';
    for (let i = 0; i < displayPeaks.length; i++) {
      const x = (i / displayPeaks.length) * W;
      const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
      const barHeight = Math.max(val * maxAmplitude, 2);
      if (x >= playedX) ctx.fillRect(x, centerY - barHeight, 1, barHeight * 2);
    }

    // Partie jouée (cyan dans les deux modes)
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
    ctx.shadowBlur = isMobile ? 2 : 6;

    for (let i = 0; i < displayPeaks.length; i++) {
      const x = (i / displayPeaks.length) * W;
      const val = displayPeaks[i] > 1 ? displayPeaks[i] / 100 : displayPeaks[i];
      const barHeight = Math.max(val * maxAmplitude, 2);
      ctx.fillRect(x, centerY - barHeight, 1, barHeight * 2);
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // Tête de lecture (blanche sur dark, noire sur light)
    if (duration > 0 && playedRatio < 1) {
      ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
      ctx.lineWidth = 2;
      ctx.shadowColor = isDark ? '#ffffff' : '#000000';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(playedX, 0);
      ctx.lineTo(playedX, H);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [currentTrack, currentTime, duration, mockPeaks, isMobile, isDark]); // ✅ Ajout de isDark

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
      bottom: isMobile ? 70 : 0, 
      left: 0, right: 0, zIndex: 1000,
      background: colors.bg, // ✅ Couleur dynamique
      borderTop: `1px solid ${colors.border}`, // ✅ Couleur dynamique
      boxShadow: colors.shadow, // ✅ Ombre adaptée
      transition: 'background 0.3s ease, border-color 0.3s ease'
    }}>
      {/* Barre de progression fine tout en haut du player */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: colors.border }}>
        <div style={{ width: `${(currentTime / (duration || 1)) * 100}%`, height: '100%', background: '#00d9ff', boxShadow: '0 0 10px #00d9ff' }} />
      </div>

      <div style={{
        maxWidth: 1400, margin: '0 auto', 
        height: isMobile ? '72px' : '96px',
        display: 'flex', alignItems: 'center', 
        gap: isMobile ? '12px' : '32px', 
        padding: isMobile ? '0 16px' : '0 32px'
      }}>
        
        {/* Cover + Titre + Artiste */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 16, width: isMobile ? 'auto' : '320px', flexShrink: 0 }}>
          <div style={{ 
            width: isMobile ? 40 : 56, height: isMobile ? 40 : 56, borderRadius: 8, 
            background: currentTrack.cover_url ? `url(${currentTrack.cover_url}) center/cover` : colors.coverPlaceholder,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            flexShrink: 0,
            border: `1px solid ${colors.border}`
          }} />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', maxWidth: isMobile ? '120px' : 'none' }}>
            <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack.title}
            </div>
            <div style={{ fontSize: isMobile ? 11 : 13, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4 }}>
              {currentTrack.artist}
            </div>
          </div>
        </div>

        {/* Contrôles + Waveform */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 24 }}>
          
          <button onClick={onTogglePlay} style={{ 
            width: isMobile ? 36 : 48, height: isMobile ? 36 : 48, borderRadius: '50%', 
            background: colors.playBtnBg, color: colors.playBtnText, border: 'none', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            cursor: 'pointer', flexShrink: 0,
            transition: 'transform 0.1s, background 0.3s, color 0.3s',
            boxShadow: isDark ? '0 0 20px rgba(255,255,255,0.1)' : '0 4px 10px rgba(0,0,0,0.1)'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isPlaying ? (
              <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            ) : (
              <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 3 }}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            )}
          </button>

          {!isMobile && (
            <span style={{ fontSize: 12, fontFamily: 'monospace', color: colors.textMuted, width: 40, textAlign: 'right', fontWeight: 600 }}>
              {formatTime(currentTime)}
            </span>
          )}
          
          <div style={{ flex: 1, height: isMobile ? 40 : 60, position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <canvas ref={canvasRef} onClick={handleSeek} style={{ width: '100%', height: '100%' }} />
          </div>
          
          {!isMobile && (
            <span style={{ fontSize: 12, fontFamily: 'monospace', color: colors.textMuted, width: 40, fontWeight: 600 }}>
              {formatTime(duration)}
            </span>
          )}
        </div>

        {/* Actions (Download / Close) */}
        <div style={{ display: 'flex', gap: isMobile ? 8 : 20, alignItems: 'center', justifyContent: 'flex-end', width: isMobile ? 'auto' : '100px' }}>
          {!isMobile && (
            <button 
              onClick={() => forceDownload(currentTrack.audio_url, `${currentTrack.artist} - ${currentTrack.title}.mp3`)}
              title="Télécharger ce son"
              style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = colors.textMain}
              onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
          )}

          <button onClick={onStop} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} title="Fermer le lecteur"
            onMouseEnter={e => e.currentTarget.style.color = '#ff5c5c'}
            onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

      </div>
    </div>
  );
};