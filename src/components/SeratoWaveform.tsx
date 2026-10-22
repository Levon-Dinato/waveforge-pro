// src/components/SeratoWaveform.tsx
import React, { useRef, useEffect } from 'react';
import { WaveformData } from '../utils/audioAnalyzer';

interface Props {
  data: WaveformData | null;
  duration: number;
  currentTime: number;
  height: number;
  mode: 'overview' | 'zoom';
  zoomSeconds?: number; // Combien de secondes on voit en mode zoom
  onSeek?: (ratio: number) => void;
}

export const SeratoWaveform: React.FC<Props> = ({ data, duration, currentTime, height, mode, zoomSeconds = 10, onSeek }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || duration === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    const width = rect.width;
    const h = rect.height;
    const centerY = h / 2;
    
    // Nombre de points par seconde dans nos données
    const framesPerSecond = data.low.length / duration;

    const render = () => {
      ctx.clearRect(0, 0, width, h);
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, h);

      if (mode === 'overview') {
        // Mode Vue Globale : on affiche tout le morceau compressé
        const numBars = Math.floor(width);
        const step = data.low.length / numBars;

        for (let i = 0; i < numBars; i++) {
          const idx = Math.floor(i * step);
          const l = data.low[idx], m = data.mid[idx], hi = data.high[idx];
          const amp = (l + m + hi) / 3;

          // Calcul de la couleur (Rouge = Basses, Vert = Mids, Bleu = Aigus)
          let hue = 0;
          if (l > m && l > hi) hue = 0; // Rouge/Rose
          else if (m > l && m > hi) hue = 120; // Vert
          else hue = 200; // Bleu

          ctx.fillStyle = `hsl(${hue}, 80%, ${30 + amp * 40}%)`;
          ctx.fillRect(i, centerY - (amp * h * 0.9) / 2, 1, amp * h * 0.9);
        }
      } else {
        // Mode Zoom : on affiche une fenêtre autour du temps actuel
        const startTime = Math.max(0, currentTime - zoomSeconds / 2);
        const endTime = Math.min(duration, startTime + zoomSeconds);
        
        const startIdx = Math.floor(startTime * framesPerSecond);
        const endIdx = Math.floor(endTime * framesPerSecond);
        const numFrames = endIdx - startIdx;
        const barWidth = width / numFrames;

        for (let i = 0; i < numFrames; i++) {
          const idx = startIdx + i;
          if (idx >= data.low.length) break;

          const l = data.low[idx], m = data.mid[idx], hi = data.high[idx];
          
          // Couleur dynamique
          let hue = 0;
          if (l > m && l > hi) hue = 0; // Rouge
          else if (m > l && m > hi) hue = 120; // Vert
          else hue = 200; // Cyan/Bleu

          ctx.fillStyle = `hsl(${hue}, 80%, ${30 + Math.max(l,m,hi) * 40}%)`;
          
          const barH = Math.max(1, l * h * 0.45 + m * h * 0.45 + hi * h * 0.45);
          
          // Dessin des barres symétriques
          ctx.fillRect(i * barWidth, centerY - barH, barWidth - 0.5, barH * 2);
        }

        // Ligne de lecture (Playhead)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(width / 2, 0, 2, h);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(width / 2 - 1, 0, 4, h);
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animRef.current);
  }, [data, duration, currentTime, height, mode, zoomSeconds]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{ width: '100%', height: `${height}px`, display: 'block', cursor: 'crosshair' }}
    />
  );
};