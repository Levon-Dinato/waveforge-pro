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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedDataRef = useRef<number[]>(new Array(80).fill(0));

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const formatTime = (t: number) => {
    if (!isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // ============================================================
  // HELPER : Convertit #RRGGBB en rgba(...)
  // ============================================================
  const hexToRgba = (hex: string, alpha: number) => {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // ============================================================
  // INIT AUDIO CONTEXT
  // ============================================================
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const initAudioContext = () => {
      if (audioCtxRef.current) return;
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.75;
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;
      } catch (e) {
        console.warn('AudioContext init:', e);
      }
    };

    const handlePlay = () => {
      initAudioContext();
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };

    audio.addEventListener('play', handlePlay);
    return () => audio.removeEventListener('play', handlePlay);
  }, []);

  // ============================================================
  // DESSIN DE LA WAVEFORM LED (SYMÉTRIQUE HAUT/BAS)
  // ============================================================
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const w = rect.width;
    const h = rect.height;
    const centerY = h / 2;

    ctx.clearRect(0, 0, w, h);

    const analyser = analyserRef.current;
    const barCount = 80;
    const barWidth = w / barCount;

    // Nombre de dots par barre (toujours IMPAIR pour avoir un dot central)
    // 11 dots = 5 en haut + 1 au centre + 5 en bas
    const dotCount = compact ? 7 : 11;
    const dotSize = compact ? 3 : 3.5;
    const dotGap = 2;

    // ============================================================
    // RÉCUPÉRATION DES DONNÉES AUDIO
    // ============================================================
    if (analyser && isPlaying) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      for (let i = 0; i < barCount; i++) {
        const t = i / barCount;
        const logIndex = Math.floor(Math.pow(t, 0.7) * (dataArray.length * 0.6));
        const value = dataArray[Math.min(logIndex, dataArray.length - 1)] / 255;
        const prev = smoothedDataRef.current[i] || 0;
        const smooth =
          value > prev ? value * 0.7 + prev * 0.3 : prev * 0.85 + value * 0.15;
        smoothedDataRef.current[i] = smooth;
      }
    } else {
      // État au repos : pattern LED sinusoïdal léger
      for (let i = 0; i < barCount; i++) {
        const t = i / barCount;
        const fakeValue = Math.abs(Math.sin(t * Math.PI * 4)) * 0.25 + 0.1;
        smoothedDataRef.current[i] = smoothedDataRef.current[i] * 0.7 + fakeValue * 0.3;
      }
    }

    const progressRatio = duration > 0 ? currentTime / duration : 0;

    // ============================================================
    // COULEURS
    // ============================================================
    const normalDotColor = 'rgba(74, 74, 85, 0.35)';
    const inactiveDotColor = 'rgba(74, 74, 85, 0.12)';

    const getDotColor = (amplitude: number, isPast: boolean): string => {
      if (!isPast) return normalDotColor;
      // Plus l'amplitude est élevée, plus le dot est lumineux
      const alpha = 0.4 + amplitude * 0.6;
      return hexToRgba(color, alpha);
    };

    // ============================================================
    // DESSIN : Barres symétriques de dots LED
    // ============================================================
    for (let i = 0; i < barCount; i++) {
      const value = Math.max(0.08, smoothedDataRef.current[i]);
      const isPast = i / barCount <= progressRatio;

      // Position X du centre de la barre
      const x = i * barWidth + barWidth / 2;

      // Nombre de dots à allumer depuis le centre vers l'extérieur
      // (0 = aucun, dotCount/2 = tous)
      const maxDotsFromCenter = Math.floor(dotCount / 2);
      const activeDots = Math.max(1, Math.round(value * maxDotsFromCenter));

      // ============================================================
      // DESSIN DES DOTS (du haut vers le bas)
      // ============================================================
      for (let d = 0; d < dotCount; d++) {
        // Position relative au centre : -maxDotsFromCenter à +maxDotsFromCenter
        const relPos = d - (dotCount - 1) / 2;

        // Position Y absolue
        const y = centerY + relPos * (dotSize + dotGap);

        // Distance depuis le centre (0 = centre, maxDotsFromCenter = extrémité)
        const distanceFromCenter = Math.abs(relPos);

        // Le dot est-il allumé ?
        // Logique : les dots les plus proches du centre s'allument en premier
        const shouldLight = distanceFromCenter < activeDots;

        if (shouldLight) {
          // Dot allumé → couleur principale avec glow
          ctx.fillStyle = getDotColor(value, isPast);
          ctx.shadowBlur = isPast ? 6 : 0;
          ctx.shadowColor = color;
        } else if (distanceFromCenter === Math.floor(distanceFromCenter)) {
          // Dot éteint mais visible (contour fantôme)
          ctx.fillStyle = inactiveDotColor;
          ctx.shadowBlur = 0;
        } else {
          // Le dot central (distanceFromCenter peut être .5 pour dotCount pair)
          ctx.fillStyle = inactiveDotColor;
          ctx.shadowBlur = 0;
        }

        // Dessine le dot (rond)
        ctx.beginPath();
        ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
    }

    // Continue l'animation si on joue
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(drawWaveform);
    }
  }, [color, isPlaying, currentTime, duration, compact]);

  // ============================================================
  // LANCEMENT DE L'ANIMATION
  // ============================================================
  useEffect(() => {
    drawWaveform();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, currentTime, drawWaveform]);

  // Redessine au repos
  useEffect(() => {
    if (!isPlaying) {
      drawWaveform();
    }
  }, [isPlaying, duration, drawWaveform]);

  // ============================================================
  // ÉVÉNEMENTS AUDIO
  // ============================================================
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // ============================================================
  // ACTIONS
  // ============================================================
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0d14 100%)',
        border: `1px solid ${color}30`,
        borderRadius: 12,
        padding: compact ? 10 : 16,
        fontFamily: "'Inter', -apple-system, sans-serif",
        boxShadow: `0 4px 24px ${color}15, inset 0 1px 0 rgba(255,255,255,0.03)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Halo décoratif */}
      <div
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />

      {/* Titre / Sous-titre */}
      {(title || subtitle) && (
        <div style={{ marginBottom: 12, position: 'relative', minWidth: 0 }}>
          {title && (
            <div
              style={{
                fontSize: compact ? 11 : 12,
                color: '#fff',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </div>
          )}
          {subtitle && (
            <div
              style={{
                fontSize: 9,
                color: '#666',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}

      {/* WAVEFORM LED */}
      <div
        onClick={handleSeek}
        style={{
          height: compact ? 44 : 60,
          marginBottom: 12,
          cursor: 'pointer',
          position: 'relative',
          borderRadius: 8,
          overflow: 'hidden',
          background: 'rgba(0, 0, 0, 0.35)',
        }}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>

      {/* Barre de progression + Temps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span className="mono" style={{ fontSize: 10, color: '#888', minWidth: 32, textAlign: 'right' }}>
          {formatTime(currentTime)}
        </span>

        <div
          onClick={handleSeek}
          style={{
            flex: 1,
            height: 3,
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: 2,
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${color}80, ${color})`,
              borderRadius: 2,
              transition: 'width 0.1s linear',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${progress}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 10px ${color}, 0 0 4px #fff`,
              transition: 'left 0.1s linear',
            }}
          />
        </div>

        <span className="mono" style={{ fontSize: 10, color: '#888', minWidth: 32 }}>
          {formatTime(duration)}
        </span>
      </div>

      {/* Contrôles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={togglePlay}
          style={{
            width: compact ? 36 : 44,
            height: compact ? 36 : 44,
            borderRadius: '50%',
            border: 'none',
            background: `linear-gradient(135deg, ${color}, ${color}bb)`,
            color: '#000',
            fontSize: compact ? 14 : 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 20px ${color}60, inset 0 1px 0 rgba(255,255,255,0.3)`,
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = `0 0 30px ${color}90, inset 0 1px 0 rgba(255,255,255,0.3)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = `0 0 20px ${color}60, inset 0 1px 0 rgba(255,255,255,0.3)`;
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12, opacity: 0.6 }}>🔊</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            style={{ flex: 1, minWidth: 60, accentColor: color, height: 4 }}
          />
          <span className="mono" style={{ fontSize: 9, color: '#666', minWidth: 26, textAlign: 'right' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>

        {onDownload && (
          <button
            onClick={onDownload}
            className="btn-action"
            style={{
              padding: '6px 12px',
              fontSize: 10,
              color,
              borderColor: `${color}40`,
              background: `${color}10`,
              flexShrink: 0,
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}
          >
            💾 WAV
          </button>
        )}
      </div>
    </div>
  );
};