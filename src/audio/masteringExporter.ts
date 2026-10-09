// src/audio/masteringExporter.ts
import { MasteringChain, type MasteringPreset } from './masteringChain';
import audioBufferToWav from 'audiobuffer-to-wav';

export interface MasteringExportOptions {
  buffer: AudioBuffer;              // Le buffer audio source (mix complet)
  preset: MasteringPreset;          // Preset à appliquer
  loudness: number;                 // -12 à +12 dB
  presence: number;                 // -12 à +12 dB
  width: number;                    // 0 à 2
  saturation: number;               // 0 à 1
  onProgress?: (progress: number) => void; // 0 à 1
}

/**
 * Rend le buffer audio avec la chaîne de mastering appliquée,
 * dans un OfflineAudioContext (plus rapide que le temps réel).
 */
export async function exportMasteredWav(options: MasteringExportOptions): Promise<Blob> {
  const {
    buffer,
    preset,
    loudness,
    presence,
    width,
    saturation,
    onProgress,
  } = options;

  const sampleRate = buffer.sampleRate;
  const numberOfChannels = buffer.numberOfChannels;
  const length = buffer.length;

  // 1. Création du contexte hors-ligne (rendu plus rapide que le temps réel)
  const offlineContext = new OfflineAudioContext({
    numberOfChannels,
    length,
    sampleRate,
  });

  // 2. Création de la source depuis le buffer
  const source = offlineContext.createBufferSource();
  source.buffer = buffer;

  // 3. Création de la chaîne de mastering dans le contexte hors-ligne
  const chain = new MasteringChain(offlineContext);

  // 4. Application du preset + ajustements utilisateur
  chain.applyPreset(preset);
  chain.setLoudness(loudness);
  chain.setPresence(presence);
  chain.setWidth(width);
  chain.setSaturation(saturation);

  // 5. Connexion : source → chaîne → destination
  source.connect(chain['inputGain']); // accès direct au nœud d'entrée
  chain.getOutputNode().connect(offlineContext.destination);

  // 6. Lancement de la lecture dans le contexte hors-ligne
  source.start(0);

  // 7. Progression simulée (l'OfflineAudioContext n'expose pas d'événement de progression)
  if (onProgress) {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.1;
      if (progress > 0.95) {
        clearInterval(interval);
        onProgress(0.95);
      } else {
        onProgress(progress);
      }
    }, 100);
  }

  // 8. Rendu audio (promesse)
  const renderedBuffer = await offlineContext.startRendering();

  // 9. Nettoyage
  chain.destroy();

  if (onProgress) onProgress(1);

  // 10. Conversion en WAV (16-bit)
  const wavArrayBuffer = audioBufferToWav(renderedBuffer);
  return new Blob([wavArrayBuffer], { type: 'audio/wav' });
}

/**
 * Utilitaire : télécharge un Blob en tant que fichier
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}