import { useEffect, useRef, useState } from 'react';

interface Props {
  audioBuffer: AudioBuffer | null;
  isPlaying: boolean;
  currentTime: number;
}

const SEGMENTS = 12;

export function VUMeter({ audioBuffer, isPlaying, currentTime }: Props) {
  const [levels, setLevels] = useState<number[]>([0, 0, 0, 0]);
  const rafRef = useRef<number | null>(null);
  const audioDataRef = useRef<Float32Array | null>(null);
  const peakRef = useRef<number>(0);

  // Extrait les données audio une fois
  useEffect(() => {
    if (!audioBuffer) {
      audioDataRef.current = null;
      setLevels([0, 0, 0, 0]);
      return;
    }

    const data = audioBuffer.getChannelData(0);
    audioDataRef.current = data;
  }, [audioBuffer]);

  // Animation
  useEffect(() => {
    if (!isPlaying || !audioDataRef.current || !audioBuffer) {
      // Déclin vers 0
      const decay = () => {
        setLevels((prev) => prev.map((l) => Math.max(0, l - 0.05)));
        if (levels.some((l) => l > 0)) {
          rafRef.current = requestAnimationFrame(decay);
        }
      };
      rafRef.current = requestAnimationFrame(decay);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }

    const data = audioDataRef.current;
    const sr = audioBuffer.sampleRate;

    const animate = () => {
      // Calcule la position dans le buffer
      const sampleIdx = Math.floor(currentTime * sr);
      const windowSize = 2048;

      // Extrait une petite fenêtre
      const start = Math.max(0, sampleIdx - windowSize / 2);
      const end = Math.min(data.length, start + windowSize);

      // Divise en 4 bandes
      const bandSize = Math.floor((end - start) / 4);
      const newLevels: number[] = [];

      for (let b = 0; b < 4; b++) {
        let sum = 0;
        const bStart = start + b * bandSize;
        const bEnd = bStart + bandSize;

        for (let i = bStart; i < bEnd; i++) {
          sum += Math.abs(data[i]);
        }

        const avg = sum / bandSize;
        // Amplifie pour être visible (0-1)
        const level = Math.min(1, avg * 8);
        newLevels.push(level);
      }

      // Peak hold
      const maxLevel = Math.max(...newLevels);
      if (maxLevel > peakRef.current) {
        peakRef.current = maxLevel;
      } else {
        peakRef.current *= 0.95;
      }

      setLevels(newLevels);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, currentTime, audioBuffer]);

  const getColor = (segmentIdx: number, totalSegments: number) => {
    const ratio = segmentIdx / totalSegments;
    if (ratio < 0.6) return '#00ff88';       // Vert
    if (ratio < 0.85) return '#ffb800';      // Jaune
    return '#ff3366';                        // Rouge
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 3,
        height: 32,
        padding: '4px 8px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 4,
        border: '1px solid var(--border)',
      }}
      title="VU-mètre"
    >
      {levels.map((level, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 1,
            height: '100%',
            width: 4,
          }}
        >
          {Array.from({ length: SEGMENTS }).map((_, segIdx) => {
            const segThreshold = segIdx / SEGMENTS;
            const isActive = level > segThreshold;
            const color = getColor(segIdx, SEGMENTS);

            return (
              <div
                key={segIdx}
                style={{
                  width: 4,
                  height: 2,
                  background: isActive ? color : 'rgba(255, 255, 255, 0.06)',
                  borderRadius: 1,
                  boxShadow: isActive ? `0 0 3px ${color}` : 'none',
                  transition: 'background 0.05s, box-shadow 0.05s',
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}