// src/components/Waveform.tsx
import { useEffect, useRef, useState } from 'react';

interface Props {
  audioBuffer?: AudioBuffer | null;
  peaks?: number[] | Float32Array;
  currentTime: number;
  duration: number;
  onSeek?: (t: number) => void; // Ancienne prop (rétrocompatibilité)
  onScrubStart?: () => void;   // Nouvelle prop
  onScrub?: (t: number) => void; // Nouvelle prop
  onScrubEnd?: () => void;     // Nouvelle prop
  height?: number;
  showGrid?: boolean;
  variant?: 'full' | 'compact';
}

export function Waveform({
  audioBuffer,
  peaks,
  currentTime,
  duration,
  onSeek,
  onScrubStart,
  onScrub,
  onScrubEnd,
  height = 140,
  showGrid = true,
  variant = 'full',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<Float32Array | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calcul des peaks
  useEffect(() => {
    if (peaks && peaks.length > 0) {
      peaksRef.current = new Float32Array(peaks);
      return;
    }
    if (!audioBuffer) {
      peaksRef.current = null;
      return;
    }
    const data = audioBuffer.getChannelData(0);
    const samples = variant === 'full' ? 800 : 300;
    const blockSize = Math.floor(data.length / samples);
    const peaksArray = new Float32Array(samples);
    let maxPeak = 0;

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = 0; j < blockSize; j++) sum += Math.abs(data[start + j]);
      peaksArray[i] = sum / blockSize;
      if (peaksArray[i] > maxPeak) maxPeak = peaksArray[i];
    }
    if (maxPeak > 0) for (let i = 0; i < samples; i++) peaksArray[i] /= maxPeak;

    const smoothed = new Float32Array(samples);
    const smoothWindow = variant === 'full' ? 3 : 2;
    for (let i = 0; i < samples; i++) {
      let sum = 0; let count = 0;
      for (let j = -smoothWindow; j <= smoothWindow; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < samples) { sum += peaksArray[idx]; count++; }
      }
      smoothed[i] = sum / count;
    }
    peaksRef.current = smoothed;
  }, [audioBuffer, peaks, variant]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const DPR = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    if (W === 0 || H === 0) return;

    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);

    ctx.fillStyle = '#08080d';
    ctx.fillRect(0, 0, W, H);

    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const divisions = variant === 'full' ? 16 : 8;
      for (let i = 1; i < divisions; i++) {
        const x = (i / divisions) * W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
    }

    const currentPeaks = peaksRef.current;
    if (!currentPeaks) return;

    const centerY = H / 2;
    const maxAmplitude = H * 0.42;
    const playedRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
    const playedX = playedRatio * W;

    // Waveform grise
    ctx.fillStyle = 'rgba(80, 80, 100, 0.5)';
    for (let i = 0; i < currentPeaks.length; i++) {
      const x = (i / currentPeaks.length) * W;
      const barWidth = W / currentPeaks.length;
      const barHeight = currentPeaks[i] * maxAmplitude;
      if (x >= playedX) ctx.fillRect(x, centerY - barHeight, barWidth * 0.85, barHeight * 2);
    }

    // Waveform cyan
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, playedX, H); ctx.clip();
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, 'rgba(0, 217, 255, 0.15)');
    gradient.addColorStop(0.5, 'rgba(0, 217, 255, 1)');
    gradient.addColorStop(1, 'rgba(0, 217, 255, 0.15)');
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#00d9ff'; ctx.shadowBlur = 8;
    for (let i = 0; i < currentPeaks.length; i++) {
      const x = (i / currentPeaks.length) * W;
      const barWidth = W / currentPeaks.length;
      const barHeight = currentPeaks[i] * maxAmplitude;
      ctx.fillRect(x, centerY - barHeight, barWidth * 0.85, barHeight * 2);
    }
    ctx.shadowBlur = 0; ctx.restore();

    // Tête de lecture
    if (duration > 0 && playedRatio < 1) {
      ctx.strokeStyle = isDragging ? '#ffffff' : '#ff3366';
      ctx.lineWidth = isDragging ? 3 : 2;
      ctx.shadowColor = isDragging ? '#ffffff' : '#ff3366';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(playedX, 0); ctx.lineTo(playedX, H); ctx.stroke();
      ctx.fillStyle = isDragging ? '#ffffff' : '#ff3366';
      ctx.beginPath(); ctx.moveTo(playedX - 5, 0); ctx.lineTo(playedX + 5, 0); ctx.lineTo(playedX, 8); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
    }
  };

  useEffect(() => { draw(); }, [currentTime, duration, showGrid, variant, peaks, isDragging]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Gestion des événements de glissement
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    if (onScrubStart) onScrubStart();
    handleMouseMove(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    
    if (onScrub) onScrub(newTime);
    else if (onSeek) onSeek(newTime); // Fallback
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      if (onScrubEnd) onScrubEnd();
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const up = () => handleMouseUp();
    const move = (e: MouseEvent) => handleMouseMove(e as any);
    window.addEventListener('mouseup', up);
    window.addEventListener('mousemove', move);
    window.addEventListener('touchend', up);
    window.addEventListener('touchmove', move);
    return () => {
      window.removeEventListener('mouseup', up);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchend', up);
      window.removeEventListener('touchmove', move);
    };
  }, [isDragging, duration]);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      style={{
        width: '100%',
        height,
        display: 'block',
        cursor: isDragging ? 'grabbing' : 'crosshair',
        touchAction: 'none'
      }}
    />
  );
}