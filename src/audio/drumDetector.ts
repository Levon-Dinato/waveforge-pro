import type { DetectedNote } from '../types';

// Notes MIDI General MIDI (canal 10 = percussion)
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

let basicPitchInstance: any = null;

/**
 * Charge Basic Pitch (lazy loading).
 */
async function getBasicPitch() {
  if (basicPitchInstance) return basicPitchInstance;

  console.log('🥁 Chargement de Basic Pitch...');

  const bp = await import('@spotify/basic-pitch');

  basicPitchInstance = {
    BasicPitch: bp.BasicPitch,
    noteFramesToTime: bp.noteFramesToTime,
    addPitchBendsToNoteEvents: bp.addPitchBendsToNoteEvents,
    outputToNotesPoly: bp.outputToNotesPoly,
    model: new bp.BasicPitch('/model/model.json'),
  };

  console.log('✅ Basic Pitch chargé');
  return basicPitchInstance;
}

/**
 * Détecte la batterie en utilisant Basic Pitch (modèle ML de Spotify).
 * Seuils ajustés pour éviter les faux positifs.
 */
export async function transcribeDrums(audioBuffer: AudioBuffer): Promise<DetectedNote[]> {
  console.log(`🥁 Analyse batterie Basic Pitch : ${audioBuffer.duration.toFixed(2)}s`);

  const bp = await getBasicPitch();

  // 1. Convertit en mono
  const monoData = mixToMono(audioBuffer);
  console.log(`🥁 ${monoData.length} samples mono`);

  // 2. Inférence
  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];

  await bp.model.evaluateModel(
    monoData,
    (f: number[][], o: number[][], c: number[][]) => {
      frames.push(...f);
      onsets.push(...o);
      contours.push(...c);
    },
    () => {}
  );

  console.log(`🥁 Inférence terminée : ${frames.length} frames`);

  // 3. Conversion en notes avec seuils TRÈS STRICTS
  const rawNotes = bp.outputToNotesPoly(
    frames,
    onsets,
    0.7,    // onsetThresh : 0.5 → 0.7 (rejette les onsets faibles)
    0.6,    // frameThresh : 0.5 → 0.6 (rejette les frames faibles)
    0.15,   // minNoteLen : 0.1 → 0.15 (rejette les notes très courtes)
    true    // inferOnsets
  );

  const withBends = bp.addPitchBendsToNoteEvents(contours, rawNotes);
  const timedNotes: BasicPitchNote[] = bp.noteFramesToTime(withBends);

  console.log(`🥁 Basic Pitch : ${timedNotes.length} notes brutes`);

  // 4. Filtre batterie (notes basses)
  const drumNotes = timedNotes.filter(
    (n) => n.pitchMidi >= 30 && n.pitchMidi <= 50
  );

  console.log(`🥁 ${drumNotes.length} notes dans la plage batterie (30-50)`);

  // 5. Classification par pitch MIDI
  const detected: DetectedNote[] = [];

  for (const n of drumNotes) {
    const pitch = Math.round(n.pitchMidi);
    let midi: number;

    if (pitch <= 37) {
      midi = GM_KICK;
    } else if (pitch <= 40) {
      midi = GM_SNARE;
    } else {
      midi = GM_HIHAT;
    }

    detected.push({
      midi,
      start: n.startTimeSeconds,
      duration: Math.max(0.05, n.durationSeconds),
      velocity: Math.min(127, Math.max(30, Math.round(n.amplitude * 127))),
      confidence: Math.min(1, n.amplitude * 1.5),
      track: 'drums' as any,
    });
  }

  const kicks = detected.filter((n) => n.midi === GM_KICK).length;
  const snares = detected.filter((n) => n.midi === GM_SNARE).length;
  const hihats = detected.filter((n) => n.midi === GM_HIHAT).length;

  console.log(`🥁 RÉSULTAT : ${kicks} kicks, ${snares} snares, ${hihats} hihats (total ${detected.length})`);

  return detected;
}

/**
 * Mixe l'audio en mono.
 */
function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }

  const L = buffer.getChannelData(0);
  const R = buffer.getChannelData(1);
  const out = new Float32Array(L.length);

  for (let i = 0; i < L.length; i++) {
    out[i] = (L[i] + R[i]) * 0.5;
  }

  return out;
}