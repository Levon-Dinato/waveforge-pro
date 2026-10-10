// src/pages/GeneratorPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MelodyGenerator } from '../components/MelodyGenerator';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { useIsMobile } from '../hooks/useIsMobile';

interface StylePreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  bpmRange: string;
}

const STYLE_PRESETS: StylePreset[] = [
  { id: 'pop', name: 'POP', icon: '🎤', description: 'Mélodies accrocheuses, accords simples', color: '#ff5cf0', bpmRange: '100-128' },
  { id: 'trap', name: 'TRAP', icon: '🔥', description: '808, hi-hats roulés, mélodies sombres', color: '#ff3366', bpmRange: '130-150' },
  { id: 'lofi', name: 'LO-FI', icon: '☕', description: 'Chill, jazzy, effets vintage', color: '#ffd43b', bpmRange: '70-90' },
  { id: 'drill', name: 'DRILL', icon: '🌑', description: 'Sombre, mélodies glissantes, UK', color: '#7c5cff', bpmRange: '140-145' },
  { id: 'house', name: 'HOUSE', icon: '🏠', description: '4/4, pianos, ambiance club', color: '#00d9ff', bpmRange: '120-128' },
];

export const GeneratorPage: React.FC = () => {
  const isMobile = useIsMobile(768);
  const engine = useAudioEngineContext();
  const [selectedStyle, setSelectedStyle] = useState<string>('pop');

  const bpm = engine.result?.bpm ?? 120;
  const hasAudio = !!engine.result;

  return (
    <div
      className="fade-in"
      style={{
        padding: isMobile ? 12 : 20,
        display: 'grid',
        gap: isMobile ? 14 : 20,
      }}
    >
      {/* HEADER */}
      <div>
        <h2 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          🎼 <span style={{ color: '#ffd43b' }}>Générateur de Mélodies</span>
        </h2>
        <p style={{ color: '#888', fontSize: 11, margin: 0 }}>
          Création de mélodies par chaînes de Markov · 5 styles
        </p>
      </div>

      {/* BPM DE RÉFÉRENCE */}
      <div
        className="panel"
        style={{
          padding: 16,
          borderColor: hasAudio ? 'rgba(0, 217, 255, 0.2)' : 'var(--border)',
          background: hasAudio ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.03), transparent)' : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'rgba(0, 217, 255, 0.1)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            🎵
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="label-uppercase" style={{ fontSize: 9, color: '#666', marginBottom: 3 }}>
              BPM DE RÉFÉRENCE
            </div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: '#00d9ff' }}>
              {bpm} BPM
            </div>
            {hasAudio && engine.fileName && (
              <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                Basé sur : {engine.fileName}
              </div>
            )}
          </div>

          {!hasAudio && (
            <Link
              to="/studio"
              className="btn-action"
              style={{
                textDecoration: 'none',
                color: 'var(--cyan)',
                borderColor: 'rgba(0, 217, 255, 0.3)',
                fontSize: 11,
              }}
            >
              🎹 BPM auto →
            </Link>
          )}
        </div>
      </div>

      {/* PRESETS */}
      <div>
        <div
          className="label-uppercase"
          style={{ fontSize: 10, color: '#666', marginBottom: 12, letterSpacing: '1px' }}
        >
          STYLES DISPONIBLES
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          {STYLE_PRESETS.map((style) => (
            <StyleCard
              key={style.id}
              style={style}
              isSelected={selectedStyle === style.id}
              onClick={() => setSelectedStyle(style.id)}
            />
          ))}
        </div>
      </div>

      {/* GÉNÉRATEUR */}
      <div>
        <div
          className="label-uppercase"
          style={{ fontSize: 10, color: '#666', marginBottom: 12, letterSpacing: '1px' }}
        >
          GÉNÉRATEUR · {STYLE_PRESETS.find((s) => s.id === selectedStyle)?.name}
        </div>
        <MelodyGenerator bpm={bpm} />
      </div>

      {/* COMMENT ÇA MARCHE */}
      <div className="panel" style={{ padding: 16 }}>
        <div
          className="label-uppercase"
          style={{ fontSize: 10, color: '#666', marginBottom: 14, letterSpacing: '1px' }}
        >
          💡 COMMENT ÇA MARCHE
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          <InfoStep
            number="1"
            icon="🎼"
            title="Chaînes de Markov"
            description="Le générateur utilise des probabilités de transition entre notes."
            color="#ffd43b"
          />
          <InfoStep
            number="2"
            icon="🎨"
            title="Contraintes musicales"
            description="Chaque style a ses gammes, intervalles, rythmes et accords."
            color="#00d9ff"
          />
          <InfoStep
            number="3"
            icon="🎹"
            title="Export MIDI"
            description="Exporte en MIDI pour l'ouvrir dans ton DAW préféré."
            color="#7c5cff"
          />
        </div>
      </div>
    </div>
  );
};

const StyleCard: React.FC<{
  style: StylePreset;
  isSelected: boolean;
  onClick: () => void;
}> = ({ style, isSelected, onClick }) => (
  <div
    onClick={onClick}
    className="panel"
    style={{
      padding: 14,
      cursor: 'pointer',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      borderColor: isSelected ? style.color : 'var(--border)',
      background: isSelected ? `linear-gradient(135deg, ${style.color}10, transparent)` : undefined,
      transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
      boxShadow: isSelected ? `0 8px 24px ${style.color}22` : 'none',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {isSelected && (
      <div
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: style.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          color: '#000',
          fontWeight: 700,
        }}
      >
        ✓
      </div>
    )}

    <div style={{ fontSize: 24, marginBottom: 8 }}>{style.icon}</div>

    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: isSelected ? style.color : '#fff',
        letterSpacing: '0.5px',
        marginBottom: 4,
      }}
    >
      {style.name}
    </div>

    <div style={{ fontSize: 9, color: '#888', lineHeight: 1.4, marginBottom: 8 }}>
      {style.description}
    </div>

    <div
      className="mono"
      style={{
        fontSize: 8,
        color: '#666',
        padding: '2px 6px',
        background: 'var(--bg-1)',
        borderRadius: 4,
        display: 'inline-block',
      }}
    >
      {style.bpmRange} BPM
    </div>
  </div>
);

const InfoStep: React.FC<{
  number: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}> = ({ number, icon, title, description, color }) => (
  <div style={{ display: 'flex', gap: 12 }}>
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: `${color}15`,
        border: `1px solid ${color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {icon}
      <div
        style={{
          position: 'absolute',
          top: -6,
          right: -6,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: color,
          color: '#000',
          fontSize: 10,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {number}
      </div>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 10, color: '#888', lineHeight: 1.5 }}>{description}</div>
    </div>
  </div>
);