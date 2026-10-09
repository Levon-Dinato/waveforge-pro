// src/pages/StemsPage.tsx
import React, { useState } from 'react';
import { AnimatedButton } from '../components/AnimatedButton';
import { UploadProgress } from '../components/UploadProgress';
import { StemPlayer } from '../components/StemPlayer';
import { ExportWav } from '../components/ExportWav';
import { useAudioEngineContext } from '../contexts/AudioEngineContext';
import { separateVocalsWithProgress, checkDemucsHealth } from '../audio/demucsClient';
import { audioBufferToWav } from '../audio/wavEncoder';

export const StemsPage: React.FC = () => {
  const engine = useAudioEngineContext();
  const [isSeparating, setIsSeparating] = useState(false);
  const [stems, setStems] = useState<{ vocals: string; noVocals: string } | null>(null);
  const [demucsOnline, setDemucsOnline] = useState<boolean | null>(null);
  const [uploadProgress, setUploadProgress] = useState({
    visible: false, percent: 0, loaded: 0, total: 0,
    stage: 'upload' as 'upload' | 'processing',
  });

  React.useEffect(() => {
    checkDemucsHealth().then(setDemucsOnline);
  }, []);

  const handleSeparate = async () => {
    if (!engine.audioBuffer) {
      alert("Charge un audio d'abord dans le Studio");
      return;
    }
    setIsSeparating(true);
    setUploadProgress({ visible: true, percent: 0, loaded: 0, total: 0, stage: 'upload' });

    try {
      const wav = audioBufferToWav(engine.audioBuffer);
      const file = new File([wav], 'input.wav', { type: 'audio/wav' });
      const res = await separateVocalsWithProgress(file, (percent, loaded, total) => {
        setUploadProgress({ visible: true, percent, loaded, total, stage: percent >= 100 ? 'processing' : 'upload' });
      });
      setStems({ vocals: res.vocalsUrl, noVocals: res.noVocalsUrl });
      setTimeout(() => setUploadProgress((p) => ({ ...p, visible: false })), 800);
    } catch (e) {
      console.error(e);
      setUploadProgress((p) => ({ ...p, visible: false }));
    } finally {
      setIsSeparating(false);
    }
  };

  return (
    <div className="fade-in" style={{ padding: 20, display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
          🎤 <span style={{ color: 'var(--green)' }}>Séparation de Stems</span>
        </h2>
        <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
          Isolation voix + instrumental avec Demucs IA
        </p>
      </div>

      {/* Statut Demucs */}
      {demucsOnline !== null && (
        <div className="panel" style={{ padding: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: demucsOnline ? '#00ff88' : '#ff3366' }} />
            <span style={{ color: demucsOnline ? '#00ff88' : '#ff3366' }}>
              DEMUCS {demucsOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
            {!demucsOnline && (
              <span style={{ color: '#666', fontSize: 10 }}>
                (Lance le serveur Python : voir README)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bouton de séparation */}
      <AnimatedButton
        onClick={handleSeparate}
        disabled={isSeparating || !engine.audioBuffer || demucsOnline === false}
      >
        🎤 LANCER LA SÉPARATION
      </AnimatedButton>

      <UploadProgress
        percent={uploadProgress.percent}
        loaded={uploadProgress.loaded}
        total={uploadProgress.total}
        visible={uploadProgress.visible}
        stage={uploadProgress.stage}
      />

      {/* Résultats */}
      {stems && (
        <>
          <div className="panel slide-in">
            <div className="panel-header"><span>🎉 STEMS SÉPARÉS</span></div>
            <div className="panel-body">
              <div style={{ display: 'flex', gap: 8 }}>
                {stems.vocals && (
                  <a href={stems.vocals} download="vocals.wav" className="btn-action"
                    style={{ textDecoration: 'none', color: 'var(--cyan)', borderColor: 'rgba(0, 217, 255, 0.3)' }}>
                    🎤 VOCALS.WAV
                  </a>
                )}
                {stems.noVocals && (
                  <a href={stems.noVocals} download="no_vocals.wav" className="btn-action"
                    style={{ textDecoration: 'none', color: 'var(--cyan)', borderColor: 'rgba(0, 217, 255, 0.3)' }}>
                    🎸 NO_VOCALS.WAV
                  </a>
                )}
              </div>
            </div>
          </div>

          <StemPlayer
            audioBuffer={engine.audioBuffer}
            stems={[
              { id: 'vocals', name: 'VOIX', url: stems.vocals, color: '#ff3366', icon: '🎤' },
              { id: 'no_vocals', name: 'INSTRUMENTAL', url: stems.noVocals, color: '#00ff88', icon: '🎸' },
            ].filter((s) => s.url)}
          />

          <ExportWav stems={stems} duration={engine.result?.duration ?? 0} />
        </>
      )}
    </div>
  );
};