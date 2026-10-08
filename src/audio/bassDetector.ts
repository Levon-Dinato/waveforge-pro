import type { DetectedNote } from '../types';

const MIN_MIDI = 24;  // C1
const MAX_MIDI = 60;  // C4

interface BasicPitchNote {
  pitchMidi: number;
  startTimeSeconds: number;
  durationSeconds: number;
  amplitude: number;
  pitchBends?: number[];
}

let basicPitchInstance: any = null;

async function getBasicPitch() {
  if (basicPitchInstance) return basicPitchInstance;

  console.log('🎸 Chargement de Basic Pitch (basse)...');

  const bp = await import('@spotify/basic-pitch');

  basicPitchInstance = {
    BasicPitch: bp.BasicPitch,
    noteFramesToTime: bp.noteFramesToTime,
    addPitchBendsToNoteEvents: bp.addPitchBendsToNoteEvents,
    outputToNotesPoly: bp.outputToNotesPoly,
    model: new bp.BasicPitch('/model/model.json'),
  };

  console.log('✅ Basic Pitch (basse) chargé');
  return basicPitchInstance;
}

/**
 * Détecte la ligne de basse avec Basic Pitch (modèle ML de Spotify).
 * Seuils stricts pour ne garder que les vraies notes.
 */
export async function transcribeBass(audioBuffer: AudioBuffer): Promise<DetectedNote[]> {
  const sr = audioBuffer.sampleRate;
  console.log(`🎸 Analyse basse Basic Pitch : ${audioBuffer.duration.toFixed(2)}s`);

  const bp = await getBasicPitch();

  // Filtre passe-bas pour isoler la zone basse (0-500 Hz)
  const rawData = mixToMono(audioBuffer);
  const data = lowPassFilter(rawData, sr, 500);

  // Inférence
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

  console.log(`🎸 Inférence terminée : ${frames.length} frames`);

  // Conversion en notes avec seuils TRÈS STRICTS
  const rawNotes = bp.outputToNotesPoly(
    frames,
    onsets,
    0.8,    // onsetThresh : 0.7 → 0.8
    0.7,    // frameThresh : 0.6 → 0.7
    0.2,    // minNoteLen : 0.15 → 0.2 (notes ≥ 200ms)
    true
  );

  const withBends = bp.addPitchBendsToNoteEvents(contours, rawNotes);
  const timedNotes: BasicPitchNote[] = bp.noteFramesToTime(withBends);

  console.log(`🎸 Basic Pitch : ${timedNotes.length} notes brutes`);

  // Filtre plage basse (C1 à C4)
  const bassNotes = timedNotes.filter(
    (n) => n.pitchMidi >= MIN_MIDI && n.pitchMidi <= MAX_MIDI
  );

  console.log(`🎸 ${bassNotes.length} notes dans la plage basse (24-60)`);

  // Conversion en DetectedNote
  const detected: DetectedNote[] = bassNotes.map((n) => ({
    midi: Math.round(n.pitchMidi),
    start: n.startTimeSeconds,
    duration: Math.max(0.05, n.durationSeconds),
    velocity: Math.min(127, Math.max(30, Math.round(n.amplitude * 127))),
    confidence: Math.min(1, n.amplitude * 1.5),
    track: 'bass' as any,
  }));

  console.log(`🎸 RÉSULTAT BASSE : ${detected.length} notes`);

  return detected;
}

/**
 * Filtre passe-bas simple (one-pole).
 */
function lowPassFilter(data: Float32Array, sr: number, cutoff: number): Float32Array {
  const out = new Float32Array(data.length);
  const rc = 1.0 / (2 * Math.PI * cutoff);
  const dt = 1.0 / sr;
  const alpha = dt / (rc + dt);

  let prev = 0;
  for (let i = 0; i < data.length; i++) {
    prev = prev + alpha * (data[i] - prev);
    out[i] = prev;
  }
  return out;
}

/**
 * Mixe en mono.
 */
function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const L = buffer.getChannelData(0);
  const R = buffer.getChannelData(1);
  const out = new Float32Array(L.length);
  for (let i = 0; i < L.length; i++) out[i] = (L[i] + R[i]) * 0.5;
  return out;
}