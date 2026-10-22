// src/components/SeratoWaveform.tsx
import React, { useRef, useEffect, memo } from 'react';
import type { WaveformData } from '../utils/audioAnalyzer';

interface Props {
  data: WaveformData | null;
  duration: number;
  getCurrentTime: () => number;
  height: number;
  mode: 'overview' | 'zoom';
  zoomSeconds?: number;
  onSeek?: (newTime: number) => void; // ✅ On passe le temps en secondes
  onSeekEnd?: () => void;
  cuePoints?: (number | null)[];
  cueColor?: string;
}

export const SeratoWaveform: React.FC<Props> = memo(({ 
  data, duration, getCurrentTime, height, mode, zoomSeconds = 10, onSeek, onSeekEnd, cuePoints, cueColor = '#ffcc00' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  
  const onSeekRef = useRef(onSeek);
  const onSeekEndRef = useRef(onSeekEnd);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);
  useEffect(() => { onSeekEndRef.current = onSeekEnd; }, [onSeekEnd]);

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
    const framesPerSecond = data.low.length / duration;

    const render = () => {
      const currentTime = getCurrentTime();
      
      ctx.clearRect(0, 0, width, h);
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, h);

      let startTime = 0;
      let endTime = duration;
      let playheadX = width / 2;

      if (mode === 'overview') {
        const numBars = Math.floor(width);
        const step = data.low.length / numBars;
        for (let i = 0; i < numBars; i++) {
          const idx = Math.floor(i * step);
          const l = data.low[idx], m = data.mid[idx], hi = data.high[idx];
          const amp = (l + m + hi) / 3;
          let hue = 0;
          if (l > m && l > hi) hue = 0; 
          else if (m > l && m > hi) hue = 120; 
          else hue = 200; 
          ctx.fillStyle = `hsl(${hue}, 80%, ${30 + amp * 40}%)`;
          ctx.fillRect(i, centerY - (amp * h * 0.9) / 2, 1, amp * h * 0.9);
        }
        playheadX = (currentTime / duration) * width;
      } else {
        // ✅ Calcul du temps de début et de fin de la vue zoomée
        startTime = Math.max(0, currentTime - zoomSeconds / 2);
        endTime = Math.min(duration, startTime + zoomSeconds);
        
        // Si on est au début du morceau, on ajuste pour ne pas avoir de vide à gauche
        if (endTime - startTime < zoomSeconds) {
          startTime = Math.max(0, endTime - zoomSeconds);
        }

        const startIdx = Math.floor(startTime * framesPerSecond);
        const endIdx = Math.floor(endTime * framesPerSecond);
        const numFrames = endIdx - startIdx;
        const barWidth = width / numFrames;

        for (let i = 0; i < numFrames; i++) {
          const idx = startIdx + i;
          if (idx < 0 || idx >= data.low.length) continue;

          const l = data.low[idx], m = data.mid[idx], hi = data.high[idx];
          let hue = 0;
          if (l > m && l > hi) hue = 0; 
          else if (m > l && m > hi) hue = 120; 
          else hue = 200; 

          const lightness = 30 + Math.max(l, m, hi) * 40;
          ctx.fillStyle = `hsl(${hue}, 80%, ${lightness}%)`;
          
          const barH = Math.max(1, l * h * 0.45 + m * h * 0.45 + hi * h * 0.45);
          ctx.fillRect(i * barWidth, centerY - barH, barWidth - 0.5, barH * 2);
        }

        // ✅ Le playhead n'est plus fixé au centre, il suit le temps réel
        playheadX = ((currentTime - startTime) / (endTime - startTime)) * width;
      }

      // Dessin du Playhead
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(playheadX, 0, 2, h);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(playheadX - 1, 0, 4, h);

      // ✅ DESSIN DES POINTS CUE
      if (cuePoints) {
        cuePoints.forEach((cueTime, index) => {
          if (cueTime === null) return;

          let cueX = 0;
          if (mode === 'overview') {
            cueX = (cueTime / duration) * width;
          } else {
            const timeDiff = cueTime - startTime;
            cueX = (timeDiff / (endTime - startTime)) * width;
          }

          if (cueX >= 0 && cueX <= width) {
            ctx.fillStyle = cueColor;
            ctx.fillRect(cueX, 0, 2, h);
            
            ctx.beginPath();
            ctx.moveTo(cueX - 4, 0);
            ctx.lineTo(cueX + 6, 0);
            ctx.lineTo(cueX + 1, 8);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.font = 'bold 8px sans-serif';
            ctx.fillText((index + 1).toString(), cueX - 2, 7);
          }
        });
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [data, duration, getCurrentTime, height, mode, zoomSeconds, cuePoints, cueColor]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeekRef.current) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    
    // ✅ La fonction calcule le temps exact (en secondes) en fonction du mode
    const getTimeFromClientX = (clientX: number) => {
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      
      if (mode === 'overview') {
        return ratio * duration;
      } else {
        const currentTime = getCurrentTime();
        let sTime = Math.max(0, currentTime - zoomSeconds / 2);
        let eTime = Math.min(duration, sTime + zoomSeconds);
        if (eTime - sTime < zoomSeconds) sTime = Math.max(0, eTime - zoomSeconds);
        
        // On retourne le temps absolu correspondant au clic
        return sTime + ratio * (eTime - sTime);
      }
    };

    onSeekRef.current(getTimeFromClientX(e.clientX));
    
    const onMouseMove = (ev: MouseEvent) => {
      onSeekRef.current?.(getTimeFromClientX(ev.clientX));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      onSeekEndRef.current?.();
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      style={{ width: '100%', height: `${height}px`, display: 'block', cursor: 'ew-resize', touchAction: 'none', userSelect: 'none' }}
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.data === nextProps.data 
      && prevProps.duration === nextProps.duration 
      && prevProps.height === nextProps.height 
      && prevProps.mode === nextProps.mode
      && prevProps.cuePoints === nextProps.cuePoints;
});