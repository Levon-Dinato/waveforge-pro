// src/components/cdj/WaveformDisplay.tsx
import React, { useRef, useEffect } from 'react';
import type { BeatGrid } from '../../hooks/useBeatGrid';

interface WaveformDisplayProps {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  grid: BeatGrid;
  hotCues: Array<{ id: number; position: number; color: string } | null>;
  activeHotCue: number | null;
  loopStart: number | null;
  loopEnd: number | null;
  color?: string;
  height?: number;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  audioBuffer,
  currentTime,
  duration,
  grid,
  hotCues,
  activeHotCue,
  loopStart,
  loopEnd,
  color = '#00d9ff',
  height = 90,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformDataRef = useRef<{
    low: Float32Array;
    mid: Float32Array;
    high: Float32Array;
  } | null>(null);

  // Prépare les données de waveform
  useEffect(() => {
    if (!audioBuffer) {
      waveformDataRef.current = null;
      return;
    }

    const width = 800;
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.floor(channelData.length / width);

    const low = new Float32Array(width);
    const mid = new Float32Array(width);
    const high = new Float32Array(width);

    for (let i = 0; i < width; i++) {
      let lowSum = 0;
      let midSum = 0;
      let highSum = 0;
      for (let j = 0; j < step; j++) {
        const sample = Math.abs(channelData[i * step + j] || 0);
        lowSum += sample;
        midSum += sample;
        highSum += sample;
      }
      low[i] = Math.min(1, lowSum / step);
      mid[i] = Math.min(1, midSum / step);
      high[i] = Math.min(1, highSum / step);
    }

    waveformDataRef.current = { low, mid, high };
  }, [audioBuffer]);

  // Dessin
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const W = rect.width;
    const H = height;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);

    const data = waveformDataRef.current;
    const zoomFactor = 4;

    if (data && duration > 0) {
      const zoomWidth = W * zoomFactor;
      const scrollOffset = (currentTime / duration) * zoomWidth - W / 2;

      // Beat grid
      if (grid.beats.length > 0) {
        const beatDur = grid.beatDuration;
        const pixelsPerBeat = (beatDur / duration) * zoomWidth;

        if (pixelsPerBeat > 3) {
          const firstVisibleBeat = Math.max(
            0,
            Math.floor((scrollOffset / zoomWidth) * (duration / beatDur)) - 2
          );
          const lastBeat = Math.min(
            grid.beats.length - 1,
            Math.ceil(((scrollOffset + W) / zoomWidth) * (duration / beatDur)) + 2
          );

          for (let i = firstVisibleBeat; i <= lastBeat; i++) {
            const beatTime = grid.beats[i];
            const x = (beatTime / duration) * zoomWidth - scrollOffset;
            if (x < -5 || x > W + 5) continue;

            const isDownbeat = i % 4 === 0;

            ctx.strokeStyle = isDownbeat
              ? 'rgba(255, 255, 255, 0.35)'
              : 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = isDownbeat ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
          }
        }
      }

      // Waveform
      const drawBand = (
        values: Float32Array,
        yTop: number,
        yBottom: number,
        col: string
      ) => {
        ctx.fillStyle = col;
        for (let x = 0; x < W; x++) {
          const waveX = (x + scrollOffset) / zoomWidth;
          const idx = Math.floor(waveX * values.length);
          if (idx < 0 || idx >= values.length) continue;
          const val = values[idx];
          const h = val * (yBottom - yTop);
          ctx.fillRect(x, (yTop + yBottom) / 2 - h / 2, 1, h);
        }
      };

      drawBand(data.high, 4, H * 0.28, '#ff6b35');
      drawBand(data.mid, H * 0.35, H * 0.62, '#ffd43b');
      drawBand(data.low, H * 0.68, H - 4, '#00a8ff');
    } else {
      ctx.fillStyle = '#333';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CHARGER UN MORCEAU', W / 2, H / 2);
    }

    // Hot cue markers
    const zoomWidth = W * zoomFactor;
    const scrollOffset = (currentTime / duration) * zoomWidth - W / 2;

    hotCues.forEach((cue, idx) => {
      if (!cue || duration <= 0) return;
      const x = (cue.position / duration) * zoomWidth - scrollOffset;
      if (x < -10 || x > W + 10) return;

      const isActive = activeHotCue === idx;

      ctx.fillStyle = isActive ? '#fff' : cue.color;
      ctx.shadowBlur = isActive ? 14 : 6;
      ctx.shadowColor = cue.color;
      ctx.fillRect(x - 1.5, 0, 3, H);
      ctx.fillStyle = cue.color;
      ctx.fillRect(x - 6, 0, 12, 12);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String.fromCharCode(65 + idx), x, 6);
    });

    // Loop zone
    if (loopStart !== null && loopEnd !== null && duration > 0) {
      const x1 = (loopStart / duration) * zoomWidth - scrollOffset;
      const x2 = (loopEnd / duration) * zoomWidth - scrollOffset;
      ctx.fillStyle = 'rgba(0, 217, 255, 0.12)';
      ctx.fillRect(x1, 0, x2 - x1, H);
      ctx.strokeStyle = '#00d9ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(x1, 0, x2 - x1, H);
      ctx.setLineDash([]);
    }

    // Playhead
    const playheadX = W / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, H);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [currentTime, duration, grid, hotCues, activeHotCue, loopStart, loopEnd, color, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: `${height}px`,
        display: 'block',
        borderRadius: 3,
        background: '#050505',
        border: '1px solid #1a1a1a',
      }}
    />
  );
};