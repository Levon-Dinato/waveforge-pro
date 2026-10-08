import type { DetectedNote } from '../types';

export interface QuantizeOptions {
  grid: 0 | 4 | 8 | 16 | 32;
  swing: number;
  strength: number;
}

/**
 * Quantize les notes sur une grille rythmique.
 */
export function quantizeNotes(
  notes: DetectedNote[],
  bpm: number,
  options: QuantizeOptions
): DetectedNote[] {
  if (options.grid === 0) return notes;

  const beatDur = 60 / bpm;
  const gridDur = beatDur * (4 / options.grid);
  const swingOffset = options.swing * gridDur * 0.33;

  return notes.map((n) => {
    const snappedStart = Math.round(n.start / gridDur) * gridDur;
    const snappedEnd = Math.round((n.start + n.duration) / gridDur) * gridDur;

    const start = n.start + (snappedStart - n.start) * options.strength;
    const end =
      n.start + n.duration + (snappedEnd - (n.start + n.duration)) * options.strength;

    const beatIdx = Math.round(snappedStart / gridDur);
    const swungStart = start + (beatIdx % 2 === 1 ? swingOffset : 0);

    return {
      ...n,
      start: Math.max(0, swungStart),
      duration: Math.max(0.05, end - start),
    };
  });
}

/**
 * Détecte la tonalité (key) d'un ensemble de notes.
 */
export function detectKey(notes: DetectedNote[]): {
  key: string;
  mode: 'major' | 'minor';
  confidence: number;
} {
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  const hist = new Array(12).fill(0);
  for (const n of notes) {
    hist[n.midi % 12] += n.duration;
  }

  const total = hist.reduce((a, b) => a + b, 0) || 1;
  const norm = hist.map((h) => h / total);

  let bestKey = 'C';
  let bestMode: 'major' | 'minor' = 'major';
  let bestScore = -Infinity;

  for (let root = 0; root < 12; root++) {
    // Test MAJOR
    const majorRotated = MAJOR.map((_, i) => MAJOR[(i - root + 12) % 12]);
    const majorScore = correlation(norm, majorRotated);
    if (majorScore > bestScore) {
      bestScore = majorScore;
      bestKey = NOTES[root];
      bestMode = 'major';
    }

    // Test MINOR
    const minorRotated = MINOR.map((_, i) => MINOR[(i - root + 12) % 12]);
    const minorScore = correlation(norm, minorRotated);
    if (minorScore > bestScore) {
      bestScore = minorScore;
      bestKey = NOTES[root];
      bestMode = 'minor';
    }
  }

  return {
    key: bestKey,
    mode: bestMode,
    confidence: Math.max(0, Math.min(1, bestScore)),
  };
}

function correlation(a: number[], b: number[]): number {
  const ma = a.reduce((x, y) => x + y, 0) / a.length;
  const mb = b.reduce((x, y) => x + y, 0) / b.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  return num / Math.sqrt(da * db || 1);
}

/**
 * Snap les notes à la gamme détectée.
 */
export function snapToKey(
  notes: DetectedNote[],
  key: string,
  mode: 'major' | 'minor'
): DetectedNote[] {
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const root = NOTES.indexOf(key);
  if (root === -1) return notes;

  const intervals =
    mode === 'major'
      ? [0, 2, 4, 5, 7, 9, 11]
      : [0, 2, 3, 5, 7, 8, 10];

  const validPitchClasses = new Set(intervals.map((i) => (root + i) % 12));

  return notes.map((n) => {
    if (validPitchClasses.has(n.midi % 12)) return n;

    for (let d = 1; d <= 2; d++) {
      if (validPitchClasses.has((n.midi + d) % 12)) {
        return { ...n, midi: n.midi + d };
      }
      if (validPitchClasses.has((n.midi - d) % 12)) {
        return { ...n, midi: n.midi - d };
      }
    }
    return n;
  });
}