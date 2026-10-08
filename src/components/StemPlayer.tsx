import { useRef, useState, useEffect, useCallback } from 'react';
import { Knob } from './Knob';
import { Waveform } from './Waveform';

interface Stem {
  id: string;
  name: string;
  url: string;
  color: string;
  icon: string;
}

interface Props {
  stems: Stem[];
  audioBuffer?: AudioBuffer | null;
  onClose?: () => void;
}

export function StemPlayer({ stems, audioBuffer, onClose }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [solo, setSolo] = useState<string | null>(null);

  const [tempo, setTempo] = useState(1.0);
  const [pitch, setPitch] = useState(0);

  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const rafRef = useRef<number | null>(null);

  // Init
  useEffect(() => {
    const initVols: Record<string, number> = {};
    const initMuted: Record<string, boolean> = {};
    for (const stem of stems) {
      initVols[stem.id] = 100;
      initMuted[stem.id] = false;
    }
    setVolumes(initVols);
    setMuted(initMuted);
  }, [stems]);

  // Durée
  useEffect(() => {
    const first = stems[0];
    if (!first) return;
    const audio = audioRefs.current[first.id];
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration);
    audio.addEventListener('loadedmetadata', onLoaded);
    return () => audio.removeEventListener('loadedmetadata', onLoaded);
  }, [stems]);

  // Volume / mute / solo
  useEffect(() => {
    for (const stem of stems) {
      const audio = audioRefs.current[stem.id];
      if (!audio) continue;

      const isMuted = muted[stem.id];
      const isSoloedOut = solo !== null && solo !== stem.id;
      const vol = volumes[stem.id] ?? 100;

      audio.volume = isMuted || isSoloedOut ? 0 : vol / 100;
    }
  }, [volumes, muted, solo, stems]);

  // Tempo + pitch
  useEffect(() => {
    const rate = tempo * Math.pow(2, pitch / 12);
    for (const stem of stems) {
      const audio = audioRefs.current[stem.id];
      if (audio) audio.playbackRate = rate;
    }
  }, [tempo, pitch, stems]);

  const togglePlay = useCallback(async () => {
    const firstAudio = audioRefs.current[stems[0]?.id];
    if (!firstAudio) return;

    if (isPlaying) {
      for (const stem of stems) {
        audioRefs.current[stem.id]?.pause();
      }
      setIsPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } else {
      for (const stem of stems) {
        const audio = audioRefs.current[stem.id];
        if (audio) audio.currentTime = currentTime;
      }
      await Promise.all(
        stems.map((stem) => audioRefs.current[stem.id]?.play().catch(() => {}))
      );
      setIsPlaying(true);

      const tick = () => {
        const audio = audioRefs.current[stems[0]?.id];
        if (audio) {
          setCurrentTime(audio.currentTime);
          if (audio.ended) {
            setIsPlaying(false);
            setCurrentTime(0);
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [isPlaying, currentTime, stems]);

  const handleSeek = (t: number) => {
    setCurrentTime(t);
    for (const stem of stems) {
      const audio = audioRefs.current[stem.id];
      if (audio) audio.currentTime = t;
    }
  };

  const resetTempoPitch = () => {
    setTempo(1.0);
    setPitch(0);
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="panel fade-in" style={{ marginTop: 16 }}>
      {/* HEADER */}
      <div className="panel-header">
        <span>🎧 PLAYER</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className={`led ${isPlaying ? 'active' : ''}`} />
          <span className="mono" style={{ fontSize: 10, color: '#888' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: 14,
                padding: 0,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* WAVEFORM */}
      <div style={{ padding: '8px 0', background: '#0a0a0f' }}>
        <Waveform
          audioBuffer={audioBuffer || null}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          height={100}
          color="#00d9ff"
        />
      </div>

      {/* BODY */}
      <div className="panel-body" style={{ padding: 16 }}>
        {/* TRANSPORT + KNOBS */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            paddingBottom: 16,
            borderBottom: '1px solid var(--border)',
            marginBottom: 16,
          }}
        >
          {/* Play/Pause */}
          <button
            className={`btn-transport ${isPlaying ? 'active' : ''}`}
            onClick={togglePlay}
            style={{ width: 44, height: 44, fontSize: 18 }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          {/* Stop */}
          <button
            className="btn-transport"
            onClick={() => {
              for (const stem of stems) {
                audioRefs.current[stem.id]?.pause();
              }
              setIsPlaying(false);
              handleSeek(0);
            }}
          >
            ⏹
          </button>

          {/* Knobs */}
          <div style={{ display: 'flex', gap: 24, marginLeft: 20 }}>
            <Knob
              value={tempo}
              min={0.5}
              max={1.5}
              step={0.01}
              label="TEMPO"
              color="#00d9ff"
              defaultValue={1.0}
              size={54}
              onChange={setTempo}
              formatValue={(v) => `${Math.round(v * 100)}%`}
            />

            <Knob
              value={pitch}
              min={-12}
              max={12}
              step={1}
              label="PITCH"
              color="#ff3366"
              defaultValue={0}
              size={54}
              bipolar
              onChange={setPitch}
              formatValue={(v) => `${v > 0 ? '+' : ''}${v}`}
            />
          </div>

          {/* Reset */}
          <button
            className="btn-action"
            onClick={resetTempoPitch}
            style={{ marginLeft: 'auto' }}
          >
            🔄 RESET
          </button>
        </div>

        {/* PISTES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stems.map((stem) => {
            const isMuted = muted[stem.id];
            const isSoloed = solo === stem.id;
            const isDimmed = (solo !== null && !isSoloed) || isMuted;

            return (
              <div
                key={stem.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  background: '#0a0a0f',
                  borderRadius: 6,
                  border: `1px solid ${
                    isSoloed ? stem.color : 'var(--border)'
                  }`,
                  opacity: isDimmed ? 0.4 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {/* Icon + Name */}
                <div
                  style={{
                    minWidth: 140,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{stem.icon}</span>
                  <span
                    className="label-uppercase"
                    style={{ color: stem.color, fontSize: 10 }}
                  >
                    {stem.name}
                  </span>
                </div>

                {/* Mute */}
                <button
                  onClick={() =>
                    setMuted((m) => ({ ...m, [stem.id]: !m[stem.id] }))
                  }
                  className="btn-transport"
                  style={{
                    width: 28,
                    height: 28,
                    fontSize: 11,
                    background: isMuted ? '#ff3366' : 'var(--bg-2)',
                    borderColor: isMuted ? '#ff3366' : 'var(--border)',
                    color: isMuted ? '#fff' : '#888',
                  }}
                  title="Mute"
                >
                  M
                </button>

                {/* Solo */}
                <button
                  onClick={() => setSolo((s) => (s === stem.id ? null : stem.id))}
                  className="btn-transport"
                  style={{
                    width: 28,
                    height: 28,
                    fontSize: 11,
                    background: isSoloed ? '#ffb800' : 'var(--bg-2)',
                    borderColor: isSoloed ? '#ffb800' : 'var(--border)',
                    color: isSoloed ? '#000' : '#888',
                  }}
                  title="Solo"
                >
                  S
                </button>

                {/* Slider Volume (horizontal, plus compact) */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volumes[stem.id] ?? 100}
                  onChange={(e) =>
                    setVolumes((v) => ({
                      ...v,
                      [stem.id]: parseInt(e.target.value),
                    }))
                  }
                  style={{
                    flex: 1,
                    accentColor: stem.color,
                  }}
                />

                <span
                  className="mono"
                  style={{
                    minWidth: 40,
                    fontSize: 11,
                    color: '#888',
                    textAlign: 'right',
                  }}
                >
                  {volumes[stem.id] ?? 100}%
                </span>

                <audio
                  ref={(el) => {
                    audioRefs.current[stem.id] = el;
                  }}
                  src={stem.url}
                  preload="metadata"
                  style={{ display: 'none' }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}