/**
 * Détection de tonalité (Key).
 * - Détection auto via Meyda (fallback)
 * - Sélecteur manuel via ALL_KEYS
 * - Lecture des tags ID3 (Serato / Mixed In Key) faite côté NouveautesPage
 */

export interface KeyResult {
  key: string;
  camelot: string;
  confidence: number;
  isMinor: boolean;
}

const CAMELOT_MAP: Record<string, string> = {
  'C': '8B', 'Cm': '5A',
  'C#': '3B', 'C#m': '12A', 'Db': '3B', 'Dbm': '12A',
  'D': '10B', 'Dm': '7A',
  'D#': '5B', 'D#m': '2A', 'Eb': '5B', 'Ebm': '2A',
  'E': '12B', 'Em': '9A',
  'F': '7B', 'Fm': '4A',
  'F#': '2B', 'F#m': '11A', 'Gb': '2B', 'Gbm': '11A',
  'G': '9B', 'Gm': '6A',
  'G#': '4B', 'G#m': '1A', 'Ab': '4B', 'Abm': '1A',
  'A': '11B', 'Am': '8A',
  'A#': '6B', 'A#m': '3A', 'Bb': '6B', 'Bbm': '3A',
  'B': '1B', 'Bm': '10A',
};

// ✅ Liste des 24 tonalités pour le sélecteur manuel
export const ALL_KEYS: { key: string; camelot: string; isMinor: boolean }[] = [
  // Majeurs
  { key: 'C',  camelot: '8B',  isMinor: false },
  { key: 'C#', camelot: '3B',  isMinor: false },
  { key: 'D',  camelot: '10B', isMinor: false },
  { key: 'D#', camelot: '5B',  isMinor: false },
  { key: 'E',  camelot: '12B', isMinor: false },
  { key: 'F',  camelot: '7B',  isMinor: false },
  { key: 'F#', camelot: '2B',  isMinor: false },
  { key: 'G',  camelot: '9B',  isMinor: false },
  { key: 'G#', camelot: '4B',  isMinor: false },
  { key: 'A',  camelot: '11B', isMinor: false },
  { key: 'A#', camelot: '6B',  isMinor: false },
  { key: 'B',  camelot: '1B',  isMinor: false },
  // Mineurs
  { key: 'Cm',  camelot: '5A',  isMinor: true },
  { key: 'C#m', camelot: '12A', isMinor: true },
  { key: 'Dm',  camelot: '7A',  isMinor: true },
  { key: 'D#m', camelot: '2A',  isMinor: true },
  { key: 'Em',  camelot: '9A',  isMinor: true },
  { key: 'Fm',  camelot: '4A',  isMinor: true },
  { key: 'F#m', camelot: '11A', isMinor: true },
  { key: 'Gm',  camelot: '6A',  isMinor: true },
  { key: 'G#m', camelot: '1A',  isMinor: true },
  { key: 'Am',  camelot: '8A',  isMinor: true },
  { key: 'A#m', camelot: '3A',  isMinor: true },
  { key: 'Bm',  camelot: '10A', isMinor: true },
];

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/**
 * Détection de tonalité via Meyda (fallback si pas de tag ID3).
 */
export async function detectKey(audioBuffer: AudioBuffer): Promise<KeyResult> {
  const sr = audioBuffer.sampleRate;
  const data = mixToMono(audioBuffer);
  const maxSamples = Math.min(data.length, 90 * sr);
  const segment = data.slice(0, maxSamples);

  console.log(`🎼 Analyse Key (Meyda) sur ${(segment.length / sr).toFixed(1)}s`);

  return detectKeyWithMeyda(segment, sr);
}

async function detectKeyWithMeyda(
  segment: Float32Array,
  sr: number
): Promise<KeyResult> {
  try {
    const module = await import('meyda' as any);
    const Meyda = module.default || module;

    const BUFFER_SIZE = 4096;
    const HOP_SIZE = 2048;

    Meyda.bufferSize = BUFFER_SIZE;
    Meyda.sampleRate = sr;
    Meyda.windowingFunction = 'hanning';

    const chromaSum = new Array<number>(12).fill(0);
    let totalWeight = 0;
    let validFrames = 0;

    for (
      let offset = 0;
      offset + BUFFER_SIZE <= segment.length;
      offset += HOP_SIZE
    ) {
      const frame = segment.slice(offset, offset + BUFFER_SIZE);

      try {
        const rms = Meyda.extract('rms', frame);
        const chromaResult = Meyda.extract('chroma', frame);

        if (
          typeof rms !== 'number' ||
          !Number.isFinite(rms) ||
          !chromaResult ||
          typeof chromaResult.length !== 'number' ||
          chromaResult.length < 12
        ) {
          continue;
        }

        if (rms < 0.005) continue;

        const chroma = Array.from(chromaResult).slice(0, 12).map(Number);
        if (!chroma.every(Number.isFinite)) continue;

        const normalized = chroma.map((v) => Math.max(0, v));
        const chromaTotal = normalized.reduce((s, v) => s + v, 0);
        if (chromaTotal <= 1e-12) continue;

        const weight = Math.min(rms, 0.2);

        for (let i = 0; i < 12; i++) {
          chromaSum[i] += (normalized[i] / chromaTotal) * weight;
        }

        totalWeight += weight;
        validFrames++;
      } catch {
        // ignore frame défectueuse
      }

      if (validFrames > 0 && validFrames % 100 === 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    if (totalWeight <= 0 || validFrames === 0) {
      console.warn('🎼 Aucune frame Meyda exploitable');
      return unknownKey();
    }

    const chroma = chromaSum.map((v) => v / totalWeight);

    const candidates: Array<{ key: string; isMinor: boolean; score: number }> = [];

    for (let root = 0; root < 12; root++) {
      const majorProfile = MAJOR_PROFILE.map(
        (_, i) => MAJOR_PROFILE[(i - root + 12) % 12]
      );
      const minorProfile = MINOR_PROFILE.map(
        (_, i) => MINOR_PROFILE[(i - root + 12) % 12]
      );

      candidates.push({
        key: NOTES[root],
        isMinor: false,
        score: cosine(chroma, majorProfile),
      });

      candidates.push({
        key: `${NOTES[root]}m`,
        isMinor: true,
        score: cosine(chroma, minorProfile),
      });
    }

    candidates.sort((a, b) => b.score - a.score);

    const best = candidates[0];
    const second = candidates[1];
    const camelot = CAMELOT_MAP[best.key] || '?';
    const confidence = clamp((best.score - second.score) * 5, 0, 1);

    console.log(
      '🎼 Meyda → ' + best.key + ' (' + camelot + ')',
      'score=' + best.score.toFixed(4),
      'frames=' + validFrames
    );

    return {
      key: best.key,
      camelot,
      confidence,
      isMinor: best.isMinor,
    };
  } catch (err) {
    console.error('🎼 Meyda échoue :', err);
    return unknownKey();
  }
}

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA <= 0 || normB <= 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return new Float32Array(buffer.getChannelData(0));
  }

  const length = buffer.length;
  const channels = buffer.numberOfChannels;
  const output = new Float32Array(length);

  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      output[i] += data[i] / channels;
    }
  }

  return output;
}

function unknownKey(): KeyResult {
  return {
    key: 'Inconnu',
    camelot: '?',
    confidence: 0,
    isMinor: false,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getCamelotColor(camelot: string): string {
  const colors: Record<string, string> = {
    '1A': '#ff5c5c', '1B': '#ff5c5c',
    '2A': '#ff8c00', '2B': '#ff8c00',
    '3A': '#ffd43b', '3B': '#ffd43b',
    '4A': '#a0ff5c', '4B': '#a0ff5c',
    '5A': '#5cff8c', '5B': '#5cff8c',
    '6A': '#5cffe5', '6B': '#5cffe5',
    '7A': '#5c8cff', '7B': '#5c8cff',
    '8A': '#7c5cff', '8B': '#7c5cff',
    '9A': '#d45cff', '9B': '#d45cff',
    '10A': '#ff5ce5', '10B': '#ff5ce5',
    '11A': '#ff5c8c', '11B': '#ff5c8c',
    '12A': '#c45c5c', '12B': '#c45c5c',
  };
  return colors[camelot] || '#666';
}