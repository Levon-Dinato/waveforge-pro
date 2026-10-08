import type { DetectedNote } from '../types';
import { yieldToBrowser } from './asyncHelpers';
import { getSharedBasicPitch } from './basicPitchCache';

const GM_KICK = 36;
const GM_SNARE = 38;
const GM_HIHAT = 42;

interface BasicPitchNote {
  pitchMidi: number;
  startTimeSeconds: number;
  durationSeconds: number;
  amplitude: number;
  pitchBends?: number[];
}

/**
 * Détecte la batterie avec Basic Pitch (modèle ML Spotify).
 * Utilise un cache partagé du modèle.
 */
export async function transcribeDrums(
  audioBuffer: AudioBuffer
): Promise<DetectedNote[]> {
  console.log(`🥁 Analyse batterie : ${audioBuffer.duration.toFixed(2)}s`);

  const bp = await getSharedBasicPitch();

  // Mix mono
  const data = mixToMono(audioBuffer);
  console.log(`🥁 ${data.length} samples mono`);

  await yieldToBrowser();

  // Inférence Basic Pitch
  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];

  await bp.model.evaluateModel(
    data,
    (f: number[][], o: number[][], c: number[][]) => {
      frames.push(...f);
      onsets.push(...o);
      contours.push(...c);
    },
    () => {}
  );

  console.log(`🥁 Inférence terminée : ${frames.length} frames`);
  await yieldToBrowser();

  // Conversion en notes avec seuils stricts
  const rawNotes = bp.outputToNotesPoly(frames, onsets, 0.7, 0.6, 0.15, true);
  const withBends = bp.addPitchBendsToNoteEvents(contours, rawNotes);
  const timedNotes: BasicPitchNote[] = bp.noteFramesToTime(withBends);

  console.log(`🥁 Basic Pitch : ${timedNotes.length} notes brutes`);

  // Filtre batterie (plage basse)
  const drumNotes = timedNotes.filter(
    (n) => n.pitchMidi >= 30 && n.pitchMidi <= 50
  );

  const detected: DetectedNote[] = drumNotes.map((n) => {
    const pitch = Math.round(n.pitchMidi);
    let midi: number;

    if (pitch <= 37) midi = GM_KICK;
    else if (pitch <= 40) midi = GM_SNARE;
    else midi = GM_HIHAT;

    return {
      midi,
      start: n.startTimeSeconds,
      duration: Math.max(0.05, n.durationSeconds),
      velocity: Math.min(127, Math.max(30, Math.round(n.amplitude * 127))),
      confidence: Math.min(1, n.amplitude * 1.5),
      track: 'drums' as any,
    };
  });

  const kicks = detected.filter((n) => n.midi === GM_KICK).length;
  const snares = detected.filter((n) => n.midi === GM_SNARE).length;
  const hihats = detected.filter((n) => n.midi === GM_HIHAT).length;

  console.log(
    `🥁 RÉSULTAT : ${kicks} kicks, ${snares} snares, ${hihats} hihats (total ${detected.length})`
  );

  return detected;
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const L = buffer.getChannelData(0);
  const R = buffer.getChannelData(1);
  const out = new Float32Array(L.length);
  for (let i = 0; i < L.length; i++) out[i] = (L[i] + R[i]) * 0.5;
  return out;
}