// src/components/AudioPlayer.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';

interface AudioPlayerProps {
  src: string;
  title?: string;
  subtitle?: string;
  color?: string;
  onDownload?: () => void;
  compact?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  title,
  subtitle,
  color = '#00ff88',
  onDownload,
  compact = false,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothRef = useRef<number[]>(new Array(60).fill(0));

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const fmt = (t: number) => {
    if (!isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Init audio context au premier play
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const init = () => {
      if (audioCtxRef.current) return;
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
      } catch (e) {}
    };
    const onPlay = () => {
      init();
      audioCtxRef.current?.resume();
    };
    audio.addEventListener('play', onPlay);
    return () => audio.removeEventListener('play', onPlay);
  }, []);

  // Événements audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => setDuration(audio.duration);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => { setIsPlaying(false); setCurrentTime(0); };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  // DESSIN SIMPLE ET RAPIDE
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 800;
    const H = compact ? 60 : 80;
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== W * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, W, H);

    const centerY = H / 2;
    const SIDE = 4;           // 4 dots en haut + 4 en bas
    const DOT = compact ? 4 : 5;
    const spacing = (H - 12 - DOT) / (SIDE * 2);
    const bars = 60;
    const barW = W / bars;

    // Récupère les données audio
    const analyser = analyserRef.current;
    if (analyser && isPlaying) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      for (let i = 0; i < bars; i++) {
        const t = i / bars;
        // Échelle log pour mieux répartir
        const idx = Math.floor(Math.pow(t, 1.5) * data.length * 0.7);
        let v = data[Math.min(idx, data.length - 1)] / 255;
        // Amplif progressif vers la droite (compense la chute des aigus)
        v = Math.min(1, v * (1 + t * 1.5) * 1.6);
        // Lissage : montée rapide, descente douce
        const prev = smoothRef.current[i] || 0;
        smoothRef.current[i] = v > prev ? v * 0.7 + prev * 0.3 : prev * 0.85 + v * 0.15;
      }
    } else {
      // Au repos : petite vague sinusoïdale
      for (let i = 0; i < bars; i++) {
        const fake = Math.abs(Math.sin((i / bars) * Math.PI * 3)) * 0.3 + 0.15;
        smoothRef.current[i] = smoothRef.current[i] * 0.7 + fake * 0.3;
      }
    }

    const progress = duration > 0 ? currentTime / duration : 0;

    // Dessine chaque barre
    for (let i = 0; i < bars; i++) {
      const v = Math.max(0.15, smoothRef.current[i]);
      const isPast = i / bars <= progress;
      const x = i * barW + barW / 2;
      const active = Math.round(v * SIDE);

      // Dessine les dots du haut en bas (offset -4 à +4)
      for (let d = -SIDE; d <= SIDE; d++) {
        const y = centerY + d * spacing;
        const lit = Math.abs(d) <= active;

        // Couleur
        if (lit && isPast) {
          ctx.fillStyle = color;
          ctx.shadowBlur = 5;
          ctx.shadowColor = color;
        } else if (lit) {
          ctx.fillStyle = 'rgba(120,120,135,0.5)';
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = 'rgba(74,74,85,0.15)';
          ctx.shadowBlur = 0;
        }

        ctx.fillRect(x - DOT / 2, y - DOT / 2, DOT, DOT);
      }
    }

    ctx.shadowBlur = 0;

    if (isPlaying) rafRef.current = requestAnimationFrame(draw);
  }, [color, isPlaying, currentTime, duration, compact]);

  // Boucle d'animation
  useEffect(() => {
    draw();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [draw]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    a.paused ? a.play().catch(() => {}) : a.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    a.currentTime = ratio * duration;
    setCurrentTime(a.currentTime);
  };

  const changeVol = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0a0a0f, #0d0d14)',
        border: `1px solid ${color}30`,
        borderRadius: 12,
        padding: compact ? 10 : 16,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />

      {(title || subtitle) && (
        <div style={{ marginBottom: 10 }}>
          {title && <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 9, color: '#666', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
        </div>
      )}

      {/* Waveform */}
      <div
        onClick={seek}
        style={{
          height: compact ? 60 : 80,
          marginBottom: 10,
          cursor: 'pointer',
          borderRadius: 8,
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.35)',
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>

      {/* Progression */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span className="mono" style={{ fontSize: 10, color: '#888', minWidth: 32, textAlign: 'right' }}>{fmt(currentTime)}</span>
        <div onClick={seek} style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, cursor: 'pointer', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress}%`, background: color, borderRadius: 2 }} />
          <div style={{ position: 'absolute', left: `${progress}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
        </div>
        <span className="mono" style={{ fontSize: 10, color: '#888', minWidth: 32 }}>{fmt(duration)}</span>
      </div>

      {/* Contrôles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={togglePlay}
          style={{
            width: compact ? 34 : 42,
            height: compact ? 34 : 42,
            borderRadius: '50%',
            border: 'none',
            background: color,
            color: '#000',
            fontSize: compact ? 14 : 16,
            cursor: 'pointer',
            boxShadow: `0 0 20px ${color}60`,
            flexShrink: 0,
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <span style={{ fontSize: 12, opacity: 0.6 }}>🔊</span>
          <input type="range" min={0} max={1} step={0.01} value={volume} onChange={changeVol} style={{ flex: 1, accentColor: color, height: 4 }} />
          <span className="mono" style={{ fontSize: 9, color: '#666', minWidth: 26, textAlign: 'right' }}>{Math.round(volume * 100)}%</span>
        </div>

        {onDownload && (
          <button
            onClick={onDownload}
            className="btn-action"
            style={{ padding: '6px 12px', fontSize: 10, color, borderColor: `${color}40`, background: `${color}10`, flexShrink: 0, fontWeight: 600 }}
          >
            💾 WAV
          </button>
        )}
      </div>
    </div>
  );
};