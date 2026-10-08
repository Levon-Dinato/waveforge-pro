import { useEffect, useRef } from 'react';

interface Props {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  onSeek: (t: number) => void;
  height?: number;
  showGrid?: boolean;
  variant?: 'full' | 'compact';
}

export function Waveform({
  audioBuffer,
  currentTime,
  duration,
  onSeek,
  height = 140,
  showGrid = true,
  variant = 'full',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<Float32Array | null>(null);

  // Calcule les peaks
  useEffect(() => {
    if (!audioBuffer) {
      peaksRef.current = null;
      return;
    }

    const data = audioBuffer.getChannelData(0);
    const samples = variant === 'full' ? 800 : 300;
    const blockSize = Math.floor(data.length / samples);
    const peaks = new Float32Array(samples);
    let maxPeak = 0;

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(data[start + j]);
      }
      peaks[i] = sum / blockSize;
      if (peaks[i] > maxPeak) maxPeak = peaks[i];
    }

    if (maxPeak > 0) {
      for (let i = 0; i < samples; i++) {
        peaks[i] /= maxPeak;
      }
    }

    // Lissage
    const smoothed = new Float32Array(samples);
    const smoothWindow = variant === 'full' ? 3 : 2;
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      let count = 0;
      for (let j = -smoothWindow; j <= smoothWindow; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < samples) {
          sum += peaks[idx];
          count++;
        }
      }
      smoothed[i] = sum / count;
    }

    peaksRef.current = smoothed;
  }, [audioBuffer, variant]);

  // Dessine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const DPR = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;

    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);

    // Fond
    ctx.fillStyle = '#08080d';
    ctx.fillRect(0, 0, W, H);

    // Grille
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const divisions = variant === 'full' ? 16 : 8;
      for (let i = 1; i < divisions; i++) {
        const x = (i / divisions) * W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
    }

    const peaks = peaksRef.current;

    // Sans audio : message
    if (!peaks) {
      if (variant === 'full') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.font = '600 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '2px';
        ctx.fillText('DÉPOSE TON AUDIO POUR VOIR LA WAVEFORM', W / 2, H / 2);
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
      }
      return;
    }

    const centerY = H / 2;
    const maxAmplitude = H * 0.42;
    const playedRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
    const playedX = playedRatio * W;

    // ============ ÉTAPE 1 : WAVEFORM GRISE (partie non jouée) ============
    ctx.fillStyle = 'rgba(80, 80, 100, 0.5)';

    for (let i = 0; i < peaks.length; i++) {
      const x = (i / peaks.length) * W;
      const barWidth = W / peaks.length;
      const barHeight = peaks[i] * maxAmplitude;

      // Ne dessine que si après la tête de lecture
      if (x >= playedX) {
        ctx.fillRect(x, centerY - barHeight, barWidth * 0.85, barHeight * 2);
      }
    }

    // ============ ÉTAPE 2 : WAVEFORM CYAN (partie jouée) ============
    // Clip pour ne pas dépasser la tête de lecture
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, playedX, H);
    ctx.clip();

    // Dégradé vertical
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, 'rgba(0, 217, 255, 0.15)');
    gradient.addColorStop(0.3, 'rgba(0, 217, 255, 0.7)');
    gradient.addColorStop(0.5, 'rgba(0, 217, 255, 1)');
    gradient.addColorStop(0.7, 'rgba(0, 217, 255, 0.7)');
    gradient.addColorStop(1, 'rgba(0, 217, 255, 0.15)');

    ctx.fillStyle = gradient;
    ctx.shadowColor = '#00d9ff';
    ctx.shadowBlur = 8;

    for (let i = 0; i < peaks.length; i++) {
      const x = (i / peaks.length) * W;
      const barWidth = W / peaks.length;
      const barHeight = peaks[i] * maxAmplitude;

      ctx.fillRect(x, centerY - barHeight, barWidth * 0.85, barHeight * 2);
    }

    ctx.shadowBlur = 0;
    ctx.restore();

    // ============ ÉTAPE 3 : TÊTE DE LECTURE ============
    if (duration > 0 && playedRatio < 1) {
      // Ligne verticale
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ff3366';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(playedX, 0);
      ctx.lineTo(playedX, H);
      ctx.stroke();

      // Pointeur triangle
      ctx.fillStyle = '#ff3366';
      ctx.beginPath();
      ctx.moveTo(playedX - 5, 0);
      ctx.lineTo(playedX + 5, 0);
      ctx.lineTo(playedX, 8);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
    }
  }, [currentTime, duration, showGrid, variant]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(ratio * duration);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{
        width: '100%',
        height,
        display: 'block',
        cursor: 'crosshair',
      }}
    />
  );
}