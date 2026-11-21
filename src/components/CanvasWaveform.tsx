import React, { useRef, useState, useEffect, useMemo } from 'react';

interface CanvasWaveformProps {
  peaks: number[]; isPlaying: boolean; themeColor: string; progress: number; isCurrent: boolean; onSeek: (ratio: number) => void; isMobile: boolean;
  height?: number;
}

export const CanvasWaveform: React.FC<CanvasWaveformProps> = ({ peaks, isPlaying, themeColor, progress, isCurrent, onSeek, isMobile, height = 48 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  const mockPeaks = useMemo(() => Array.from({ length: 220 }, () => Math.random() * 70 + 30), [peaks]);

  useEffect(() => { if (!isDraggingRef.current) setDragProgress(null); }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, W, H);

    let safePeaks = Array.isArray(peaks) && peaks.length > 0 ? peaks : mockPeaks;
    const centerY = H / 2;
    const maxAmplitude = H * 0.46;
    const displayProgress = dragProgress !== null ? dragProgress : progress;
    const playedX = displayProgress * W;

    // Barres denses et régulières, façon SoundCloud
    const barCount = isMobile ? 110 : 220;
    const step = Math.max(1, Math.floor(safePeaks.length / barCount));
    const displayPeaks: number[] = [];
    for (let i = 0; i < safePeaks.length && displayPeaks.length < barCount; i += step) {
      displayPeaks.push(safePeaks[i]);
    }
    const slot = W / Math.max(1, displayPeaks.length);
    const barWidth = Math.max(1, slot * 0.72);

    const drawBar = (i: number) => {
      const x = i * slot + (slot - barWidth) / 2;
      const raw = displayPeaks[i];
      const val = raw > 1 ? raw / 100 : raw;
      const barHeight = Math.max(val * maxAmplitude, 1.5);
      ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2);
    };

    // Partie non jouée (teintée aux couleurs de l'artiste)
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = themeColor;
    for (let i = 0; i < displayPeaks.length; i++) {
      if ((i * slot) >= playedX) drawBar(i);
    }
    ctx.globalAlpha = 1;

    // Partie jouée (dégradé accent + glow)
    if (isPlaying || displayProgress > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, playedX, H);
      ctx.clip();

      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, `${themeColor}20`);
      gradient.addColorStop(0.5, themeColor);
      gradient.addColorStop(1, `${themeColor}20`);

      ctx.fillStyle = gradient;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = isMobile ? 2 : 6;
      for (let i = 0; i < displayPeaks.length; i++) {
        drawBar(i);
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Curseur de lecture
    if (isPlaying || displayProgress > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(playedX, 0);
      ctx.lineTo(playedX, H);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [peaks, mockPeaks, isPlaying, themeColor, progress, dragProgress, isMobile, height]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCurrent) return;
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getRatio = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };

    const initialRatio = getRatio(e.clientX);
    setDragProgress(initialRatio);
    onSeek(initialRatio);

    let lastSeekTime = 0;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const ratio = getRatio(moveEvent.clientX);
      setDragProgress(ratio);
      const now = Date.now();
      if (now - lastSeekTime > 100) {
        lastSeekTime = now;
        onSeek(ratio);
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onSeek(getRatio(upEvent.clientX));
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <canvas
      ref={canvasRef} onMouseDown={handleMouseDown} onClick={(e) => { if (isCurrent) e.stopPropagation(); }}
      style={{ width: '100%', height: `${isMobile ? Math.min(height, 56) : height}px`, display: 'block', cursor: isCurrent ? 'pointer' : 'default', touchAction: 'none', opacity: isCurrent ? 1 : 0.6 }}
    />
  );
};
