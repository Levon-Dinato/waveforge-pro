// src/components/ImagerPanel.tsx
import React from 'react';

interface ImagerPanelProps {
  lowAmount: number;   // 0-1 (0 = stéréo normal, 1 = mono)
  midAmount: number;
  highAmount: number;
  onLowChange: (v: number) => void;
  onMidChange: (v: number) => void;
  onHighChange: (v: number) => void;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const ImagerPanel: React.FC<ImagerPanelProps> = ({
  lowAmount,
  midAmount,
  highAmount,
  onLowChange,
  onMidChange,
  onHighChange,
  enabled,
  onToggle,
}) => {
  const sliders = [
    {
      label: 'BASSES',
      sublabel: '0-200 Hz',
      value: lowAmount,
      onChange: onLowChange,
      color: '#00d9ff',
      icon: '🎵',
    },
    {
      label: 'MIDS',
      sublabel: '200-4k Hz',
      value: midAmount,
      onChange: onMidChange,
      color: '#00ff88',
      icon: '🎶',
    },
    {
      label: 'AIGUS',
      sublabel: '4k-20k Hz',
      value: highAmount,
      onChange: onHighChange,
      color: '#ffd43b',
      icon: '🎼',
    },
  ];

  return (
    <div
      style={{
        padding: 14,
        background: enabled
          ? 'linear-gradient(135deg, rgba(124, 92, 255, 0.08), rgba(0, 217, 255, 0.05))'
          : 'rgba(0, 0, 0, 0.3)',
        border: `1px solid ${enabled ? 'rgba(124, 92, 255, 0.4)' : '#1f1f1f'}`,
        borderRadius: 8,
        transition: 'all 0.2s',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: enabled
                ? 'linear-gradient(135deg, #7c5cff, #00d9ff)'
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${enabled ? 'transparent' : '#333'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              boxShadow: enabled ? '0 0 12px rgba(124, 92, 255, 0.5)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            🌌
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: enabled ? '#7c5cff' : '#888',
                letterSpacing: '0.5px',
              }}
            >
              IMAGER 3 BANDES
            </div>
            <div style={{ fontSize: 9, color: '#666', marginTop: 1 }}>
              Contrôle stéréo par fréquence (Ozone-style)
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
              ? 'linear-gradient(135deg, #7c5cff, #00d9ff)'
              : '#2a2a2a',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s',
            boxShadow: enabled ? '0 0 12px rgba(124, 92, 255, 0.4)' : 'none',
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

      {/* Sliders */}
      <div
        style={{
          opacity: enabled ? 1 : 0.4,
          transition: 'opacity 0.2s',
          pointerEvents: enabled ? 'auto' : 'none',
        }}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          {sliders.map((slider) => (
            <div key={slider.label}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11 }}>{slider.icon}</span>
                  <span
                    style={{
                      fontSize: 10,
                      color: slider.color,
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                    }}
                  >
                    {slider.label}
                  </span>
                  <span style={{ fontSize: 9, color: '#666' }}>
                    {slider.sublabel}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: slider.color,
                      fontWeight: 600,
                    }}
                  >
                    {Math.round(slider.value * 100)}%
                  </span>
                  <span style={{ fontSize: 8, color: '#666' }}>
                    {slider.value === 0 ? 'STÉRÉO' : slider.value === 1 ? 'MONO' : ''}
                  </span>
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={slider.value}
                onChange={(e) => slider.onChange(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: slider.color,
                }}
              />
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 12,
            padding: '8px 10px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 6,
            fontSize: 9,
            color: '#888',
            lineHeight: 1.5,
          }}
        >
          💡 <strong style={{ color: '#7c5cff' }}>Astuce :</strong> Mets les basses à
          100% (mono) et les aigus à 0% (stéréo) pour un son propre et large.
        </div>
      </div>
    </div>
  );
};