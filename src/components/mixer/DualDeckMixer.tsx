// src/components/mixer/DualDeckMixer.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  DualDeckEngine,
  type DeckId,
  type EQBand,
  type DeckState,
} from '../../audio/dualDeckEngine';

// ============================================================
// COULEURS
// ============================================================
const DECK_COLORS: Record<DeckId, string> = {
  A: '#00d9ff',
  B: '#00ff88',
};

// ============================================================
// WAVEFORM (avec beat grid)
// ============================================================
const Waveform: React.FC<{
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  bpm: number;
  color: string;
  height: number;
  overview?: boolean;
}> = ({ audioBuffer, currentTime, duration, bpm, color, height, overview = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    if (!audioBuffer || duration <= 0) {
      ctx.fillStyle = '#333';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NO TRACK', W / 2, H / 2);
      return;
    }

    const channelData = audioBuffer.getChannelData(0);
    const samplesPerPixel = Math.floor(channelData.length / W);
    const midY = H / 2;

    // Waveform
    ctx.fillStyle = color;
    for (let x = 0; x < W; x++) {
      let min = 1;
      let max = -1;
      const start = x * samplesPerPixel;
      const end = Math.min(start + samplesPerPixel, channelData.length);
      for (let i = start; i < end; i += 4) {
        const s = channelData[i];
        if (s < min) min = s;
        if (s > max) max = s;
      }
      const h = Math.max(1, (max - min) * midY * 0.9);
      ctx.fillRect(x, midY - h / 2, 1, h);
    }

    // Beat grid (si pas overview)
    if (!overview && bpm > 0) {
      const beatDur = 60 / bpm;
      const pixelsPerBeat = (beatDur / duration) * W;
      if (pixelsPerBeat > 4) {
        const numBeats = Math.floor(duration / beatDur);
        for (let i = 0; i < numBeats; i++) {
          const beatTime = i * beatDur;
          const x = (beatTime / duration) * W;
          const isDownbeat = i % 4 === 0;
          ctx.strokeStyle = isDownbeat
            ? 'rgba(255,255,255,0.25)'
            : 'rgba(255,255,255,0.08)';
          ctx.lineWidth = isDownbeat ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
      }
    }

    // Playhead
    const px = (currentTime / duration) * W;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, H);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [audioBuffer, currentTime, duration, bpm, color, height, overview]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: `${height}px`,
        display: 'block',
        background: '#0a0a0a',
      }}
    />
  );
};

// ============================================================
// TURNTABLE
// ============================================================
const Turntable: React.FC<{
  deckId: DeckId;
  isPlaying: boolean;
  progress: number;
  onLoadClick: () => void;
}> = ({ deckId, isPlaying, progress, onLoadClick }) => {
  const [rotation, setRotation] = useState(0);
  const rafRef = useRef<number | null>(null);
  const color = DECK_COLORS[deckId];

  useEffect(() => {
    if (!isPlaying) return;
    let last = performance.now();
    const spin = (now: number) => {
      const dt = now - last;
      last = now;
      setRotation((r) => r + dt * 0.3);
      rafRef.current = requestAnimationFrame(spin);
    };
    rafRef.current = requestAnimationFrame(spin);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  const size = 240;
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Progress ring */}
      <svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: 'stroke-dashoffset 0.15s linear',
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>

      {/* Vinyl */}
      <div
        onClick={onLoadClick}
        style={{
          width: size - 40,
          height: size - 40,
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, #1a1a1a 0%, #050505 70%, #151515 100%)`,
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
          transform: `rotate(${rotation}deg)`,
          cursor: 'pointer',
          boxShadow: `
            inset 0 0 40px rgba(0,0,0,0.9),
            0 8px 24px rgba(0,0,0,0.5),
            0 0 ${isPlaying ? '30px' : '10px'} ${color}${isPlaying ? '66' : '22'}
          `,
          transition: 'box-shadow 0.3s',
        }}
      >
        {/* Cercles gravés */}
        {[0.85, 0.7, 0.55, 0.42].map((scale) => (
          <div
            key={scale}
            style={{
              position: 'absolute',
              inset: `${(1 - scale) * 50}%`,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          />
        ))}

        {/* Marker */}
        <div
          style={{
            position: 'absolute',
            top: '5%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 3,
            height: 18,
            background: color,
            borderRadius: 2,
            boxShadow: `0 0 10px ${color}`,
          }}
        />

        {/* Centre */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '42%',
            height: '42%',
            borderRadius: '50%',
            background: `radial-gradient(circle at 40% 40%, #2a2a2a, #0a0a0a)`,
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color,
              fontFamily: 'monospace',
              letterSpacing: '2px',
              textShadow: `0 0 10px ${color}`,
            }}
          >
            {deckId}
          </div>
          <div
            style={{
              fontSize: 9,
              color: '#666',
              fontFamily: 'monospace',
              marginTop: 2,
            }}
          >
            {Math.round(progress * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// TEMPO SLIDER (vertical)
// ============================================================
const TempoSlider: React.FC<{
  value: number;
  onChange: (v: number) => void;
  color: string;
}> = ({ value, onChange, color }) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const update = (clientY: number) => {
      const percent = 1 - (clientY - rect.top) / rect.height;
      const v = (percent - 0.5) * 2 * 16;
      onChange(Math.max(-16, Math.min(16, v)));
    };
    update(e.clientY);
    const move = (ev: MouseEvent) => update(ev.clientY);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const position = ((16 - value) / 32) * 100;

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={() => onChange(0)}
      style={{
        width: 18,
        height: 200,
        background: 'linear-gradient(180deg, #0a0a0a, #151515, #0a0a0a)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 9,
        position: 'relative',
        cursor: 'ns-resize',
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)',
      }}
      title="Tempo · Double-clic = reset"
    >
      {/* Ligne centrale 0 */}
      <div
        style={{
          position: 'absolute',
          left: 3,
          right: 3,
          top: '50%',
          height: 1,
          background: 'rgba(255,255,255,0.15)',
        }}
      />
      {/* Curseur */}
      <div
        style={{
          position: 'absolute',
          left: '5%',
          right: '5%',
          top: `calc(${position}% - 9px)`,
          height: 18,
          background: 'linear-gradient(180deg, #e5e5e5, #888)',
          borderRadius: 3,
          boxShadow: `0 2px 6px rgba(0,0,0,0.7), 0 0 8px ${color}44`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

// ============================================================
// VU METER
// ============================================================
const VUMeter: React.FC<{
  level: number; // 0 à 1
  segments?: number;
}> = ({ level, segments = 16 }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 2,
        width: 14,
      }}
    >
      {Array.from({ length: segments }).map((_, i) => {
        const threshold = (i + 1) / segments;
        const isActive = level >= threshold;
        const isRed = i >= segments - 2;
        const isYellow = i >= segments - 6 && i < segments - 2;
        const color = isRed ? '#ff3366' : isYellow ? '#ffd43b' : '#00ff88';
        return (
          <div
            key={i}
            style={{
              height: 4,
              borderRadius: 1,
              background: isActive ? color : 'rgba(255,255,255,0.05)',
              boxShadow: isActive ? `0 0 4px ${color}` : 'none',
              transition: 'all 0.05s',
            }}
          />
        );
      })}
    </div>
  );
};

// ============================================================
// BEAT LED
// ============================================================
const BeatLEDs: React.FC<{
  bpm: number;
  isPlaying: boolean;
  currentTime: number;
  color: string;
}> = ({ bpm, isPlaying, currentTime, color }) => {
  const beatDuration = 60 / bpm;
  const beatInBar = isPlaying
    ? Math.floor((currentTime / beatDuration) % 4)
    : -1;

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: beatInBar === i ? color : 'rgba(255,255,255,0.1)',
            boxShadow: beatInBar === i ? `0 0 10px ${color}` : 'none',
            transition: 'all 0.05s',
          }}
        />
      ))}
    </div>
  );
};

// ============================================================
// EQ KNOB
// ============================================================
const EQKnob: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}> = ({ label, value, onChange, color }) => {
  const dragRef = useRef<{ y: number; val: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { y: e.clientY, val: value };
    const move = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = (dragRef.current.y - ev.clientY) / 80;
      const newVal = Math.max(-1, Math.min(1, dragRef.current.val + delta));
      onChange(newVal);
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const angle = value * 135;
  const isActive = Math.abs(value) > 0.01;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{ fontSize: 8, color: '#666', fontWeight: 700, letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={() => onChange(0)}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #2a2a2a, #0a0a0a)',
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          cursor: 'ns-resize',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4)',
        }}
        title="Glisse · Double-clic = reset"
      >
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '50%',
            transformOrigin: '50% 200%',
            transform: `translateX(-50%) rotate(${angle}deg)`,
            width: 2,
            height: 10,
            background: isActive ? color : '#666',
            borderRadius: 1,
            boxShadow: isActive ? `0 0 6px ${color}` : 'none',
          }}
        />
      </div>
      <div
        style={{
          fontSize: 8,
          fontFamily: 'monospace',
          color: !isActive ? '#666' : value > 0 ? '#00ff88' : '#ff3366',
          minWidth: 20,
          textAlign: 'center',
        }}
      >
        {value > 0 ? '+' : ''}
        {Math.round(value * 12)}
      </div>
    </div>
  );
};

// ============================================================
// VOLUME KNOB
// ============================================================
const VolumeKnob: React.FC<{
  value: number;
  onChange: (v: number) => void;
  color: string;
}> = ({ value, onChange, color }) => {
  const dragRef = useRef<{ y: number; val: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { y: e.clientY, val: value };
    const move = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = (dragRef.current.y - ev.clientY) / 100;
      const newVal = Math.max(0, Math.min(1, dragRef.current.val + delta));
      onChange(newVal);
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const angle = -135 + value * 270;

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #2a2a2a, #0a0a0a)',
        border: '1.5px solid rgba(255,255,255,0.1)',
        position: 'relative',
        cursor: 'ns-resize',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.7), 0 3px 8px rgba(0,0,0,0.5)',
      }}
      title="Volume"
    >
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transformOrigin: '50% 200%',
          transform: `translateX(-50%) rotate(${angle}deg)`,
          width: 2,
          height: 12,
          background: color,
          borderRadius: 1,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
    </div>
  );
};

// ============================================================
// CROSSFADER
// ============================================================
const Crossfader: React.FC<{
  value: number;
  onChange: (v: number) => void;
}> = ({ value, onChange }) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const update = (clientX: number) => {
      const percent = (clientX - rect.left) / rect.width;
      const v = (percent - 0.5) * 2;
      onChange(Math.max(-1, Math.min(1, v)));
    };
    update(e.clientX);
    const move = (ev: MouseEvent) => update(ev.clientX);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const position = ((value + 1) / 2) * 100;

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={() => onChange(0)}
      style={{
        width: 300,
        height: 24,
        background: 'linear-gradient(180deg, #0a0a0a, #151515)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        position: 'relative',
        cursor: 'ew-resize',
        boxShadow: 'inset 0 0 12px rgba(0,0,0,0.8)',
      }}
      title="Crossfader · Double-clic = centre"
    >
      {/* Ligne centrale */}
      <div
        style={{
          position: 'absolute',
          top: 3,
          bottom: 3,
          left: '50%',
          width: 1,
          background: 'rgba(255,255,255,0.15)',
        }}
      />
      {/* Curseur */}
      <div
        style={{
          position: 'absolute',
          top: -3,
          bottom: -3,
          left: `calc(${position}% - 22px)`,
          width: 44,
          background: 'linear-gradient(180deg, #e5e5e5, #999)',
          borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,255,255,0.5)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

// ============================================================
// TRANSPORT BUTTON
// ============================================================
const TransportButton: React.FC<{
  label: string;
  active?: boolean;
  color: string;
  onClick: () => void;
  large?: boolean;
}> = ({ label, active = false, color, onClick, large = false }) => (
  <button
    onClick={onClick}
    style={{
      flex: large ? 2 : 1,
      minWidth: large ? 80 : 60,
      height: large ? 48 : 40,
      padding: '8px',
      background: active
        ? `linear-gradient(180deg, ${color}44, ${color}11)`
        : 'linear-gradient(180deg, #1a1a1a, #0a0a0a)',
      border: `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 5,
      color: active ? color : '#888',
      fontSize: large ? 14 : 10,
      fontWeight: 700,
      fontFamily: 'monospace',
      letterSpacing: '0.5px',
      cursor: 'pointer',
      boxShadow: active ? `0 0 12px ${color}55` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
      transition: 'all 0.15s',
    }}
  >
    {label}
  </button>
);

// ============================================================
// MAIN COMPONENT
// ============================================================
export const DualDeckMixer: React.FC<{ audioContext: AudioContext | null }> = ({
  audioContext,
}) => {
  const engineRef = useRef<DualDeckEngine | null>(null);
  const [states, setStates] = useState<{
    A: DeckState;
    B: DeckState;
    crossfader: number;
  } | null>(null);
  const [eqs, setEqs] = useState<Record<DeckId, { hi: number; mid: number; lo: number }>>({
    A: { hi: 0, mid: 0, lo: 0 },
    B: { hi: 0, mid: 0, lo: 0 },
  });
  const [volumes, setVolumes] = useState<Record<DeckId, number>>({ A: 0.9, B: 0.9 });
  const [tempos, setTempos] = useState<Record<DeckId, number>>({ A: 0, B: 0 });
  const [vuLevels, setVuLevels] = useState<Record<DeckId, number>>({ A: 0, B: 0 });

  const fileInputRefs = {
    A: useRef<HTMLInputElement>(null),
    B: useRef<HTMLInputElement>(null),
  };

  // Init engine
  useEffect(() => {
    if (!audioContext) return;
    const engine = new DualDeckEngine(audioContext);
    engineRef.current = engine;
    setStates(engine.getAllState());
    const unsubscribe = engine.subscribe((s) => setStates(s));
    return () => {
      unsubscribe();
      engine.destroy();
    };
  }, [audioContext]);

  // VU meter animation (simulée à partir de la waveform actuelle)
  useEffect(() => {
    if (!states) return;
    const interval = setInterval(() => {
      setVuLevels({
        A: states.A.isPlaying ? Math.min(1, 0.3 + Math.random() * 0.6) : 0,
        B: states.B.isPlaying ? Math.min(1, 0.3 + Math.random() * 0.6) : 0,
      });
    }, 80);
    return () => clearInterval(interval);
  }, [states]);

  const handleLoad = async (deckId: DeckId, file: File) => {
    if (!engineRef.current) return;
    await engineRef.current.loadTrack(deckId, file);
    setStates(engineRef.current.getAllState());
  };

  const handleEQ = (deckId: DeckId, band: EQBand, value: number) => {
    setEqs((p) => ({ ...p, [deckId]: { ...p[deckId], [band]: value } }));
    engineRef.current?.setEQ(deckId, band, value);
  };

  const handleVolume = (deckId: DeckId, value: number) => {
    setVolumes((p) => ({ ...p, [deckId]: value }));
    engineRef.current?.setVolume(deckId, value);
  };

  const handleTempo = (deckId: DeckId, value: number) => {
    setTempos((p) => ({ ...p, [deckId]: value }));
    engineRef.current?.setTempo(deckId, value);
  };

  if (!states) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>
        Initialisation du moteur audio...
      </div>
    );
  }

  const formatTime = (s: number) => {
    if (!isFinite(s) || s < 0) return '-0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `-${m}:${String(sec).padStart(2, '0')}`;
  };

  const renderDeckColumn = (deckId: DeckId) => {
    const state = states[deckId];
    const color = DECK_COLORS[deckId];
    const progress = state.duration > 0 ? state.currentTime / state.duration : 0;
    const timeRemaining = Math.max(0, state.duration - state.currentTime);
    const isLeft = deckId === 'A';

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexDirection: isLeft ? 'row' : 'row-reverse',
        }}
      >
        {/* Tempo slider */}
        <TempoSlider
          value={tempos[deckId]}
          onChange={(v) => handleTempo(deckId, v)}
          color={color}
        />

        {/* Turntable + info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              fontSize: 11,
              color,
              fontWeight: 700,
              fontFamily: 'monospace',
              letterSpacing: '0.5px',
            }}
          >
            {tempos[deckId] > 0 ? '+' : ''}
            {tempos[deckId].toFixed(1)}%
          </div>
          <Turntable
            deckId={deckId}
            isPlaying={state.isPlaying}
            progress={progress}
            onLoadClick={() => fileInputRefs[deckId].current?.click()}
          />
          <input
            ref={fileInputRefs[deckId]}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLoad(deckId, file);
              e.target.value = '';
            }}
          />
          <div
            style={{
              fontSize: 10,
              color: '#888',
              fontFamily: 'monospace',
              display: 'flex',
              gap: 12,
            }}
          >
            <span>{formatTime(timeRemaining)}</span>
            <span style={{ color }}>{state.bpm > 0 ? `${state.bpm.toFixed(1)} BPM` : '— BPM'}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        padding: 16,
        background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #050505 100%)',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          background: 'linear-gradient(180deg, #141414 0%, #0a0a0a 100%)',
          borderRadius: 12,
          padding: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* ============================================================ */}
        {/* HEADER : Track info A + B */}
        {/* ============================================================ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: 16,
            marginBottom: 12,
            alignItems: 'center',
          }}
        >
          {/* Deck A info */}
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontSize: 9,
                color: '#666',
                letterSpacing: '1px',
                fontWeight: 700,
                marginBottom: 2,
              }}
            >
              DECK A
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {states.A.fileName.replace(/\.[^.]+$/, '') || 'No track loaded'}
            </div>
          </div>

          {/* Beat LEDs central */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <BeatLEDs
              bpm={states.A.bpm || 120}
              isPlaying={states.A.isPlaying}
              currentTime={states.A.currentTime}
              color={DECK_COLORS.A}
            />
            <BeatLEDs
              bpm={states.B.bpm || 120}
              isPlaying={states.B.isPlaying}
              currentTime={states.B.currentTime}
              color={DECK_COLORS.B}
            />
          </div>

          {/* Deck B info */}
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 9,
                color: '#666',
                letterSpacing: '1px',
                fontWeight: 700,
                marginBottom: 2,
              }}
            >
              DECK B
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {states.B.fileName.replace(/\.[^.]+$/, '') || 'No track loaded'}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* WAVEFORMS */}
        {/* ============================================================ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 4,
            marginBottom: 4,
          }}
        >
          <div style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Waveform
              audioBuffer={states.A.buffer}
              currentTime={states.A.currentTime}
              duration={states.A.duration}
              bpm={states.A.bpm}
              color={DECK_COLORS.A}
              height={60}
            />
          </div>
          <div style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Waveform
              audioBuffer={states.B.buffer}
              currentTime={states.B.currentTime}
              duration={states.B.duration}
              bpm={states.B.bpm}
              color={DECK_COLORS.B}
              height={60}
            />
          </div>
        </div>

        {/* OVERVIEW WAVEFORMS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 4,
            marginBottom: 16,
          }}
        >
          <div style={{ borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)' }}>
            <Waveform
              audioBuffer={states.A.buffer}
              currentTime={states.A.currentTime}
              duration={states.A.duration}
              bpm={states.A.bpm}
              color={DECK_COLORS.A}
              height={24}
              overview
            />
          </div>
          <div style={{ borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)' }}>
            <Waveform
              audioBuffer={states.B.buffer}
              currentTime={states.B.currentTime}
              duration={states.B.duration}
              bpm={states.B.bpm}
              color={DECK_COLORS.B}
              height={24}
              overview
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* MAIN SECTION : Deck A | Mixer center | Deck B */}
        {/* ============================================================ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: 20,
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          {renderDeckColumn('A')}

          {/* Center mixer */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <VUMeter level={vuLevels.A} />
            <div
              style={{
                fontSize: 8,
                color: '#666',
                letterSpacing: '1px',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              MIX
            </div>
            <VUMeter level={vuLevels.B} />
          </div>

          {renderDeckColumn('B')}
        </div>

        {/* ============================================================ */}
        {/* TRANSPORT + CROSSFADER */}
        {/* ============================================================ */}
        <div style={{ marginBottom: 16 }}>
          {/* Transport rows */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 40,
              marginBottom: 12,
            }}
          >
            {/* Deck A transport */}
            <div style={{ display: 'flex', gap: 6 }}>
              <TransportButton
                label="SYNC"
                color={DECK_COLORS.A}
                onClick={() => {}}
              />
              <TransportButton
                label={states.A.isPlaying ? '❚❚' : '▶'}
                active={states.A.isPlaying}
                color={DECK_COLORS.A}
                onClick={() => engineRef.current?.toggle('A')}
                large
              />
              <TransportButton label="SET" color={DECK_COLORS.A} onClick={() => {}} />
              <TransportButton
                label="CUE"
                color={DECK_COLORS.A}
                onClick={() => engineRef.current?.stop('A')}
              />
            </div>

            {/* Deck B transport */}
            <div style={{ display: 'flex', gap: 6 }}>
              <TransportButton
                label={states.B.isPlaying ? '❚❚' : '▶'}
                active={states.B.isPlaying}
                color={DECK_COLORS.B}
                onClick={() => engineRef.current?.toggle('B')}
                large
              />
              <TransportButton label="SET" color={DECK_COLORS.B} onClick={() => {}} />
              <TransportButton
                label="CUE"
                color={DECK_COLORS.B}
                onClick={() => engineRef.current?.stop('B')}
              />
              <TransportButton label="SYNC" color={DECK_COLORS.B} onClick={() => {}} />
            </div>
          </div>

          {/* Crossfader centered */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: DECK_COLORS.A,
                fontWeight: 900,
                letterSpacing: '2px',
              }}
            >
              A
            </div>
            <Crossfader
              value={states.crossfader}
              onChange={(v) => engineRef.current?.setCrossfader(v)}
            />
            <div
              style={{
                fontSize: 10,
                color: DECK_COLORS.B,
                fontWeight: 900,
                letterSpacing: '2px',
              }}
            >
              B
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BOTTOM : LOOP A | EQ A | VOL A | VOL B | EQ B | LOOP B */}
        {/* ============================================================ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: 20,
            alignItems: 'center',
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Deck A : Loop + EQ + Volume */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {/* Loop */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  fontSize: 7,
                  color: '#666',
                  letterSpacing: '1px',
                  fontWeight: 700,
                }}
              >
                LOOP
              </div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <button
                  style={{
                    width: 20,
                    height: 20,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    color: '#888',
                    fontSize: 9,
                    cursor: 'pointer',
                  }}
                >
                  ‹
                </button>
                <div
                  style={{
                    padding: '3px 8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: '#fff',
                    minWidth: 24,
                    textAlign: 'center',
                  }}
                >
                  4
                </div>
                <button
                  style={{
                    width: 20,
                    height: 20,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    color: '#888',
                    fontSize: 9,
                    cursor: 'pointer',
                  }}
                >
                  ›
                </button>
              </div>
            </div>

            {/* EQ knobs A */}
            <div style={{ display: 'flex', gap: 10 }}>
              <EQKnob
                label="HI"
                value={eqs.A.hi}
                onChange={(v) => handleEQ('A', 'hi', v)}
                color={DECK_COLORS.A}
              />
              <EQKnob
                label="MID"
                value={eqs.A.mid}
                onChange={(v) => handleEQ('A', 'mid', v)}
                color={DECK_COLORS.A}
              />
              <EQKnob
                label="LO"
                value={eqs.A.lo}
                onChange={(v) => handleEQ('A', 'lo', v)}
                color={DECK_COLORS.A}
              />
            </div>

            {/* Volume A */}
            <VolumeKnob
              value={volumes.A}
              onChange={(v) => handleVolume('A', v)}
              color={DECK_COLORS.A}
            />
          </div>

          {/* Center empty */}
          <div />

          {/* Deck B : Volume + EQ + Loop */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <VolumeKnob
              value={volumes.B}
              onChange={(v) => handleVolume('B', v)}
              color={DECK_COLORS.B}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <EQKnob
                label="HI"
                value={eqs.B.hi}
                onChange={(v) => handleEQ('B', 'hi', v)}
                color={DECK_COLORS.B}
              />
              <EQKnob
                label="MID"
                value={eqs.B.mid}
                onChange={(v) => handleEQ('B', 'mid', v)}
                color={DECK_COLORS.B}
              />
              <EQKnob
                label="LO"
                value={eqs.B.lo}
                onChange={(v) => handleEQ('B', 'lo', v)}
                color={DECK_COLORS.B}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  fontSize: 7,
                  color: '#666',
                  letterSpacing: '1px',
                  fontWeight: 700,
                }}
              >
                LOOP
              </div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <button
                  style={{
                    width: 20,
                    height: 20,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    color: '#888',
                    fontSize: 9,
                    cursor: 'pointer',
                  }}
                >
                  ‹
                </button>
                <div
                  style={{
                    padding: '3px 8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: '#fff',
                    minWidth: 24,
                    textAlign: 'center',
                  }}
                >
                  4
                </div>
                <button
                  style={{
                    width: 20,
                    height: 20,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    color: '#888',
                    fontSize: 9,
                    cursor: 'pointer',
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};