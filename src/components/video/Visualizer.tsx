// src/components/video/Visualizer.tsx
import React, { useRef, useEffect } from 'react';

export type VisualizerStyle = 'bars' | 'wave' | 'circle' | 'particles';

export interface VisualizerConfig {
  style: VisualizerStyle;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  title: string;
  subtitle: string;
  showGrid: boolean;
}

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  config: VisualizerConfig;
  width?: number;
  height?: number;
  registerCanvas?: (canvas: HTMLCanvasElement | null) => void;
}

export const Visualizer: React.FC<VisualizerProps> = ({
  analyser,
  config,
  width = 1920,
  height = 1080,
  registerCanvas,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedRef = useRef<number[]>([]);
  const particlesRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; life: number }>
  >([]);

  useEffect(() => {
    if (registerCanvas && canvasRef.current) {
      registerCanvas(canvasRef.current);
    }
    return () => {
      if (registerCanvas) registerCanvas(null);
    };
  }, [registerCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const dataArray = analyser
      ? new Uint8Array(analyser.frequencyBinCount)
      : null;
    const timeDomainArray = analyser
      ? new Uint8Array(analyser.fftSize)
      : null;

    if (!smoothedRef.current.length) {
      smoothedRef.current = new Array(96).fill(0);
    }

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      const { style, primaryColor, accentColor, bgColor, title, subtitle, showGrid } = config;

      // Fond
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Grille
      if (showGrid) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 2;
        const gridSize = 80;
        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      if (!analyser || !dataArray || !timeDomainArray) {
        drawStaticTitle(ctx, width, height, title, subtitle, primaryColor, accentColor);
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeDomainArray);

      switch (style) {
        case 'bars':
          drawBars(ctx, width, height, dataArray, primaryColor, accentColor, smoothedRef.current);
          break;
        case 'wave':
          drawWave(ctx, width, height, timeDomainArray, primaryColor);
          break;
        case 'circle':
          drawCircle(ctx, width, height, dataArray, primaryColor, accentColor, smoothedRef.current);
          break;
        case 'particles':
          drawParticles(ctx, width, height, dataArray, primaryColor, particlesRef.current);
          break;
      }

      drawStaticTitle(ctx, width, height, title, subtitle, primaryColor, accentColor);
    };

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, config, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        borderRadius: 8,
        background: config.bgColor,
      }}
    />
  );
};

// ============================================================
// HELPERS
// ============================================================

function getFreqValue(
  data: Uint8Array,
  t: number,
  smoothed: number[],
  index: number
): number {
  // ✅ Utilise 65% des bins
  const usableBins = Math.floor(data.length * 0.65);

  // ✅ Échelle log AGRESSIVE pour bien étaler les basses (pow 2.2)
  const logPos = Math.pow(t, 2.2);
  const binIndex = Math.max(0, Math.min(usableBins - 1, Math.floor(logPos * usableBins)));

  // Moyenne sur 3 bins
  const idx0 = Math.max(0, binIndex - 1);
  const idx1 = Math.min(data.length - 1, binIndex);
  const idx2 = Math.min(data.length - 1, binIndex + 1);
  let value = (data[idx0] + data[idx1] + data[idx2]) / 3 / 255;

  // ✅ Boost log modéré (0.8 au lieu de 0.75)
  value = Math.pow(value, 0.8);

  // ✅ Compensation aigus BEAUCOUP plus douce (x1 → x1.4 seulement)
  const compensation = 1 + t * 0.4;
  value = value * compensation;

  // ✅ Baseline minimale : toutes les barres ont au moins 8% de hauteur
  value = Math.max(0.08, value);

  // ✅ Clamp
  value = Math.min(1, value);

  // Lissage temporel
  const prev = smoothed[index] || 0;
  const smoothed_value = value > prev ? value * 0.65 + prev * 0.35 : prev * 0.88 + value * 0.12;
  smoothed[index] = smoothed_value;

  return smoothed_value;
}

// ============================================================
// DESSINS
// ============================================================

function drawBars(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: Uint8Array,
  primary: string,
  accent: string,
  smoothed: number[]
) {
  const barCount = smoothed.length;
  const barWidth = W / barCount;
  const gap = barWidth * 0.2;
  const baseY = H * 0.75;
  const maxBarHeight = H * 0.45;

  for (let i = 0; i < barCount; i++) {
    const t = i / barCount;
    const value = getFreqValue(data, t, smoothed, i);
    const h = Math.max(6, value * maxBarHeight);
    const x = i * barWidth + gap / 2;

    const grad = ctx.createLinearGradient(0, baseY - h, 0, baseY);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, primary);

    ctx.fillStyle = grad;
    ctx.shadowBlur = 20;
    ctx.shadowColor = primary;
    ctx.fillRect(x, baseY - h, barWidth - gap, h);
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 0.15;
    ctx.fillRect(x, baseY, barWidth - gap, h * 0.4);
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  ctx.lineTo(W, baseY);
  ctx.stroke();
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: Uint8Array,
  primary: string
) {
  const midY = H / 2;
  const amplitude = H * 0.35;

  ctx.strokeStyle = primary;
  ctx.lineWidth = 4;
  ctx.shadowBlur = 24;
  ctx.shadowColor = primary;
  ctx.beginPath();

  const step = Math.max(1, Math.floor(data.length / W));
  for (let i = 0; i < data.length; i += step) {
    const x = (i / data.length) * W;
    const v = (data[i] - 128) / 128;
    const y = midY + v * amplitude;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(W, midY);
  ctx.stroke();
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: Uint8Array,
  primary: string,
  accent: string,
  smoothed: number[]
) {
  const cx = W / 2;
  const cy = H / 2;
  const baseRadius = Math.min(W, H) * 0.18;
  const maxSpike = Math.min(W, H) * 0.22;
  const barCount = smoothed.length;

  for (let i = 0; i < barCount; i++) {
    const t = i / barCount;
    const value = getFreqValue(data, t, smoothed, i);

    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
    const innerR = baseRadius;
    // ✅ Min spike de 20px pour que les traits soient toujours visibles
    const outerR = baseRadius + Math.max(20, value * maxSpike);

    const x1 = cx + Math.cos(angle) * innerR;
    const y1 = cy + Math.sin(angle) * innerR;
    const x2 = cx + Math.cos(angle) * outerR;
    const y2 = cy + Math.sin(angle) * outerR;

    ctx.strokeStyle = i % 4 === 0 ? accent : primary;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 16;
    ctx.shadowColor = primary;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Cercle interne
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: Uint8Array,
  primary: string,
  particles: Array<{ x: number; y: number; vx: number; vy: number; life: number }>
) {
  let bassEnergy = 0;
  for (let i = 0; i < 20; i++) bassEnergy += data[i] || 0;
  bassEnergy /= 20 * 255;

  if (bassEnergy > 0.35 && particles.length < 200) {
    const count = Math.floor(bassEnergy * 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particles.push({
        x: W / 2 + (Math.random() - 0.5) * 100,
        y: H / 2 + (Math.random() - 0.5) * 100,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
      });
    }
  }

  ctx.shadowBlur = 20;
  ctx.shadowColor = primary;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= 0.012;

    if (p.life <= 0 || p.x < 0 || p.x > W || p.y > H) {
      particles.splice(i, 1);
      continue;
    }

    ctx.globalAlpha = p.life;
    ctx.fillStyle = primary;
    const size = 4 + p.life * 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  const pulse = 60 + bassEnergy * 120;
  ctx.strokeStyle = primary;
  ctx.lineWidth = 4;
  ctx.shadowBlur = 30;
  ctx.shadowColor = primary;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawStaticTitle(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  title: string,
  subtitle: string,
  primary: string,
  accent: string
) {
  if (!title && !subtitle) return;

  const padding = 80;
  const baseY = H - padding;

  if (title) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.shadowBlur = 30;
    ctx.shadowColor = primary;
    ctx.fillText(title, padding, baseY);
    ctx.shadowBlur = 0;
  }

  if (subtitle) {
    ctx.fillStyle = accent;
    ctx.font = '600 32px "Inter", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(subtitle, padding, baseY + 50);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '600 20px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('WAVEFORGE PRO', W - padding, padding);
}