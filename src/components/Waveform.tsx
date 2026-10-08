import { useEffect, useRef } from 'react';

interface Props {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  onSeek: (t: number) => void;
  height?: number;
  color?: string;
  showGrid?: boolean;
}

export function Waveform({
  audioBuffer,
  currentTime,
  duration,
  onSeek,
  height = 120,
  color = '#00d9ff',
  showGrid = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<Float32Array | null>(null);

  // Calcule les peaks une fois quand l'audioBuffer change
  useEffect(() => {
    if (!audioBuffer) {
      peaksRef.current = null;
      return;
    }

    const data = audioBuffer.getChannelData(0);
    const samples = 800; // nombre de barres
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

    // Normalise
    if (maxPeak > 0) {
      for (let i = 0; i < samples; i++) {
        peaks[i] /= maxPeak;
      }
    }

    peaksRef.current = peaks;
  }, [audioBuffer]);

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
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    // Grille
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;

      // Lignes verticales (8 divisions)
      for (let i = 1; i < 8; i++) {
        const x = (i / 8) * W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }

      // Ligne horizontale centrale
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();
    }

    const peaks = peaksRef.current;
    if (!peaks) {
      // Aucun audio chargé : affiche une ligne plate
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();
      return;
    }

    const barWidth = W / peaks.length;
    const centerY = H / 2;
    const maxBarHeight = H * 0.4;

    // Waveform (barres)
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const barHeight = peaks[i] * maxBarHeight;

      // Détermine si la barre est avant ou après le playhead
      const barTime = (i / peaks.length) * duration;
      const isPlayed = barTime <= currentTime;

      // Couleur avec glow
      if (isPlayed) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.shadowBlur = 0;
      }

      // Barre centrale symétrique
      ctx.fillRect(x, centerY - barHeight, barWidth * 0.7, barHeight * 2);
    }

    ctx.shadowBlur = 0;

    // Playhead
    if (duration > 0) {
      const playheadX = (currentTime / duration) * W;
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ff3366';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, H);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [currentTime, duration, color, showGrid]);

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
        borderRadius: 6,
      }}
    />
  );
}