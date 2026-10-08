/**
 * Reconnaissance d'accords à partir d'un ensemble de notes MIDI.
 * Utilise des templates d'intervalles (fondamentale + tierce + quinte).
 */

export interface ChordInfo {
  name: string;         // Ex: "Am", "C", "G7"
  root: number;         // Pitch-class de la fondamentale (0-11)
  quality: string;      // "maj", "min", "dim", "aug", "sus", "7"...
  notes: number[];      // Notes MIDI de l'accord
  confidence: number;   // 0-1
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Templates d'accords (intervalles depuis la fondamentale)
const CHORD_TEMPLATES: { name: string; quality: string; intervals: number[] }[] = [
  // Triades
  { name: '', quality: 'maj', intervals: [0, 4, 7] },
  { name: 'm', quality: 'min', intervals: [0, 3, 7] },
  { name: 'dim', quality: 'dim', intervals: [0, 3, 6] },
  { name: 'aug', quality: 'aug', intervals: [0, 4, 8] },
  { name: 'sus2', quality: 'sus2', intervals: [0, 2, 7] },
  { name: 'sus4', quality: 'sus4', intervals: [0, 5, 7] },

  // Septièmes
  { name: 'maj7', quality: 'maj7', intervals: [0, 4, 7, 11] },
  { name: 'm7', quality: 'min7', intervals: [0, 3, 7, 10] },
  { name: '7', quality: 'dom7', intervals: [0, 4, 7, 10] },
  { name: 'm7b5', quality: 'min7b5', intervals: [0, 3, 6, 10] },
  { name: 'dim7', quality: 'dim7', intervals: [0, 3, 6, 9] },

  // Additions
  { name: '6', quality: 'maj6', intervals: [0, 4, 7, 9] },
  { name: 'm6', quality: 'min6', intervals: [0, 3, 7, 9] },
  { name: 'add9', quality: 'add9', intervals: [0, 4, 7, 14] },
];

/**
 * Reconnaît un accord à partir d'une liste de notes MIDI.
 */
export function recognizeChord(midiNotes: number[]): ChordInfo | null {
  if (midiNotes.length < 2) return null;

  // Réduit à un ensemble de pitch-classes uniques
  const pitchClasses = Array.from(new Set(midiNotes.map((n) => n % 12)));

  if (pitchClasses.length < 2) return null;

  let bestChord: ChordInfo | null = null;
  let bestScore = 0;

  // Teste chaque fondamentale + chaque template
  for (let root = 0; root < 12; root++) {
    for (const template of CHORD_TEMPLATES) {
      const expectedPCs = template.intervals.map((i) => (root + i) % 12);

      // Compte les notes matchées
      let matched = 0;
      for (const pc of pitchClasses) {
        if (expectedPCs.includes(pc)) matched++;
      }

      // Pénalise les notes hors accord
      const extra = pitchClasses.length - matched;

      // Score : proportion de notes attendues trouvées - notes en trop
      const completeness = matched / expectedPCs.length;
      const purity = matched / pitchClasses.length;
      const score = (completeness * 0.6 + purity * 0.4) - extra * 0.15;

      if (score > bestScore && completeness >= 0.6) {
        bestScore = score;
        bestChord = {
          name: `${NOTES[root]}${template.name}`,
          root,
          quality: template.quality,
          notes: midiNotes,
          confidence: Math.min(1, score),
        };
      }
    }
  }

  return bestChord;
}

/**
 * Groupe les notes en fenêtres temporelles et détecte les accords.
 */
export interface ChordSegment {
  chord: ChordInfo;
  start: number;
  end: number;
  duration: number;
}

export function detectChordsFromNotes(
  notes: { midi: number; start: number; duration: number }[],
  windowSec: number = 0.5
): ChordSegment[] {
  if (notes.length === 0) return [];

  // Trouve la plage temporelle
  const minTime = Math.min(...notes.map((n) => n.start));
  const maxTime = Math.max(...notes.map((n) => n.start + n.duration));

  const segments: ChordSegment[] = [];
  let currentChord: ChordSegment | null = null;

  for (let t = minTime; t < maxTime; t += windowSec) {
    const windowEnd = t + windowSec;

    // Notes actives dans cette fenêtre
    const activeNotes = notes.filter(
      (n) => n.start < windowEnd && n.start + n.duration > t
    );

    if (activeNotes.length < 2) continue;

    const chord = recognizeChord(activeNotes.map((n) => n.midi));
    if (!chord) continue;

    // Fusionne avec l'accord précédent si c'est le même
    if (currentChord && currentChord.chord.name === chord.name) {
      currentChord.end = windowEnd;
      currentChord.duration = currentChord.end - currentChord.start;
    } else {
      if (currentChord && currentChord.duration >= 0.3) {
        segments.push(currentChord);
      }
      currentChord = {
        chord,
        start: t,
        end: windowEnd,
        duration: windowSec,
      };
    }
  }

  if (currentChord && currentChord.duration >= 0.3) {
    segments.push(currentChord);
  }

  return segments;
}

/**
 * Génère un résumé : quels accords et combien de fois.
 */
export function summarizeChords(segments: ChordSegment[]): {
  name: string;
  count: number;
}[] {
  const counts: Record<string, number> = {};
  for (const seg of segments) {
    counts[seg.chord.name] = (counts[seg.chord.name] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}