// src/pages/MasteringPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MasteringPanel } from '../components/MasteringPanel';
import { SpectrumRibbon } from '../components/SpectrumRibbon';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';

interface MasteredExport {
  id: string;
  timestamp: number;
  preset: string;
  intensity: number;
  fileName: string;
  audioUrl: string;
  duration: number;
}

const PRESET_INFO: Record<
  string,
  { name: string; description: string; color: string; values: string }
> = {
  warm: {
    name: 'WARM',
    description: 'Chaud et chaleureux',
    color: '#ffb800',
    values: '+2dB · -1dB · 1.1x · 12%',
  },
  balanced: {
    name: 'BALANCED',
    description: 'Neutre et équilibré',
    color: '#00d9ff',
    values: '0dB · 0dB · 1.0x · 8%',
  },
  open: {
    name: 'OPEN',
    description: 'Aérien et large',
    color: '#00ff88',
    values: '-1dB · +2.5dB · 1.3x · 5%',
  },
  master: {
    name: 'MASTER',
    description: 'Neutre (fichiers déjà masterisés)',
    color: '#888',
    values: '0dB · 0dB · 1.0x · 0%',
  },
};

export const MasteringPage: React.FC = () => {
  const engine = useAudioEngineContext();
  const hasAudio = !!engine.audioBuffer;

  const [presetIntensity, setPresetIntensity] = useState(100);
  const [activePreset, setActivePreset] = useState<string>('balanced');
  const [abMode, setAbMode] = useState<'original' | 'mastered'>('original');
  const [isPlayingAB, setIsPlayingAB] = useState(false);
  const [abAnalyser, setAbAnalyser] = useState<AnalyserNode | null>(null);
  const [exports, setExports] = useState<MasteredExport[]>([]);

  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Chargement de l'historique des exports
  useEffect(() => {
    try {
      const raw = localStorage.getItem('waveforge-mastering-exports');
      if (raw) setExports(JSON.parse(raw));
    } catch (e) {
      console.warn('Erreur chargement exports:', e);
    }
  }, []);

  // Nettoyage quand le composant est démonté
  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const saveExports = (list: MasteredExport[]) => {
    setExports(list);
    localStorage.setItem('waveforge-mastering-exports', JSON.stringify(list));
  };

  const handlePlayAB = useCallback(() => {
    if (!engine.audioBuffer || !engine.audioContext) return;
    const ctx = engine.audioContext;

    // Arrêter la lecture précédente si active
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {}
      sourceRef.current = null;
    }

    const source = ctx.createBufferSource();
    source.buffer = engine.audioBuffer;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.82;

    source.connect(analyser);
    analyser.connect(ctx.destination);

    setAbAnalyser(analyser);
    source.start(0);
    sourceRef.current = source;
    setIsPlayingAB(true);

    source.onended = () => {
      setIsPlayingAB(false);
      setAbAnalyser(null);
      sourceRef.current = null;
    };
  }, [engine]);

  const handleStopAB = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {}
      sourceRef.current = null;
    }
    setIsPlayingAB(false);
    setAbAnalyser(null);
  }, []);

  const handleDeleteExport = (id: string) => {
    if (!confirm("Supprimer cet export de l'historique ?")) return;
    saveExports(exports.filter((e) => e.id !== id));
  };

  return (
    <div className="fade-in" style={{ padding: 20, display: 'grid', gap: 20 }}>
      {/* === HEADER === */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
            🎚️ <span style={{ color: '#7c5cff' }}>Mastering</span>
            <span
              style={{
                fontSize: 10,
                color: '#7c5cff',
                marginLeft: 10,
                padding: '2px 8px',
                background: 'rgba(124, 92, 255, 0.15)',
                border: '1px solid rgba(124, 92, 255, 0.4)',
                borderRadius: 10,
                verticalAlign: 'middle',
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}
            >
              PRO
            </span>
          </h2>
          <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
            Chaîne complète : EQ · Compression · Saturation · Limiteur · Export WAV
          </p>
        </div>

        {hasAudio && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: 'rgba(0, 255, 136, 0.06)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderRadius: 8,
              fontSize: 10,
              color: '#00ff88',
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#00ff88',
                boxShadow: '0 0 8px #00ff88',
              }}
            />
            PRÊT À MASTERISER
          </div>
        )}
      </div>

      {/* === ÉTAT VIDE === */}
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
            Charge un audio dans la page Studio pour accéder à la chaîne de mastering
            professionnelle : EQ, compression, saturation, limiteur et export WAV.
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

      {/* === INTERFACE PRINCIPALE === */}
      {hasAudio && (
        <>
          {/* A/B COMPARISON + PRESET INTENSITY */}
          <div
            className="panel"
            style={{
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)',
              gap: 20,
            }}
          >
            {/* A/B COMPARISON */}
            <div>
              <div
                className="label-uppercase"
                style={{
                  fontSize: 10,
                  color: '#666',
                  marginBottom: 10,
                  letterSpacing: '1px',
                }}
              >
                🎧 COMPARAISON A/B
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  background: 'var(--bg-1)',
                  padding: 4,
                  borderRadius: 8,
                }}
              >
                <button
                  onClick={() => setAbMode('original')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 6,
                    border: 'none',
                    background: abMode === 'original' ? '#7c5cff' : 'transparent',
                    color: abMode === 'original' ? '#fff' : '#666',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  🔊 ORIGINAL
                </button>
                <button
                  onClick={() => setAbMode('mastered')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 6,
                    border: 'none',
                    background: abMode === 'mastered' ? '#00ff88' : 'transparent',
                    color: abMode === 'mastered' ? '#000' : '#666',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  🎚️ MASTERISÉ
                </button>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button
                  onClick={isPlayingAB ? handleStopAB : handlePlayAB}
                  className="btn-action primary"
                  style={{
                    flex: 1,
                    background: isPlayingAB
                      ? '#ff3366'
                      : abMode === 'mastered'
                      ? '#00ff88'
                      : '#7c5cff',
                    color: abMode === 'mastered' && !isPlayingAB ? '#000' : '#fff',
                    borderColor: 'transparent',
                    fontWeight: 700,
                    padding: '10px',
                    fontSize: 11,
                  }}
                >
                  {isPlayingAB
                    ? '⏹ ARRÊTER'
                    : `▶ LIRE (${abMode === 'mastered' ? 'Master' : 'Original'})`}
                </button>
              </div>
            </div>

            {/* PRESET INTENSITY */}
            <div>
              <div
                className="label-uppercase"
                style={{
                  fontSize: 10,
                  color: '#666',
                  marginBottom: 10,
                  letterSpacing: '1px',
                }}
              >
                ⚡ INTENSITÉ DU PRESET
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span
                  className="mono"
                  style={{ fontSize: 24, fontWeight: 700, color: '#7c5cff' }}
                >
                  {presetIntensity}%
                </span>
                <div
                  style={{
                    flex: 1,
                    fontSize: 10,
                    color: '#666',
                    lineHeight: 1.4,
                  }}
                >
                  {presetIntensity === 0
                    ? 'Aucun effet appliqué'
                    : presetIntensity < 50
                    ? 'Effets légers · subtil'
                    : presetIntensity < 100
                    ? 'Effets modérés'
                    : 'Effets à pleine puissance'}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={presetIntensity}
                onChange={(e) => setPresetIntensity(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#7c5cff' }}
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
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* === VISUALISEUR DE SPECTRE === */}
          <div className="panel" style={{ padding: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div
                className="label-uppercase"
                style={{ fontSize: 10, color: '#666', letterSpacing: '1px' }}
              >
                📊 SPECTRE SONORE EN TEMPS RÉEL
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 9,
                  color: isPlayingAB ? '#00ff88' : '#666',
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isPlayingAB ? '#00ff88' : '#444',
                    boxShadow: isPlayingAB ? '0 0 8px #00ff88' : 'none',
                  }}
                />
                {isPlayingAB ? 'LIVE' : 'IDLE'}
              </div>
            </div>
            <SpectrumRibbon
  analyser={abAnalyser}
  isActive={isPlayingAB}
  height={220}
/>
          </div>

          {/* LAYOUT 2 COLONNES */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(260px, 320px) 1fr',
              gap: 20,
              alignItems: 'start',
            }}
          >
            {/* COLONNE GAUCHE */}
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
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
                    <div
                      className="mono"
                      style={{ fontSize: 9, color: '#888', marginTop: 2 }}
                    >
                      {engine.fileFormat} ·{' '}
                      {((engine.fileSize ?? 0) / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  </div>
                </div>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
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

              {/* Chaîne de traitement */}
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

              {/* Presets */}
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
                  {Object.entries(PRESET_INFO).map(([key, info]) => (
                    <PresetInfo
                      key={key}
                      name={info.name}
                      description={info.description}
                      color={info.color}
                      values={info.values}
                      isActive={activePreset === key}
                      onClick={() => setActivePreset(key)}
                    />
                  ))}
                </div>
              </div>

              {/* Astuce */}
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
                <div
                  style={{
                    fontSize: 10,
                    color: '#666',
                    marginTop: 6,
                    lineHeight: 1.5,
                  }}
                >
                  Fichier déjà masterisé (BandLab, LANDR...) ? Utilise le preset{' '}
                  <strong style={{ color: '#888' }}>MASTER</strong> pour éviter le
                  clipping.
                </div>
              </div>
            </div>

            {/* COLONNE DROITE : PANNEAU MASTERING */}
            <div>
              <MasteringPanel
                audioContext={engine.audioContext}
                sourceNode={null}
                sourceBuffer={engine.audioBuffer}
              />
            </div>
          </div>

          {/* === HISTORIQUE DES EXPORTS === */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div
                className="label-uppercase"
                style={{
                  fontSize: 10,
                  color: '#666',
                  letterSpacing: '1px',
                }}
              >
                📦 HISTORIQUE DES EXPORTS · {exports.length}
              </div>
              {exports.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm("Effacer tout l'historique des exports ?"))
                      saveExports([]);
                  }}
                  className="btn-action"
                  style={{
                    padding: '4px 10px',
                    fontSize: 10,
                    color: '#ff3366',
                  }}
                >
                  🗑️ TOUT EFFACER
                </button>
              )}
            </div>

            {exports.length === 0 ? (
              <div
                className="panel"
                style={{
                  padding: 20,
                  textAlign: 'center',
                  fontSize: 11,
                  color: '#666',
                  borderStyle: 'dashed',
                }}
              >
                Aucun export pour le moment. Clique sur "EXPORT WAV MASTERISÉ" pour
                commencer.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 12,
                }}
              >
                {exports.slice(0, 6).map((exp) => (
                  <ExportCard
                    key={exp.id}
                    exportItem={exp}
                    onDelete={() => handleDeleteExport(exp.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
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
  isActive: boolean;
  onClick: () => void;
}> = ({ name, description, color, values, isActive, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: '8px 10px',
      background: isActive ? `${color}10` : 'var(--bg-1)',
      borderRadius: 6,
      borderLeft: `3px solid ${color}`,
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: isActive ? `1px solid ${color}40` : undefined,
      borderLeftWidth: 3,
      borderLeftColor: color,
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
      <span
        style={{ color, fontWeight: 700, fontSize: 11, letterSpacing: '0.5px' }}
      >
        {name}
        {isActive && <span style={{ marginLeft: 6, fontSize: 9 }}>✓</span>}
      </span>
      <span className="mono" style={{ fontSize: 8, color: '#666' }}>
        {values}
      </span>
    </div>
    <div style={{ fontSize: 9, color: '#666' }}>{description}</div>
  </div>
);

const ExportCard: React.FC<{
  exportItem: MasteredExport;
  onDelete: () => void;
}> = ({ exportItem, onDelete }) => {
  const date = new Date(exportItem.timestamp);
  const dateStr = date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="panel fade-in"
      style={{
        padding: 14,
        borderColor: 'var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: '#7c5cff',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {exportItem.preset} · {exportItem.intensity}%
          </div>
          <div
            className="mono"
            style={{ fontSize: 9, color: '#666', marginTop: 2 }}
          >
            {dateStr}
          </div>
        </div>
        <button
          onClick={onDelete}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: 14,
            padding: 2,
          }}
          title="Supprimer"
        >
          ✕
        </button>
      </div>

      <div
        className="mono"
        style={{
          fontSize: 9,
          color: '#888',
          padding: '4px 8px',
          background: 'var(--bg-1)',
          borderRadius: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: 8,
        }}
      >
        🎵 {exportItem.fileName}
      </div>

      <audio
        src={exportItem.audioUrl}
        controls
        style={{ width: '100%', height: 28 }}
      />
    </div>
  );
};