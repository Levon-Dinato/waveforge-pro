// src/components/SpectrumVisualizer.tsx
import React, { useRef, useEffect } from 'react';

interface SpectrumVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  height?: number;
  color?: string;
  barCount?: number;
  style?: React.CSSProperties;
  colorByAmplitude?: boolean;
}

export const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({
  analyser,
  isActive,
  height = 140,
  color = '#7c5cff',
  barCount = 64,
  style,
  colorByAmplitude = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const peakHoldRef = useRef<number[]>(new Array(barCount).fill(0));
  const smoothedRef = useRef<number[]>(new Array(barCount).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = (h / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    };

    // ============================================================
    // COULEUR SELON L'AMPLITUDE
    // 0.0 → 0.55 : Vert (safe)
    // 0.55 → 0.80 : Jaune (hot)
    // 0.80 → 1.00 : Rouge (clip)
    // ============================================================
    const getColorByAmplitude = (value: number) => {
      if (value < 0.55) {
        const intensity = 0.5 + value * 0.5;
        return {
          top: `hsla(140, 90%, ${55 + intensity * 15}%, 1)`,
          mid: `hsla(140, 90%, 55%, 0.75)`,
          bottom: `hsla(140, 90%, 55%, 0.15)`,
        };
      } else if (value < 0.8) {
        const t = (value - 0.55) / 0.25;
        const hue = 140 - t * 100;
        return {
          top: `hsla(${hue}, 95%, 60%, 1)`,
          mid: `hsla(${hue}, 95%, 55%, 0.8)`,
          bottom: `hsla(${hue}, 95%, 55%, 0.15)`,
        };
      } else {
        const t = Math.min(1, (value - 0.8) / 0.2);
        const hue = 40 - t * 40;
        return {
          top: `hsla(${hue}, 100%, 60%, 1)`,
          mid: `hsla(${hue}, 100%, 55%, 0.9)`,
          bottom: `hsla(${hue}, 100%, 55%, 0.2)`,
        };
      }
    };

    const hexToRgba = (hex: string, alpha: number): string => {
      const c = hex.replace('#', '');
      const r = parseInt(c.substring(0, 2), 16);
      const g = parseInt(c.substring(2, 4), 16);
      const b = parseInt(c.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const getClassicColor = (value: number) => ({
      top: hexToRgba(color, 0.6 + value * 0.4),
      mid: hexToRgba(color, 0.5),
      bottom: hexToRgba(color, 0.1),
    });

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, w, h);
      drawGrid();

      if (!analyser || !dataArray) return;

      analyser.getByteFrequencyData(dataArray);

      const barWidth = w / barCount;
      const gap = Math.max(1, barWidth * 0.18);
      const CLIPPING_THRESHOLD = 0.9;

      // ============================================================
      // ÉCHELLE LINÉAIRE : toute la largeur remplie
      // ============================================================
      const usableBins = Math.floor(dataArray.length * 0.20);

      for (let i = 0; i < barCount; i++) {
        const t = i / barCount;
        // ✅ Échelle linéaire
        const binIndex = Math.floor(t * usableBins);

        const idx0 = Math.max(0, binIndex - 1);
        const idx1 = Math.min(dataArray.length - 1, binIndex);
        const idx2 = Math.min(dataArray.length - 1, binIndex + 1);

        let value = (dataArray[idx0] + dataArray[idx1] + dataArray[idx2]) / 3 / 255;

        // Boost léger pour les petites valeurs
        value = Math.pow(value, 0.85);

        // Amplification modérée
        value = Math.min(1, value * 1.2);

        // Lissage temporel (montée rapide, descente douce)
        const prev = smoothedRef.current[i] || 0;
        const smooth = value > prev ? value * 0.65 + prev * 0.35 : prev * 0.88 + value * 0.12;
        smoothedRef.current[i] = smooth;

        const percent = smooth;
        const barHeight = Math.max(3, percent * h * 0.92);
        const x = i * barWidth;
        const y = h - barHeight;

        const colors = colorByAmplitude
          ? getColorByAmplitude(percent)
          : getClassicColor(percent);

        const gradient = ctx.createLinearGradient(0, y, 0, h);
        gradient.addColorStop(0, colors.top);
        gradient.addColorStop(0.6, colors.mid);
        gradient.addColorStop(1, colors.bottom);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - gap, barHeight);

        // Halo rouge si saturation
        if (colorByAmplitude && percent > CLIPPING_THRESHOLD) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ff2222';
          ctx.fillStyle = `rgba(255, 60, 60, ${0.7 + (percent - CLIPPING_THRESHOLD) * 1.2})`;
          ctx.fillRect(x, y - 2, barWidth - gap, 3);
          ctx.shadowBlur = 0;
        }

        // Peak hold discret
        const currentPeak = peakHoldRef.current[i] || 0;
        const newPeak = Math.max(percent, currentPeak - 0.012);
        peakHoldRef.current[i] = newPeak;

        if (newPeak > 0.15) {
          const peakY = h - newPeak * h * 0.92;
          ctx.fillStyle = `rgba(255, 255, 255, ${newPeak > CLIPPING_THRESHOLD ? 0.9 : 0.3})`;
          ctx.fillRect(x, peakY - 1, barWidth - gap, 1);
        }
      }
    };

    if (isActive) {
      draw();
    } else {
      ctx.clearRect(0, 0, w, h);
      drawGrid();

      const barWidth = w / barCount;
      for (let i = 0; i < barCount; i++) {
        ctx.fillStyle = colorByAmplitude
          ? 'rgba(0, 200, 100, 0.15)'
          : hexToRgba(color, 0.15);
        ctx.fillRect(i * barWidth, h - 2, barWidth - 2, 2);
      }
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isActive, color, barCount, colorByAmplitude]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        background: 'linear-gradient(180deg, #080808 0%, #0d0d0d 100%)',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #1f1f1f',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {!isActive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: '#444',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '2px',
            pointerEvents: 'none',
          }}
        >
          ▶ EN ATTENTE DE LECTURE
        </div>
      )}

      {colorByAmplitude && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 8,
            display: 'flex',
            gap: 8,
            fontSize: 8,
            fontFamily: 'var(--font-mono)',
            color: '#666',
            pointerEvents: 'none',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d96a' }} />
            SAFE
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffc800' }} />
            HOT
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff2222' }} />
            CLIP
          </span>
        </div>
      )}
    </div>
  );
};