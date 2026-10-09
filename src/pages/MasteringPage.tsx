// src/pages/MasteringPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { MasteringPanel } from '../components/MasteringPanel';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';

export const MasteringPage: React.FC = () => {
  const engine = useAudioEngineContext();
  const hasAudio = !!engine.audioBuffer;

  return (
    <div className="fade-in" style={{ padding: 20, display: 'grid', gap: 20 }}>
      {/* === HEADER === */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          🎚️ <span style={{ color: '#7c5cff' }}>Mastering</span>
        </h2>
        <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
          Presets Warm/Balanced/Open/Master · analyse LUFS · export WAV masterisé
        </p>
      </div>

      {/* === ÉTAT VIDE : PAS D'AUDIO === */}
      {!hasAudio && (
        <div
          className="panel"
          style={{
            padding: 40,
            textAlign: 'center',
            borderStyle: 'dashed',
            borderColor: 'rgba(124, 92, 255, 0.3)',
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>🎚️</div>
          <div
            style={{
              fontSize: 15,
              color: '#fff',
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            Aucun audio chargé
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#888',
              marginBottom: 24,
              maxWidth: 450,
              margin: '0 auto 24px',
              lineHeight: 1.6,
            }}
          >
            Pour utiliser le mastering, tu dois d'abord charger un audio dans la page
            Studio. Le mastering appliquera une chaîne de traitement professionnelle
            (EQ, compression, saturation, limiteur) avec 4 presets prêts à l'emploi.
          </div>
          <Link
            to="/studio"
            className="btn-action primary"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #7c5cff, #5b3fd9)',
              color: '#fff',
              borderColor: 'transparent',
              padding: '12px 24px',
              fontSize: 12,
            }}
          >
            🎹 Aller au Studio
          </Link>
        </div>
      )}

      {/* === LAYOUT 2 COLONNES === */}
      {hasAudio && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(260px, 320px) 1fr',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {/* === COLONNE GAUCHE : INFOS === */}
          <div style={{ display: 'grid', gap: 16, position: 'sticky', top: 20 }}>
            {/* Fichier source */}
            <div className="panel" style={{ padding: 16 }}>
              <div
                className="label-uppercase"
                style={{
                  fontSize: 10,
                  color: '#666',
                  marginBottom: 12,
                  letterSpacing: '1px',
                }}
              >
                🎵 FICHIER SOURCE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'rgba(124, 92, 255, 0.1)',
                    border: '1px solid rgba(124, 92, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  🎵
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#fff',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {engine.fileName || 'Sans titre'}
                  </div>
                  <div className="mono" style={{ fontSize: 9, color: '#888', marginTop: 2 }}>
                    {engine.fileFormat} · {(engine.fileSize / (1024 * 1024)).toFixed(1)} MB
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
                <InfoBox
                  label="DURÉE"
                  value={`${engine.result?.duration.toFixed(1)}s`}
                  color="#7c5cff"
                />
                <InfoBox
                  label="BPM"
                  value={engine.result?.bpm?.toString() ?? '—'}
                  color="#7c5cff"
                />
              </div>
            </div>

            {/* Info mastering */}
            <div
              className="panel"
              style={{
                padding: 16,
                borderColor: 'rgba(124, 92, 255, 0.2)',
                background:
                  'linear-gradient(135deg, rgba(124, 92, 255, 0.03), transparent)',
              }}
            >
              <div
                className="label-uppercase"
                style={{
                  fontSize: 10,
                  color: '#7c5cff',
                  marginBottom: 12,
                  letterSpacing: '1px',
                }}
              >
                ⚙️ CHAÎNE DE TRAITEMENT
              </div>
              <div style={{ display: 'grid', gap: 6, fontSize: 11 }}>
                <ChainStep icon="🎛️" label="EQ 3 bandes" />
                <ChainStep icon="📊" label="Compression" />
                <ChainStep icon="🔥" label="Saturation" />
                <ChainStep icon="🌌" label="Stéréo Widener" />
                <ChainStep icon="🛡️" label="Limiteur brickwall" />
              </div>
            </div>

            {/* Presets disponibles */}
            <div className="panel" style={{ padding: 16 }}>
              <div
                className="label-uppercase"
                style={{
                  fontSize: 10,
                  color: '#666',
                  marginBottom: 12,
                  letterSpacing: '1px',
                }}
              >
                🎨 PRESETS DISPONIBLES
              </div>
              <div style={{ display: 'grid', gap: 8, fontSize: 10 }}>
                <PresetInfo
                  name="WARM"
                  description="Chaud et chaleureux"
                  color="#ffb800"
                  values="+2dB · -1dB · 1.1x · 12%"
                />
                <PresetInfo
                  name="BALANCED"
                  description="Neutre et équilibré"
                  color="#00d9ff"
                  values="0dB · 0dB · 1.0x · 8%"
                />
                <PresetInfo
                  name="OPEN"
                  description="Aérien et large"
                  color="#00ff88"
                  values="-1dB · +2.5dB · 1.3x · 5%"
                />
                <PresetInfo
                  name="MASTER"
                  description="Neutre (fichiers déjà masterisés)"
                  color="#888"
                  values="0dB · 0dB · 1.0x · 0%"
                />
              </div>
            </div>

            {/* Info tips */}
            <div
              className="panel"
              style={{
                padding: 12,
                background: 'var(--bg-1)',
                borderColor: 'var(--border)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                💡 <strong style={{ color: '#888' }}>Astuce :</strong>
              </div>
              <div style={{ fontSize: 10, color: '#666', marginTop: 6, lineHeight: 1.5 }}>
                Si ton fichier est déjà masterisé (BandLab, LANDR...), utilise le preset{' '}
                <strong style={{ color: '#888' }}>MASTER</strong> pour éviter le clipping.
              </div>
            </div>
          </div>

          {/* === COLONNE DROITE : PANNEAU MASTERING === */}
          <div>
            <MasteringPanel
              audioContext={engine.audioContext}
              sourceNode={null}
              sourceBuffer={engine.audioBuffer}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   SOUS-COMPOSANTS
   ============================================================ */

const InfoBox: React.FC<{ label: string; value: string; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div
    style={{
      padding: '8px 10px',
      background: 'var(--bg-1)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      textAlign: 'center',
    }}
  >
    <div
      className="label-uppercase"
      style={{ fontSize: 8, color: '#666', marginBottom: 3 }}
    >
      {label}
    </div>
    <div className="mono" style={{ fontSize: 13, color, fontWeight: 600 }}>
      {value}
    </div>
  </div>
);

const ChainStep: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 8px',
      background: 'var(--bg-1)',
      borderRadius: 4,
      color: '#ccc',
    }}
  >
    <span style={{ fontSize: 12 }}>{icon}</span>
    <span style={{ fontSize: 10 }}>{label}</span>
  </div>
);

const PresetInfo: React.FC<{
  name: string;
  description: string;
  color: string;
  values: string;
}> = ({ name, description, color, values }) => (
  <div
    style={{
      padding: '8px 10px',
      background: 'var(--bg-1)',
      borderRadius: 6,
      borderLeft: `3px solid ${color}`,
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
      }}
    >
      <span style={{ color, fontWeight: 700, fontSize: 11, letterSpacing: '0.5px' }}>
        {name}
      </span>
      <span
        className="mono"
        style={{ fontSize: 8, color: '#666' }}
      >
        {values}
      </span>
    </div>
    <div style={{ fontSize: 9, color: '#666' }}>{description}</div>
  </div>
);