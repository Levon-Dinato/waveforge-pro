import type { DetectedNote } from '../types';

// Templates d'accords (intervalles en demi-tons depuis la fondamentale)
const CHORD_TEMPLATES: { name: string; intervals: number[] }[] = [
  { name: 'maj', intervals: [0, 4, 7] },
  { name: 'min', intervals: [0, 3, 7] },
  { name: 'dim', intervals: [0, 3, 6] },
  { name: 'aug', intervals: [0, 4, 8] },
  { name: 'sus4', intervals: [0, 5, 7] },
  { name: 'maj7', intervals: [0, 4, 7, 11] },
  { name: 'min7', intervals: [0, 3, 7, 10] },
];

/**
 * Détecte les accords par analyse chroma (histogramme de pitch-class).
 * Retourne une suite d'accords avec leur durée.
 */
export function transcribeChords(audioBuffer: AudioBuffer): DetectedNote[] {
  const sr = audioBuffer.sampleRate;
  const data = audioBuffer.getChannelData(0);
  const WINDOW_SEC = 0.5;
  const HOP_SEC = 0.25;
  const WINDOW_SIZE = Math.floor(WINDOW_SEC * sr);
  const HOP_SIZE = Math.floor(HOP_SEC * sr);

  const notes: DetectedNote[] = [];

  for (let i = 0; i + WINDOW_SIZE < data.length; i += HOP_SIZE) {
    const window = data.slice(i, i + WINDOW_SIZE);
    const chroma = computeChroma(window, sr);
    const chord = matchChord(chroma);

    if (!chord) continue;

    const time = i / sr;

    // Ajoute les 3 notes de l'accord
    for (const interval of chord.intervals) {
      const midi = 60 + interval; // Base C4
      notes.push({
        midi,
        start: time,
        duration: HOP_SEC + 0.1,
        velocity: Math.round(chord.strength * 80 + 40),
        confidence: chord.strength,
        track: 'harmony' as any,
      });
    }
  }

  return notes;
}

/**
 * Calcule un histogramme chroma (12 pitch-classes).
 */
function computeChroma(window: Float32Array, sr: number): Float32Array {
  const chroma = new Float32Array(12);
  const N = Math.min(2048, window.length);

  // Simplifié : détecte les pics fréquentiels et les ramène à une pitch-class
  for (let k = 0; k < N / 2; k++) {
    let real = 0;
    let imag = 0;
    for (let n = 0; n < N; n++) {
      const angle = (-2 * Math.PI * k * n) / N;
      real += window[n] * Math.cos(angle);
      imag += window[n] * Math.sin(angle);
    }
    const mag = Math.sqrt(real * real + imag * imag);
    const freq = (k * sr) / N;

    if (freq < 80 || freq > 2000) continue;

    // Convertit en pitch-class
    const midi = 69 + 12 * Math.log2(freq / 440);
    const pc = Math.round(midi) % 12;
    if (pc >= 0) chroma[pc] += mag;
  }

  // Normalisation
  const total = chroma.reduce((a, b) => a + b, 0) || 1;
  for (let i = 0; i < 12; i++) chroma[i] /= total;

  return chroma;
}

/**
 * Trouve l'accord qui matche le mieux le chroma.
 */
function matchChord(chroma: Float32Array): { name: string; intervals: number[]; strength: number } | null {
  let best: { name: string; intervals: number[]; strength: number } | null = null;

  for (let root = 0; root < 12; root++) {
    for (const template of CHORD_TEMPLATES) {
      let score = 0;
      for (const interval of template.intervals) {
        score += chroma[(root + interval) % 12];
      }

      // Pénalise les pitch-classes fortes qui ne font pas partie de l'accord
      for (let pc = 0; pc < 12; pc++) {
        if (template.intervals.includes((pc - root + 12) % 12)) continue;
        score -= chroma[pc] * 0.5;
      }

      if (!best || score > best.strength) {
        best = { name: `${root}-${template.name}`, intervals: template.intervals.map(i => (root + i) % 12), strength: score };
      }
    }
  }

  if (best && best.strength > 0.3) return best;
  return null;
}