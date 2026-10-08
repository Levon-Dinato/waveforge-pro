import type { DetectedNote } from '../types';
import { detectPitchYIN, freqToMidi } from './yinDetector';
import { yieldToBrowser } from './asyncHelpers';

/**
 * Analyse mono (fallback si Basic Pitch indisponible).
 * Utilise YIN sur des fenêtres glissantes.
 * Version ASYNC pour éviter les freezes.
 */
export async function analyzeMonophonic(
  audioBuffer: AudioBuffer
): Promise<DetectedNote[]> {
  const sr = audioBuffer.sampleRate;
  const data = audioBuffer.getChannelData(0);
  const FRAME = 2048;
  const HOP = 512;
  const MIN_DURATION = 0.05;

  const notes: DetectedNote[] = [];
  let current: DetectedNote | null = null;

  for (let i = 0; i + FRAME < data.length; i += HOP) {
    // Yield tous les 20 frames pour éviter le freeze
    if ((i / HOP) % 20 === 0) {
      await yieldToBrowser();
    }

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
  return notes;
}

/**
 * Analyse polyphonique — utilise Basic Pitch (via dynamic import).
 */
export async function analyzePolyphonic(
  audioBuffer: AudioBuffer,
  _sensitivity = 0.5
): Promise<DetectedNote[]> {
  // Fallback mono pour l'instant
  return analyzeMonophonic(audioBuffer);
}