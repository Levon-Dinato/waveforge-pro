import { useState } from 'react';
import {
  renderFullMixToWav,
  renderSingleStemToWav,
} from '../audio/wavRenderer';
import type { StemInput } from '../audio/wavRenderer';

interface Props {
  stems: {
    vocals?: string;
    noVocals?: string;
  } | null;
  duration: number;
  volumes?: Record<string, number>;
  muted?: Record<string, boolean>;
  solo?: string | null;
  tempo?: number;
  pitch?: number;
}

export function ExportWav({
  stems,
  duration,
  volumes = {},
  muted = {},
  solo = null,
  tempo = 1.0,
  pitch = 0,
}: Props) {
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [lastExport, setLastExport] = useState<string>('');

  if (!stems) return null;

  const buildStemInputs = (): StemInput[] => {
    const list: StemInput[] = [];
    if (stems.vocals) {
      list.push({
        url: stems.vocals,
        volume: volumes['vocals'] ?? 100,
        muted: muted['vocals'] ?? false,
        solo: solo === 'vocals',
      });
    }
    if (stems.noVocals) {
      list.push({
        url: stems.noVocals,
        volume: volumes['no_vocals'] ?? 100,
        muted: muted['no_vocals'] ?? false,
        solo: solo === 'no_vocals',
      });
    }
    return list;
  };

  const handleExportFullMix = async () => {
    if (isRendering) return;
    setIsRendering(true);
    setProgress('Préparation...');

    try {
      const inputs = buildStemInputs();
      setProgress(`Rendu de ${inputs.length} stem(s)...`);

      const blob = await renderFullMixToWav(
        inputs,
        duration,
        tempo,
        pitch
      );

      // Télécharge
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `waveforge-mix-${Date.now()}.wav`;
      a.click();
      URL.revokeObjectURL(url);

      const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
      setLastExport(`✅ Export réussi (${sizeMB} MB)`);
      setProgress('');
    } catch (e) {
      console.error('Erreur export WAV :', e);
      setLastExport(`❌ Erreur : ${(e as Error).message}`);
      setProgress('');
    } finally {
      setIsRendering(false);
    }
  };

  const handleExportVocalsOnly = async () => {
    if (!stems.vocals || isRendering) return;
    setIsRendering(true);
    setProgress('Rendu de la voix...');

    try {
      const blob = await renderSingleStemToWav(
        stems.vocals,
        duration,
        100,
        tempo,
        pitch
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `waveforge-vocals-${Date.now()}.wav`;
      a.click();
      URL.revokeObjectURL(url);

      const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
      setLastExport(`✅ Vocals exporté (${sizeMB} MB)`);
      setProgress('');
    } catch (e) {
      console.error('Erreur export vocals :', e);
      setLastExport(`❌ Erreur : ${(e as Error).message}`);
      setProgress('');
    } finally {
      setIsRendering(false);
    }
  };

  const handleExportInstruOnly = async () => {
    if (!stems.noVocals || isRendering) return;
    setIsRendering(true);
    setProgress('Rendu de l\'instrumental...');

    try {
      const blob = await renderSingleStemToWav(
        stems.noVocals,
        duration,
        100,
        tempo,
        pitch
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `waveforge-instru-${Date.now()}.wav`;
      a.click();
      URL.revokeObjectURL(url);

      const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
      setLastExport(`✅ Instrumental exporté (${sizeMB} MB)`);
      setProgress('');
    } catch (e) {
      console.error('Erreur export instru :', e);
      setLastExport(`❌ Erreur : ${(e as Error).message}`);
      setProgress('');
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="panel slide-in delay-3" style={{ marginTop: 16 }}>
      <div
        className="panel-header"
        style={{ color: 'var(--cyan)' }}
      >
        <span>💾 EXPORT WAV</span>
        <span className="mono" style={{ fontSize: 10 }}>
          {isRendering ? '⏳ RENDU EN COURS' : 'PRÊT'}
        </span>
      </div>
      <div className="panel-body" style={{ padding: 16 }}>
        {/* Info */}
        <div
          className="label-uppercase"
          style={{
            fontSize: 9,
            color: '#888',
            marginBottom: 12,
          }}
        >
          Rendu audio final (16-bit · 44.1 kHz · Stéréo)
        </div>

        {/* Boutons */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <button
            className="btn-action primary"
            onClick={handleExportFullMix}
            disabled={isRendering}
          >
            {isRendering && progress.includes('stem')
              ? '⏳ Rendu...'
              : '🎧 MIX COMPLET (.wav)'}
          </button>

          {stems.vocals && (
            <button
              className="btn-action"
              onClick={handleExportVocalsOnly}
              disabled={isRendering}
              style={{ borderColor: 'rgba(255, 51, 102, 0.3)' }}
            >
              🎤 VOIX SEULE (.wav)
            </button>
          )}

          {stems.noVocals && (
            <button
              className="btn-action"
              onClick={handleExportInstruOnly}
              disabled={isRendering}
              style={{ borderColor: 'rgba(0, 255, 136, 0.3)' }}
            >
              🎸 INSTRU SEUL (.wav)
            </button>
          )}
        </div>

        {/* Progress */}
        {isRendering && progress && (
          <div
            className="fade-in"
            style={{
              padding: 8,
              background: 'rgba(0, 217, 255, 0.08)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--cyan)',
              marginBottom: 8,
            }}
          >
            🎬 {progress}
          </div>
        )}

        {/* Last export */}
        {lastExport && (
          <div
            className="fade-in"
            style={{
              padding: 8,
              background: lastExport.startsWith('✅')
                ? 'rgba(0, 255, 136, 0.08)'
                : 'rgba(255, 51, 102, 0.08)',
              border: lastExport.startsWith('✅')
                ? '1px solid rgba(0, 255, 136, 0.3)'
                : '1px solid rgba(255, 51, 102, 0.3)',
              borderRadius: 6,
              fontSize: 12,
              color: lastExport.startsWith('✅') ? 'var(--green)' : '#ff3366',
            }}
          >
            {lastExport}
          </div>
        )}
      </div>
    </div>
  );
}