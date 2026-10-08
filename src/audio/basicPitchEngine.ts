import type { DetectedNote } from '../types';
import { detectPitchYIN, freqToMidi } from './yinDetector';
import { yieldToBrowser } from './asyncHelpers';

/**
 * Analyse mono (fallback si Basic Pitch indisponible).
 * ⚠️ LIMITÉE à 30 sec par défaut pour éviter les longs calculs.
 */
export async function analyzeMonophonic(
  audioBuffer: AudioBuffer,
  maxDuration: number = 30
): Promise<DetectedNote[]> {
  const sr = audioBuffer.sampleRate;

  // ⚡ Limite la durée analysée
  const maxSamples = Math.min(
    audioBuffer.length,
    Math.floor(maxDuration * sr)
  );

  const data = audioBuffer.getChannelData(0).slice(0, maxSamples);
  const FRAME = 2048;
  const HOP = 2048; // ⚡ HOP plus grand = moins de frames = plus rapide
  const MIN_DURATION = 0.08;

  console.log(
    `🎼 Analyse YIN sur ${maxDuration}s (${data.length} samples, hop=${HOP})`
  );

  const notes: DetectedNote[] = [];
  let current: DetectedNote | null = null;
  let frameCount = 0;

  for (let i = 0; i + FRAME < data.length; i += HOP) {
    // ⚡ Yield tous les 10 frames seulement
    if (frameCount % 10 === 0) {
      await yieldToBrowser();
    }
    frameCount++;

    const frame = data.slice(i, i + FRAME);
    const { freq, confidence } = detectPitchYIN(frame, sr);
    const time = i / sr;

    if (freq > 0 && confidence > 0.5) {
      const midi = freqToMidi(freq);
      if (midi < 24 || midi > 108) continue;

      if (current && current.midi === midi) {
        current.duration = time - current.start + HOP / sr;
        current.confidence = Math.max(current.confidence, confidence);
      } else {
        if (current && current.duration >= MIN_DURATION) {
          notes.push(current);
        }
        current = {
          midi,
          start: time,
          duration: HOP / sr,
          velocity: Math.round(confidence * 127),
          confidence,
        };
      }
    }
  }

  if (current && current.duration >= MIN_DURATION) notes.push(current);

  console.log(`🎼 ${notes.length} notes YIN en ${frameCount} frames`);
  return notes;
}

export async function analyzePolyphonic(
  audioBuffer: AudioBuffer,
  _sensitivity = 0.5
): Promise<DetectedNote[]> {
  return analyzeMonophonic(audioBuffer);
}