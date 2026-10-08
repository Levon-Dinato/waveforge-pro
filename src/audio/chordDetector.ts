import type { DetectedNote } from '../types';

// Plage médium : C3 (48) à C6 (84)
const MIN_MIDI = 48;
const MAX_MIDI = 84;

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

  console.log('🎹 Chargement de Basic Pitch (accords)...');

  const bp = await import('@spotify/basic-pitch');

  basicPitchInstance = {
    BasicPitch: bp.BasicPitch,
    noteFramesToTime: bp.noteFramesToTime,
    addPitchBendsToNoteEvents: bp.addPitchBendsToNoteEvents,
    outputToNotesPoly: bp.outputToNotesPoly,
    model: new bp.BasicPitch('/model/model.json'),
  };

  console.log('✅ Basic Pitch (accords) chargé');
  return basicPitchInstance;
}

/**
 * Détecte les accords avec Basic Pitch (modèle ML de Spotify).
 * Seuils permissifs car les accords sont souvent noyés dans le mix.
 */
export async function transcribeChords(audioBuffer: AudioBuffer): Promise<DetectedNote[]> {
  const sr = audioBuffer.sampleRate;
  console.log(`🎹 Analyse accords Basic Pitch : ${audioBuffer.duration.toFixed(2)}s`);

  const bp = await getBasicPitch();

  // Filtre passe-bande (200 Hz - 4000 Hz) pour isoler la zone accords
  const rawData = mixToMono(audioBuffer);
  const filtered = bandPassFilter(rawData, sr, 200, 4000);

  // Inférence
  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];

  await bp.model.evaluateModel(
    filtered,
    (f: number[][], o: number[][], c: number[][]) => {
      frames.push(...f);
      onsets.push(...o);
      contours.push(...c);
    },
    () => {}
  );

  console.log(`🎹 Inférence terminée : ${frames.length} frames`);

  // Conversion avec seuils PERMISSIFS (0.5 / 0.4 / 0.1)
  const rawNotes = bp.outputToNotesPoly(
    frames,
    onsets,
    0.5,    // onsetThresh : 0.7 → 0.5
    0.4,    // frameThresh : 0.6 → 0.4
    0.1,    // minNoteLen : 0.15 → 0.1
    true
  );

  const withBends = bp.addPitchBendsToNoteEvents(contours, rawNotes);
  const timedNotes: BasicPitchNote[] = bp.noteFramesToTime(withBends);

  console.log(`🎹 Basic Pitch : ${timedNotes.length} notes brutes`);

  // Filtre plage médium (accords)
  const chordNotes = timedNotes.filter(
    (n) => n.pitchMidi >= MIN_MIDI && n.pitchMidi <= MAX_MIDI
  );

  console.log(`🎹 ${chordNotes.length} notes dans la plage accords (48-84)`);

  // Conversion en DetectedNote
  const detected: DetectedNote[] = chordNotes.map((n) => ({
    midi: Math.round(n.pitchMidi),
    start: n.startTimeSeconds,
    duration: Math.max(0.1, n.durationSeconds),
    velocity: Math.min(127, Math.max(30, Math.round(n.amplitude * 127))),
    confidence: Math.min(1, n.amplitude * 1.5),
    track: 'harmony' as any,
  }));

  console.log(`🎹 RÉSULTAT ACCORDS : ${detected.length} notes`);

  return detected;
}

/**
 * Filtre passe-bas.
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
 * Filtre passe-haut.
 */
function highPassFilter(data: Float32Array, sr: number, cutoff: number): Float32Array {
  const out = new Float32Array(data.length);
  const rc = 1.0 / (2 * Math.PI * cutoff);
  const dt = 1.0 / sr;
  const alpha = rc / (rc + dt);

  let prevIn = data[0];
  let prevOut = 0;
  for (let i = 0; i < data.length; i++) {
    prevOut = alpha * (prevOut + data[i] - prevIn);
    prevIn = data[i];
    out[i] = prevOut;
  }
  return out;
}

/**
 * Filtre passe-bande (HP + LP).
 */
function bandPassFilter(data: Float32Array, sr: number, lowCut: number, highCut: number): Float32Array {
  const hp = highPassFilter(data, sr, lowCut);
  return lowPassFilter(hp, sr, highCut);
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