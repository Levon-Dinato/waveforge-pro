import type { DetectedNote } from '../types';
import { yieldToBrowser } from './asyncHelpers';
import { getSharedBasicPitch } from './basicPitchCache';
import { detectChordsFromNotes } from './chordRecognition';
import type { ChordSegment } from './chordRecognition';

const MIN_MIDI = 48;
const MAX_MIDI = 84;

interface BasicPitchNote {
  pitchMidi: number;
  startTimeSeconds: number;
  durationSeconds: number;
  amplitude: number;
  pitchBends?: number[];
}

/**
 * Détecte les accords/harmonies avec Basic Pitch + reconnaissance.
 */
export async function transcribeChords(
  audioBuffer: AudioBuffer
): Promise<DetectedNote[]> {
  console.log(`🎹 Analyse accords : ${audioBuffer.duration.toFixed(2)}s`);

  const bp = await getSharedBasicPitch();

  const rawData = mixToMono(audioBuffer);
  const filtered = bandPassFilter(rawData, audioBuffer.sampleRate, 200, 4000);

  await yieldToBrowser();

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
  await yieldToBrowser();

  const rawNotes = bp.outputToNotesPoly(frames, onsets, 0.5, 0.4, 0.1, true);
  const withBends = bp.addPitchBendsToNoteEvents(contours, rawNotes);
  const timedNotes: BasicPitchNote[] = bp.noteFramesToTime(withBends);

  const chordNotes = timedNotes.filter(
    (n) => n.pitchMidi >= MIN_MIDI && n.pitchMidi <= MAX_MIDI
  );

  // 🎼 RECONNAISSANCE D'ACCORDS
  const noteData = chordNotes.map((n) => ({
    midi: Math.round(n.pitchMidi),
    start: n.startTimeSeconds,
    duration: n.durationSeconds,
  }));

  const chordSegments: ChordSegment[] = detectChordsFromNotes(noteData, 0.5);

  console.log(`🎼 ${chordSegments.length} accords détectés`);

  // Résumé pour log
  const summary = summarizeSegments(chordSegments);
  if (summary.length > 0) {
    console.log(
      `🎼 Accords principaux :`,
      summary.slice(0, 8).map((s) => `${s.name}(${s.count})`).join(' · ')
    );
  }

  // Conversion en DetectedNote (avec track harmony)
  const detected: DetectedNote[] = chordNotes.map((n) => ({
    midi: Math.round(n.pitchMidi),
    start: n.startTimeSeconds,
    duration: Math.max(0.1, n.durationSeconds),
    velocity: Math.min(127, Math.max(30, Math.round(n.amplitude * 127))),
    confidence: Math.min(1, n.amplitude * 1.5),
    track: 'harmony' as any,
  }));

  console.log(`🎹 RÉSULTAT : ${detected.length} notes`);
  return detected;
}

function summarizeSegments(segments: ChordSegment[]): { name: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const seg of segments) {
    counts[seg.chord.name] = (counts[seg.chord.name] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

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

function bandPassFilter(data: Float32Array, sr: number, lowCut: number, highCut: number): Float32Array {
  const hp = highPassFilter(data, sr, lowCut);
  return lowPassFilter(hp, sr, highCut);
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const L = buffer.getChannelData(0);
  const R = buffer.getChannelData(1);
  const out = new Float32Array(L.length);
  for (let i = 0; i < L.length; i++) out[i] = (L[i] + R[i]) * 0.5;
  return out;
}