import { useState } from 'react';
import { generateMelody, melodyToMidiBlob } from '../audio/melodyGenerator';
import type { GeneratorOptions } from '../audio/melodyGenerator';
import { download } from '../audio/midiExporter';

interface Props {
  bpm: number;
  onGenerated?: (notes: any[]) => void;
}

export function MelodyGenerator({ bpm, onGenerated }: Props) {
  const [options, setOptions] = useState<GeneratorOptions>({
    style: 'pop',
    key: 'C',
    mode: 'major',
    complexity: 5,
    bars: 8,
    bpm,
  });
  const [lastGenerated, setLastGenerated] = useState<any[] | null>(null);

  const handleGenerate = () => {
    const notes = generateMelody({ ...options, bpm });
    setLastGenerated(notes);
    if (onGenerated) onGenerated(notes);
  };

  const handleExport = () => {
    if (!lastGenerated) return;
    const blob = melodyToMidiBlob(lastGenerated, options.bpm);
    download(blob, `melody-${options.style}-${options.key}.mid`);
  };

  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const STYLES = [
    { id: 'pop', label: 'Pop', emoji: '🎤' },
    { id: 'trap', label: 'Trap', emoji: '🔥' },
    { id: 'lofi', label: 'Lo-Fi', emoji: '🌙' },
    { id: 'drill', label: 'Drill', emoji: '⚡' },
    { id: 'house', label: 'House', emoji: '🏠' },
  ];

  return (
    <div
      style={{
        background: 'rgba(14, 14, 22, 0.65)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 16,
        padding: 20,
        marginTop: 16,
      }}
    >
      <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#e8e8f0' }}>
        🎼 Générateur de mélodies
      </h3>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 6 }}>
          Style
        </label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setOptions({ ...options, style: s.id as any })}
              style={{
                padding: '6px 12px',
                background: options.style === s.id ? '#7c5cff' : '#2a2a3a',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>
            Tonalité
          </label>
          <select
            value={options.key}
            onChange={(e) => setOptions({ ...options, key: e.target.value })}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: '#0a0a0f',
              color: '#fff',
              border: '1px solid #1e1e2a',
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            {NOTES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>
            Mode
          </label>
          <select
            value={options.mode}
            onChange={(e) =>
              setOptions({ ...options, mode: e.target.value as 'major' | 'minor' })
            }
            style={{
              width: '100%',
              padding: '6px 8px',
              background: '#0a0a0f',
              color: '#fff',
              border: '1px solid #1e1e2a',
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            <option value="major">Majeur</option>
            <option value="minor">Mineur</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>
          Complexité : {options.complexity}/10
        </label>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={options.complexity}
          onChange={(e) =>
            setOptions({ ...options, complexity: parseInt(e.target.value) })
          }
          style={{ width: '100%', accentColor: '#7c5cff' }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>
          Mesures
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {[4, 8, 16, 32].map((b) => (
            <button
              key={b}
              onClick={() => setOptions({ ...options, bars: b })}
              style={{
                padding: '6px 12px',
                background: options.bars === b ? '#7c5cff' : '#2a2a3a',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleGenerate}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: '#7c5cff',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          🎲 Générer
        </button>

        {lastGenerated && (
          <button
            onClick={handleExport}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            💾 Export MIDI
          </button>
        )}
      </div>

      {lastGenerated && (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 6,
            fontSize: 12,
            color: '#4ade80',
          }}
        >
          ✅ {lastGenerated.length} notes générées — {options.style} · {options.key}{' '}
          {options.mode}
        </div>
      )}
    </div>
  );
}