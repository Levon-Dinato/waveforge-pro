import { useEffect, useRef } from 'react';
import type { DetectedNote } from '../types';

interface Props {
  notes: DetectedNote[];
  duration: number;
  currentTime: number;
  onSeek: (t: number) => void;
}

const MIN_MIDI = 24;
const MAX_MIDI = 108;
const ROW_H = 6;

const TRACK_COLORS: Record<string, string> = {
  lead: '#7c5cff',
  bass: '#4ade80',
  harmony: '#ff5c9d',
  drums: '#f59e0b',
};

export function PianoRoll({ notes, duration, currentTime, onSeek }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W;
    canvas.height = H;

    // Fond
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    // Lignes horizontales (octaves)
    ctx.strokeStyle = '#1a1a24';
    ctx.lineWidth = 1;
    for (let m = MIN_MIDI; m <= MAX_MIDI; m += 12) {
      const y = H - ((m - MIN_MIDI) / (MAX_MIDI - MIN_MIDI)) * H;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    if (duration <= 0) return;

    // Notes
    for (const n of notes) {
      const x = (n.start / duration) * W;
      const w = Math.max(2, (n.duration / duration) * W);
      const y = H - ((n.midi - MIN_MIDI) / (MAX_MIDI - MIN_MIDI)) * H;
      const color = TRACK_COLORS[n.track ?? 'lead'] ?? '#7c5cff';

      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5 + (n.velocity / 127) * 0.5;
      ctx.fillRect(x, y - ROW_H / 2, w, ROW_H);

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Playhead
    const px = (currentTime / duration) * W;
    ctx.fillStyle = '#ff5c9d';
    ctx.fillRect(px - 1, 0, 2, H);
  }, [notes, duration, currentTime]);

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
        height: 380,
        borderRadius: 12,
        border: '1px solid #1e1e2a',
        cursor: 'crosshair',
        display: 'block',
        background: '#0a0a0f',
      }}
    />
  );
}