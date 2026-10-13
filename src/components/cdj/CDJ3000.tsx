// src/components/cdj/CDJ3000.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioEngineContext } from '../../contexts/AudioEngineContext';
import { WaveformDisplay } from './WaveformDisplay';
import { useBeatGrid, snapToBeat, timeToBarBeat } from '../../hooks/useBeatGrid';

interface HotCue {
  id: number;
  position: number;
  color: string;
}

const HOT_CUE_COLORS = [
  '#ff3366', '#ff5cf0', '#7c5cff', '#00d9ff',
  '#00ff88', '#ffd43b', '#ff8800', '#ff6b35',
];

export const CDJ3000: React.FC = () => {
  const engine = useAudioEngineContext();
  const hasAudio = !!engine.audioBuffer;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [tempo, setTempo] = useState(0);
  const [hotCues, setHotCues] = useState<Array<HotCue | null>>(
    new Array(8).fill(null)
  );
  const [activeHotCue, setActiveHotCue] = useState<number | null>(null);
  const [quantize, setQuantize] = useState(true);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [isLoopActive, setIsLoopActive] = useState(false);
  const [activeLoopSize, setActiveLoopSize] = useState<number | null>(null);

  const grid = useBeatGrid(bpm, duration);

  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!engine.audioBuffer) return;
    setDuration(engine.audioBuffer.duration);
    setBpm(engine.result?.bpm ?? 120);
  }, [engine.audioBuffer, engine.result]);

  useEffect(() => {
    if (!isPlaying || !engine.audioContext) return;
    const update = () => {
      if (startTimeRef.current > 0 && engine.audioContext) {
        const elapsed = engine.audioContext.currentTime - startTimeRef.current;
        let newTime = startOffsetRef.current + elapsed;
        if (isLoopActive && loopStart !== null && loopEnd !== null && newTime >= loopEnd) {
          const loopDur = loopEnd - loopStart;
          newTime = loopStart + ((newTime - loopStart) % loopDur);
        }
        setCurrentTime(newTime);
      }
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, engine.audioContext, isLoopActive, loopStart, loopEnd]);

  const stopSource = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (err) {
        // ignore
      }
      sourceRef.current = null;
    }
  }, []);

  const playFrom = useCallback(
    (offset: number) => {
      if (!engine.audioBuffer || !engine.audioContext) return;
      stopSource();
      const ctx = engine.audioContext;
      if (ctx.state === 'suspended') ctx.resume();

      const source = ctx.createBufferSource();
      source.buffer = engine.audioBuffer;
      source.playbackRate.value = 1 + tempo / 100;

      const gain = gainRef.current ?? ctx.createGain();
      gainRef.current = gain;
      source.connect(gain);
      gain.connect(ctx.destination);

      source.start(0, offset);
      sourceRef.current = source;
      startTimeRef.current = ctx.currentTime;
      startOffsetRef.current = offset;
      setCurrentTime(offset);
    },
    [engine.audioBuffer, engine.audioContext, tempo, stopSource]
  );

  const handlePlayPause = () => {
    if (!hasAudio) return;
    if (isPlaying) {
      stopSource();
      setIsPlaying(false);
      if (engine.audioContext) {
        setCurrentTime(
          startOffsetRef.current + (engine.audioContext.currentTime - startTimeRef.current)
        );
      }
    } else {
      playFrom(currentTime);
      setIsPlaying(true);
    }
  };

  const handleCue = () => {
    if (!hasAudio) return;
    if (isPlaying) {
      stopSource();
      setIsPlaying(false);
    }
  };

  const handleSetHotCue = (index: number) => {
    if (!hasAudio) return;
    const existing = hotCues[index];
    if (existing) {
      setActiveHotCue(index);
      playFrom(existing.position);
      setIsPlaying(true);
    } else {
      const position = quantize ? snapToBeat(currentTime, grid) : currentTime;
      const newCues = [...hotCues];
      newCues[index] = { id: index, position, color: HOT_CUE_COLORS[index] };
      setHotCues(newCues);
    }
  };

  const handleDeleteHotCue = (index: number) => {
    const newCues = [...hotCues];
    newCues[index] = null;
    setHotCues(newCues);
    if (activeHotCue === index) setActiveHotCue(null);
  };

  const handleLoopSize = useCallback(
    (beats: number) => {
      if (!hasAudio) return;
      const loopDur = beats * (60 / bpm);
      const start = quantize ? snapToBeat(currentTime, grid) : currentTime;
      const end = Math.min(start + loopDur, duration);
      setLoopStart(start);
      setLoopEnd(end);
      setIsLoopActive(true);
      setActiveLoopSize(beats);
    },
    [hasAudio, bpm, currentTime, duration, quantize, grid]
  );

  const handleLoopExit = () => {
    setLoopStart(null);
    setLoopEnd(null);
    setIsLoopActive(false);
    setActiveLoopSize(null);
  };

  const formatTime = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const trackName = engine.fileName
    ? engine.fileName.replace(/\.[^.]+$/, '')
    : 'Aucun morceau chargé';

  return (
    <div
      style={{
        padding: 20,
        minHeight: '100vh',
        background: '#0a0a0f',
        color: '#fff',
        fontFamily: '"Inter", -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}
            >
              🎛️ DJ Deck{' '}
              <span
                style={{
                  fontSize: 10,
                  color: '#00d9ff',
                  marginLeft: 10,
                  padding: '3px 8px',
                  background: 'rgba(0, 217, 255, 0.15)',
                  border: '1px solid rgba(0, 217, 255, 0.4)',
                  borderRadius: 10,
                  verticalAlign: 'middle',
                  fontWeight: 700,
                }}
              >
                PRO
              </span>
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#666' }}>
              Player · Hot Cues · Loops · Beat Grid · Quantize
            </p>
          </div>

          <button
            onClick={() => setQuantize(!quantize)}
            style={{
              padding: '8px 16px',
              background: quantize
                ? 'rgba(0, 255, 136, 0.15)'
                : 'rgba(255, 51, 102, 0.15)',
              border: `1px solid ${quantize ? '#00ff88' : '#ff3366'}`,
              borderRadius: 6,
              color: quantize ? '#00ff88' : '#ff3366',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.5px',
            }}
          >
            ⚡ QUANTIZE {quantize ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* ÉCRAN PRINCIPAL */}
        <div
          style={{
            background: 'linear-gradient(180deg, #14141f 0%, #0d0d15 100%)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Titre + stats */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
              gap: 16,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 9,
                  color: '#666',
                  letterSpacing: '1.5px',
                  fontWeight: 700,
                  marginBottom: 3,
                }}
              >
                NOW PLAYING
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {trackName}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
              <StatBox label="BPM" value={bpm.toFixed(1)} color="#00d9ff" />
              <StatBox
                label="BEAT"
                value={timeToBarBeat(currentTime, grid)}
                color="#ff5cf0"
              />
              <StatBox
                label="TEMPO"
                value={`${tempo > 0 ? '+' : ''}${tempo.toFixed(1)}%`}
                color={tempo === 0 ? '#fff' : tempo > 0 ? '#00ff88' : '#ff3366'}
              />
            </div>
          </div>

          {/* Waveform */}
          <div style={{ marginBottom: 12, borderRadius: 6, overflow: 'hidden' }}>
            <WaveformDisplay
              audioBuffer={engine.audioBuffer}
              currentTime={currentTime}
              duration={duration}
              grid={grid}
              hotCues={hotCues}
              activeHotCue={activeHotCue}
              loopStart={loopStart}
              loopEnd={loopEnd}
              height={140}
            />
          </div>

          {/* Barre de progression */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                position: 'relative',
                height: 6,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 3,
                cursor: 'pointer',
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                const t = percent * duration;
                setCurrentTime(t);
                startOffsetRef.current = t;
                if (isPlaying) playFrom(t);
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, #00d9ff, #7c5cff)',
                  borderRadius: 3,
                }}
              />
              {hotCues.map((cue, i) =>
                cue && duration > 0 ? (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: -2,
                      left: `${(cue.position / duration) * 100}%`,
                      width: 3,
                      height: 10,
                      background: cue.color,
                      borderRadius: 1,
                    }}
                  />
                ) : null
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                color: '#666',
                fontFamily: 'monospace',
                marginTop: 6,
              }}
            >
              <span>{formatTime(currentTime)}</span>
              <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* PLAY / CUE / TEMPO */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              marginBottom: 20,
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={handlePlayPause}
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: isPlaying
                  ? 'linear-gradient(135deg, #00ff88, #00a850)'
                  : 'linear-gradient(135deg, #1a1a24, #0d0d15)',
                border: `2px solid ${
                  isPlaying ? '#00ff88' : 'rgba(255,255,255,0.1)'
                }`,
                color: isPlaying ? '#000' : '#fff',
                fontSize: 22,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isPlaying ? '0 0 30px rgba(0, 255, 136, 0.6)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {isPlaying ? '❚❚' : '▶'}
            </button>

            <button
              onClick={handleCue}
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a1a24, #0d0d15)',
                border: '2px solid rgba(255, 136, 0, 0.5)',
                color: '#ff8800',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.5px',
              }}
            >
              CUE
            </button>

            <div style={{ flex: 1 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  fontSize: 9,
                  color: '#666',
                  letterSpacing: '1px',
                  fontWeight: 700,
                }}
              >
                TEMPO
              </div>
              <input
                type="range"
                min={-16}
                max={16}
                step={0.01}
                value={tempo}
                onChange={(e) => setTempo(parseFloat(e.target.value))}
                style={{ width: 140, accentColor: '#00d9ff' }}
              />
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color:
                    tempo === 0 ? '#fff' : tempo > 0 ? '#00ff88' : '#ff3366',
                  minWidth: 50,
                  textAlign: 'right',
                }}
              >
                {tempo > 0 ? '+' : ''}
                {tempo.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* HOT CUES */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 9,
                color: '#666',
                letterSpacing: '1.5px',
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              HOT CUES · clic droit pour supprimer
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: 6,
              }}
            >
              {hotCues.map((cue, i) => (
                <button
                  key={i}
                  onClick={() => handleSetHotCue(i)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (cue) handleDeleteHotCue(i);
                  }}
                  style={{
                    padding: '12px 4px 8px',
                    background: cue
                      ? `linear-gradient(180deg, ${cue.color}44, ${cue.color}11)`
                      : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                    border: `1px solid ${
                      cue ? cue.color : 'rgba(255,255,255,0.08)'
                    }`,
                    borderRadius: 6,
                    color: cue ? '#fff' : '#666',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: cue ? `0 0 12px ${cue.color}44` : 'none',
                  }}
                >
                  <div>{String.fromCharCode(65 + i)}</div>
                  {cue ? (
                    <div
                      style={{
                        fontSize: 7,
                        color: cue.color,
                        marginTop: 3,
                        opacity: 0.8,
                      }}
                    >
                      {timeToBarBeat(cue.position, grid)}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {/* BEAT LOOPS */}
          <div>
            <div
              style={{
                fontSize: 9,
                color: '#666',
                letterSpacing: '1.5px',
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              BEAT LOOPS
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[0.25, 0.5, 1, 2, 4, 8, 16, 32].map((beats) => {
                const isActive = activeLoopSize === beats && isLoopActive;
                const label = beats < 1 ? `1/${1 / beats}` : String(beats);
                return (
                  <button
                    key={beats}
                    onClick={() => handleLoopSize(beats)}
                    style={{
                      padding: '8px 14px',
                      background: isActive
                        ? 'linear-gradient(180deg, rgba(0, 217, 255, 0.3), rgba(0, 217, 255, 0.1))'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                      border: `1px solid ${
                        isActive ? '#00d9ff' : 'rgba(255,255,255,0.08)'
                      }`,
                      borderRadius: 5,
                      color: isActive ? '#00d9ff' : '#aaa',
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      boxShadow: isActive
                        ? '0 0 16px rgba(0, 217, 255, 0.5)'
                        : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
              {isLoopActive ? (
                <button
                  onClick={handleLoopExit}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(255, 51, 102, 0.15)',
                    border: '1px solid #ff3366',
                    borderRadius: 5,
                    color: '#ff3366',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                  }}
                >
                  EXIT LOOP
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Pas de morceau */}
        {!hasAudio ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              background: 'rgba(0, 217, 255, 0.03)',
              border: '1px dashed rgba(0, 217, 255, 0.3)',
              borderRadius: 12,
              color: '#888',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📀</div>
            <div
              style={{
                fontSize: 14,
                color: '#fff',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Aucun morceau chargé
            </div>
            <div style={{ fontSize: 12 }}>
              Va dans le Studio pour charger un fichier audio
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div style={{ textAlign: 'center' }}>
    <div
      style={{
        fontSize: 8,
        color: '#444',
        letterSpacing: '1.5px',
        fontWeight: 700,
        marginBottom: 3,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 15,
        fontWeight: 700,
        color,
        fontFamily: 'monospace',
        letterSpacing: '0.5px',
      }}
    >
      {value}
    </div>
  </div>
);