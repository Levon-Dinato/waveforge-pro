// src/components/SpectrumVisualizer.tsx
import React, { useRef, useEffect } from 'react';

interface SpectrumVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  height?: number;
  color?: string;
  barCount?: number;
  style?: React.CSSProperties;
}

export const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({
  analyser,
  isActive,
  height = 140,
  color = '#7c5cff',
  barCount = 64,
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

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

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, w, h);
      drawGrid();

      if (!analyser || !dataArray) return;

      analyser.getByteFrequencyData(dataArray);

      const barWidth = w / barCount;
      const gap = Math.max(1, barWidth * 0.18);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i];
        const percent = value / 255;
        const barHeight = Math.max(2, percent * h * 0.92);
        const x = i * barWidth;
        const y = h - barHeight;

        const gradient = ctx.createLinearGradient(0, y, 0, h);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.6, `${color}bb`);
        gradient.addColorStop(1, `${color}22`);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - gap, barHeight);

        if (percent > 0.08) {
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.7;
          ctx.fillRect(x, y - 1, barWidth - gap, 1.5);
          ctx.globalAlpha = 1;
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
        ctx.fillStyle = `${color}25`;
        ctx.fillRect(i * barWidth, h - 2, barWidth - 2, 2);
      }
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isActive, color, barCount]);

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
    </div>
  );
};