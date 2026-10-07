import { useRef, useState, useEffect, useCallback } from 'react';

interface Stem {
  id: string;
  name: string;
  url: string;
  color: string;
  icon: string;
}

interface Props {
  stems: Stem[];
  onClose?: () => void;
}

export function StemPlayer({ stems, onClose }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [solo, setSolo] = useState<string | null>(null);

  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const rafRef = useRef<number | null>(null);

  // Init volumes à 100%
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

  // Récupère la durée du premier stem
  useEffect(() => {
    const first = stems[0];
    if (!first) return;
    const audio = audioRefs.current[first.id];
    if (!audio) return;

    const onLoaded = () => {
      setDuration(audio.duration);
    };
    audio.addEventListener('loadedmetadata', onLoaded);
    return () => audio.removeEventListener('loadedmetadata', onLoaded);
  }, [stems]);

  // Applique volume + mute + solo
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

  // Play / Pause
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
      // Synchronise tous les audios sur le temps actuel
      for (const stem of stems) {
        const audio = audioRefs.current[stem.id];
        if (audio) {
          audio.currentTime = currentTime;
        }
      }
      // Lance tous en même temps
      await Promise.all(
        stems.map((stem) => audioRefs.current[stem.id]?.play().catch(() => {}))
      );
      setIsPlaying(true);

      // Boucle de mise à jour du temps
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

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    for (const stem of stems) {
      const audio = audioRefs.current[stem.id];
      if (audio) audio.currentTime = t;
    }
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 10);
    return `${m}:${String(s).padStart(2, '0')}.${ms}`;
  };

  return (
    <div
      style={{
        background: '#0e0e16',
        border: '1px solid #1e1e2a',
        borderRadius: 12,
        padding: 20,
        marginTop: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16, color: '#e8e8f0' }}>
          🎧 Player Stems
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Transport principal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={togglePlay}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: isPlaying ? '#ff5c9d' : '#7c5cff',
            border: 'none',
            color: '#fff',
            fontSize: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={{ flex: 1 }}>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            style={{
              width: '100%',
              accentColor: '#7c5cff',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#888',
              fontFamily: 'ui-monospace, monospace',
              marginTop: 2,
            }}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Pistes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                borderRadius: 8,
                border: `1px solid ${isSoloed ? stem.color : '#1e1e2a'}`,
                opacity: isDimmed ? 0.4 : 1,
                transition: 'all .15s',
              }}
            >
              {/* Icon + Nom */}
              <div style={{ minWidth: 130, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{stem.icon}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: stem.color,
                  }}
                >
                  {stem.name}
                </span>
              </div>

              {/* Mute */}
              <button
                onClick={() =>
                  setMuted((m) => ({ ...m, [stem.id]: !m[stem.id] }))
                }
                style={{
                  width: 32,
                  height: 28,
                  background: isMuted ? '#ff5c9d' : '#1e1e2a',
                  border: 'none',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
                title="Mute"
              >
                M
              </button>

              {/* Solo */}
              <button
                onClick={() =>
                  setSolo((s) => (s === stem.id ? null : stem.id))
                }
                style={{
                  width: 32,
                  height: 28,
                  background: isSoloed ? '#f59e0b' : '#1e1e2a',
                  border: 'none',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
                title="Solo"
              >
                S
              </button>

              {/* Volume */}
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
                style={{
                  minWidth: 40,
                  fontSize: 11,
                  color: '#888',
                  textAlign: 'right',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {volumes[stem.id] ?? 100}%
              </span>

              {/* Audio caché */}
              <audio
                ref={(el) => {
                  audioRefs.current[stem.id] = el;
                }}
                src={stem.url}
                preload="metadata"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}