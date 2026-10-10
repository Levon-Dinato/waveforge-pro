// src/components/MonoMakerPanel.tsx
import React from 'react';

interface MonoMakerPanelProps {
  enabled: boolean;
  frequency: number;
  onToggle: (enabled: boolean) => void;
  onFrequencyChange: (freq: number) => void;
}

export const MonoMakerPanel: React.FC<MonoMakerPanelProps> = ({
  enabled,
  frequency,
  onToggle,
  onFrequencyChange,
}) => {
  return (
    <div
      style={{
        padding: 14,
        background: enabled
          ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.08), rgba(124, 92, 255, 0.05))'
          : 'rgba(0, 0, 0, 0.3)',
        border: `1px solid ${enabled ? 'rgba(0, 217, 255, 0.4)' : '#1f1f1f'}`,
        borderRadius: 8,
        transition: 'all 0.2s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: enabled
                ? 'linear-gradient(135deg, #00d9ff, #0088ff)'
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${enabled ? 'transparent' : '#333'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              boxShadow: enabled ? '0 0 12px rgba(0, 217, 255, 0.5)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            🎵
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: enabled ? '#00d9ff' : '#888',
                letterSpacing: '0.5px',
              }}
            >
              MONO-MAKER
            </div>
            <div style={{ fontSize: 9, color: '#666', marginTop: 1 }}>
              Force les basses en mono (Brainworx-style)
            </div>
          </div>
        </div>

        <button
          onClick={() => onToggle(!enabled)}
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            border: 'none',
            background: enabled
              ? 'linear-gradient(135deg, #00d9ff, #0088ff)'
              : '#2a2a2a',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s',
            boxShadow: enabled ? '0 0 12px rgba(0, 217, 255, 0.4)' : 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 2,
              left: enabled ? 22 : 2,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#fff',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        </button>
      </div>

      <div style={{ opacity: enabled ? 1 : 0.4, transition: 'opacity 0.2s' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <div style={{ fontSize: 10, color: '#666', letterSpacing: '0.5px' }}>
            FRÉQUENCE DE COUPURE
          </div>
          <span className="mono" style={{ fontSize: 12, color: '#00d9ff', fontWeight: 700 }}>
            {frequency} Hz
          </span>
        </div>

        <input
          type="range"
          min={40}
          max={250}
          step={5}
          value={frequency}
          onChange={(e) => onFrequencyChange(parseInt(e.target.value))}
          disabled={!enabled}
          style={{
            width: '100%',
            accentColor: '#00d9ff',
            cursor: enabled ? 'pointer' : 'not-allowed',
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 8,
            color: '#666',
            marginTop: 2,
          }}
        >
          <span>40 Hz (serré)</span>
          <span>250 Hz (large)</span>
        </div>

        <div
          style={{
            marginTop: 10,
            padding: '8px 10px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 6,
            fontSize: 9,
            color: '#888',
            lineHeight: 1.5,
          }}
        >
          💡 <strong style={{ color: '#00d9ff' }}>Astuce pro :</strong> 100-120 Hz est idéal
          pour la plupart des morceaux.
        </div>
      </div>
    </div>
  );
};