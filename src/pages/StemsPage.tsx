// src/pages/StemsPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { separateVocalsWithProgress, checkDemucsHealth } from '../audio/demucsClient';
import { audioBufferToWav } from '../audio/wavEncoder';
import { UploadProgress } from '../components/UploadProgress';
import { StemPlayer } from '../components/StemPlayer';
import { ExportWav } from '../components/ExportWav';

export const StemsPage: React.FC = () => {
  const engine = useAudioEngineContext();

  const [isSeparating, setIsSeparating] = useState(false);
  const [stems, setStems] = useState<{ vocals: string; noVocals: string } | null>(null);
  const [demucsOnline, setDemucsOnline] = useState<boolean | null>(null);
  const [uploadProgress, setUploadProgress] = useState({
    visible: false,
    percent: 0,
    loaded: 0,
    total: 0,
    stage: 'upload' as 'upload' | 'processing',
  });

  useEffect(() => {
    checkDemucsHealth().then(setDemucsOnline);
  }, []);

  const handleSeparate = async () => {
    if (!engine.audioBuffer) {
      alert("Charge un audio d'abord dans la page Studio");
      return;
    }

    setIsSeparating(true);
    setUploadProgress({ visible: true, percent: 0, loaded: 0, total: 0, stage: 'upload' });

    try {
      const wav = audioBufferToWav(engine.audioBuffer);
      const file = new File([wav], 'input.wav', { type: 'audio/wav' });

      const res = await separateVocalsWithProgress(file, (percent, loaded, total) => {
        setUploadProgress({
          visible: true,
          percent,
          loaded,
          total,
          stage: percent >= 100 ? 'processing' : 'upload',
        });
      });

      setStems({ vocals: res.vocalsUrl, noVocals: res.noVocalsUrl });

      setTimeout(() => setUploadProgress((p) => ({ ...p, visible: false })), 800);
    } catch (e) {
      console.error('Erreur séparation:', e);
      setUploadProgress((p) => ({ ...p, visible: false }));
      alert('Erreur lors de la séparation. Vérifie que le serveur Demucs est bien lancé.');
    } finally {
      setIsSeparating(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fade-in" style={{ padding: 20, display: 'grid', gap: 20 }}>
      {/* === HEADER === */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          🎤 <span style={{ color: '#00ff88' }}>Séparation de Stems</span>
        </h2>
        <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
          Isolation voix / instrumental avec Demucs IA (htdemucs_ft)
        </p>
      </div>

      {/* === STATUT SERVEUR DEMUCS === */}
      <div
        className="panel"
        style={{
          padding: 16,
          borderColor: demucsOnline === true
            ? 'rgba(0, 255, 136, 0.3)'
            : demucsOnline === false
            ? 'rgba(255, 51, 102, 0.3)'
            : 'var(--border)',
          background:
            demucsOnline === true
              ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.03), transparent)'
              : undefined,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background:
                  demucsOnline === true ? '#00ff88' : demucsOnline === false ? '#ff3366' : '#666',
                boxShadow: demucsOnline === true ? '0 0 10px #00ff88' : 'none',
              }}
            />
            <div>
              <div
                className="label-uppercase"
                style={{ fontSize: 10, color: '#666', marginBottom: 2 }}
              >
                SERVEUR DEMUCS
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 12,
                  color:
                    demucsOnline === true
                      ? '#00ff88'
                      : demucsOnline === false
                      ? '#ff3366'
                      : '#888',
                  fontWeight: 600,
                }}
              >
                {demucsOnline === null
                  ? 'VÉRIFICATION...'
                  : demucsOnline
                  ? 'ONLINE · localhost:8000'
                  : 'OFFLINE'}
              </div>
            </div>
          </div>

          {demucsOnline === false && (
            <div
              style={{
                fontSize: 10,
                color: '#888',
                padding: '8px 12px',
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ color: '#ff3366', marginBottom: 4 }}>
                ⚠️ Lance le serveur Python :
              </div>
              <div>cd C:\Users\NATO\demucs-server</div>
              <div>.\venv\Scripts\Activate.ps1</div>
              <div>uvicorn server:app --reload --port 8000</div>
            </div>
          )}
        </div>
      </div>

      {/* === ÉTAT VIDE : PAS D'AUDIO === */}
      {!engine.audioBuffer && (
        <div
          className="panel"
          style={{
            padding: 32,
            textAlign: 'center',
            borderStyle: 'dashed',
            borderColor: 'rgba(0, 255, 136, 0.3)',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎤</div>
          <div style={{ fontSize: 14, color: '#fff', marginBottom: 8, fontWeight: 600 }}>
            Aucun audio chargé
          </div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            Pour séparer les stems (voix + instrumental), tu dois d'abord charger un audio
            dans la page Studio.
          </div>
          <Link
            to="/studio"
            className="btn-action primary"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            🎹 Aller au Studio
          </Link>
        </div>
      )}

      {/* === ÉTAT PRÊT : AUDIO CHARGÉ === */}
      {engine.audioBuffer && !stems && (
        <>
          {/* Info fichier */}
          <div className="panel" style={{ padding: 16 }}>
            <div
              className="label-uppercase"
              style={{ fontSize: 10, color: '#666', marginBottom: 8 }}
            >
              FICHIER SOURCE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'rgba(0, 217, 255, 0.1)',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                🎵
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: '#fff',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {engine.fileName || 'Sans titre'}
                </div>
                <div className="mono" style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                  {engine.result?.duration.toFixed(1)}s ·{' '}
                  {engine.result?.sampleRate} Hz · {engine.result?.bpm} BPM
                </div>
              </div>
            </div>
          </div>

          {/* Bouton de séparation */}
          <div
            className="panel"
            style={{
              padding: 24,
              borderColor: demucsOnline === true ? 'rgba(0, 255, 136, 0.3)' : 'var(--border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>✂️</div>
            <div
              style={{
                fontSize: 14,
                color: '#fff',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Prêt à séparer
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#888',
                marginBottom: 20,
                maxWidth: 400,
                margin: '0 auto 20px',
              }}
            >
              Le traitement prend en moyenne 1 à 5 minutes selon la durée du morceau.
              Le fichier sera analysé en 2 pistes : voix et instrumental.
            </div>

            <button
              onClick={handleSeparate}
              disabled={isSeparating || demucsOnline !== true}
              className="btn-action primary"
              style={{
                padding: '14px 32px',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '1px',
                background:
                  isSeparating || demucsOnline !== true
                    ? 'var(--bg-2)'
                    : 'linear-gradient(135deg, #00ff88, #00b866)',
                color: isSeparating || demucsOnline !== true ? '#666' : '#000',
                borderColor: 'transparent',
                cursor:
                  isSeparating || demucsOnline !== true ? 'not-allowed' : 'pointer',
              }}
            >
              {isSeparating ? '⏳ SÉPARATION EN COURS...' : '🎤 LANCER LA SÉPARATION'}
            </button>

            {demucsOnline === false && (
              <div style={{ fontSize: 10, color: '#ff3366', marginTop: 12 }}>
                ⚠️ Le serveur Demucs doit être démarré pour continuer
              </div>
            )}
          </div>

          {/* Barre de progression */}
          <UploadProgress
            percent={uploadProgress.percent}
            loaded={uploadProgress.loaded}
            total={uploadProgress.total}
            visible={uploadProgress.visible}
            stage={uploadProgress.stage}
          />
        </>
      )}

      {/* === RÉSULTATS : STEMS SÉPARÉS === */}
      {stems && (
        <>
          {/* En-tête de succès */}
          <div
            className="panel fade-in"
            style={{
              padding: 20,
              borderColor: 'rgba(0, 255, 136, 0.3)',
              background:
                'linear-gradient(135deg, rgba(0, 255, 136, 0.05), transparent)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 32 }}>🎉</div>
              <div>
                <div
                  style={{ fontSize: 15, fontWeight: 700, color: '#00ff88', marginBottom: 4 }}
                >
                  Séparation terminée !
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  2 pistes prêtes : voix et instrumental
                </div>
              </div>
            </div>
          </div>

          {/* Cartes de stems */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            <StemCard
              icon="🎤"
              name="VOIX"
              description="Piste vocale isolée"
              color="#ff3366"
              url={stems.vocals}
              onDownload={() => handleDownload(stems.vocals, 'vocals.wav')}
            />
            <StemCard
              icon="🎸"
              name="INSTRUMENTAL"
              description="Mix sans voix"
              color="#00ff88"
              url={stems.noVocals}
              onDownload={() => handleDownload(stems.noVocals, 'no_vocals.wav')}
            />
          </div>

          {/* Player multi-piste */}
          <div className="panel slide-in">
            <div className="panel-header">
              <span>🎚️ LECTEUR MULTI-PISTE</span>
            </div>
            <div className="panel-body">
              <StemPlayer
                audioBuffer={engine.audioBuffer}
                stems={[
                  { id: 'vocals', name: 'VOIX', url: stems.vocals, color: '#ff3366', icon: '🎤' },
                  { id: 'no_vocals', name: 'INSTRUMENTAL', url: stems.noVocals, color: '#00ff88', icon: '🎸' },
                ].filter((s) => s.url)}
              />
            </div>
          </div>

          {/* Export WAV */}
          <ExportWav stems={stems} duration={engine.result?.duration ?? 0} />

          {/* Bouton reset */}
          <div style={{ textAlign: 'center' }}>
            <button
              className="btn-action"
              onClick={() => setStems(null)}
              style={{ fontSize: 11 }}
            >
              🔄 Nouvelle séparation
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ============================================================
   SOUS-COMPOSANT : Carte de stem
   ============================================================ */

const StemCard: React.FC<{
  icon: string;
  name: string;
  description: string;
  color: string;
  url: string;
  onDownload: () => void;
}> = ({ icon, name, description, color, url, onDownload }) => (
  <div
    className="panel fade-in"
    style={{
      padding: 20,
      borderColor: `${color}40`,
      background: `linear-gradient(135deg, ${color}08, transparent)`,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: `${color}15`,
          border: `1px solid ${color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          className="label-uppercase"
          style={{ fontSize: 9, color: '#666', marginBottom: 2 }}
        >
          PISTE
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color }}>{name}</div>
        <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
          {description}
        </div>
      </div>
    </div>

    {/* Audio player natif */}
    <audio
      src={url}
      controls
      style={{
        width: '100%',
        height: 32,
        marginBottom: 12,
      }}
    />

    {/* Bouton de téléchargement */}
    <button
      onClick={onDownload}
      className="btn-action"
      style={{
        width: '100%',
        color,
        borderColor: `${color}40`,
        background: `${color}10`,
      }}
    >
      💾 TÉLÉCHARGER WAV
    </button>
  </div>
);