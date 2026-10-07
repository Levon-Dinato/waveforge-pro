import type { DetectedNote } from '../types';
import { detectPitchYIN, freqToMidi } from './yinDetector';

/**
 * Détecte la ligne de basse dans un buffer audio.
 * Utilise YIN (monophonique) sur les basses fréquences.
 */
export function transcribeBass(audioBuffer: AudioBuffer): DetectedNote[] {
  const sr = audioBuffer.sampleRate;
  const data = audioBuffer.getChannelData(0);
  const FRAME = 4096; // plus grand pour capter les basses fréquences
  const HOP = 1024;
  const MIN_MIDI = 24; // C1
  const MAX_MIDI = 55; // G3 (basses + low-mid)
  const MIN_CONFIDENCE = 0.6;

  const notes: DetectedNote[] = [];
  let current: DetectedNote | null = null;

  for (let i = 0; i + FRAME < data.length; i += HOP) {
    const frame = data.slice(i, i + FRAME);
    const { freq, confidence } = detectPitchYIN(frame, sr);

    if (freq > 0 && confidence >= MIN_CONFIDENCE) {
      const midi = freqToMidi(freq);

      // Garde uniquement les basses fréquences
      if (midi < MIN_MIDI || midi > MAX_MIDI) continue;

      const time = i / sr;

      if (current && Math.abs(current.midi - midi) <= 1) {
        current.duration = time - current.start + HOP / sr;
        current.confidence = Math.max(current.confidence, confidence);
      } else {
        if (current && current.duration >= 0.08) {
          notes.push(current);
        }
        current = {
          midi,
          start: time,
          duration: HOP / sr,
          velocity: Math.round(confidence * 100 + 20),
          confidence,
          track: 'bass' as any,
        };
      }
    }
  }

  if (current && current.duration >= 0.08) notes.push(current);
  return notes;
}