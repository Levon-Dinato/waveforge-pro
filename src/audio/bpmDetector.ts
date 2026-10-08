import { yieldToBrowser } from './asyncHelpers';

export interface BPMResult {
  bpm: number;           // Tempo détecté
  confidence: number;    // 0-1
  candidates: number[];  // Tempos alternatifs
}

/**
 * Détecte le BPM d'un morceau à partir des onsets rythmiques.
 */
export async function detectBPM(audioBuffer: AudioBuffer): Promise<BPMResult> {
  const sr = audioBuffer.sampleRate;
  const data = mixToMono(audioBuffer);

  console.log(`🥁 Détection BPM sur ${audioBuffer.duration.toFixed(2)}s`);

  // 1. Détection des onsets (pics d'énergie)
  const onsets = await detectOnsets(data, sr);
  console.log(`🥁 ${onsets.length} onsets détectés`);

  if (onsets.length < 4) {
    return { bpm: 120, confidence: 0, candidates: [120] };
  }

  // 2. Intervalles entre onsets
  const intervals: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    const dt = onsets[i] - onsets[i - 1];
    if (dt > 0.2 && dt < 2.0) {
      intervals.push(dt);
    }
  }

  if (intervals.length < 4) {
    return { bpm: 120, confidence: 0, candidates: [120] };
  }

  // 3. Histogramme des BPM (arrondi à l'entier)
  const bpmHistogram: Record<number, number> = {};

  for (const dt of intervals) {
    const bpm = Math.round(60 / dt);
    if (bpm < 60 || bpm > 200) continue;

    // Teste le BPM et ses harmoniques (double / moitié)
    const candidates = [bpm, bpm * 2, bpm / 2].filter(
      (b) => b >= 60 && b <= 200
    );

    for (const b of candidates) {
      const key = Math.round(b);
      bpmHistogram[key] = (bpmHistogram[key] ?? 0) + 1;
    }
  }

  // 4. Trouve le BPM avec le plus d'occurrences
  let bestBPM = 120;
  let bestCount = 0;

  for (const [bpm, count] of Object.entries(bpmHistogram)) {
    if (count > bestCount) {
      bestCount = count;
      bestBPM = parseInt(bpm);
    }
  }

  // 5. Groupement par proximité (regroupe les BPM à ±2)
  const grouped: Record<number, number> = {};
  for (const [bpm, count] of Object.entries(bpmHistogram)) {
    const b = parseInt(bpm);
    let merged = false;
    for (const target of Object.keys(grouped).map(Number)) {
      if (Math.abs(b - target) <= 2) {
        grouped[target] += count;
        merged = true;
        break;
      }
    }
    if (!merged) grouped[b] = count;
  }

  // 6. Top 3 des candidats
  const sortedCandidates = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([bpm]) => parseInt(bpm));

  bestBPM = sortedCandidates[0] ?? 120;

  // 7. Normalise dans la plage 70-180 (comme les vrais BPM de musique)
  while (bestBPM < 70) bestBPM *= 2;
  while (bestBPM > 180) bestBPM /= 2;
  bestBPM = Math.round(bestBPM);

  // 8. Score de confiance
  const totalOnsets = intervals.length;
  const confidence = Math.min(1, bestCount / totalOnsets);

  console.log(
    `🥁 BPM détecté : ${bestBPM} (confiance ${(confidence * 100).toFixed(0)}%)`,
    `· Candidats : ${sortedCandidates.join(', ')}`
  );

  return {
    bpm: bestBPM,
    confidence,
    candidates: sortedCandidates,
  };
}

/**
 * Détecte les onsets par pics d'énergie.
 */
async function detectOnsets(data: Float32Array, sr: number): Promise<number[]> {
  const FRAME = 1024;
  const HOP = 512;
  const onsets: number[] = [];

  // Fenêtre d'énergie
  const energies: number[] = [];
  const times: number[] = [];

  for (let i = 0; i + FRAME < data.length; i += HOP) {
    let sum = 0;
    for (let j = 0; j < FRAME; j++) {
      sum += data[i + j] * data[i + j];
    }
    energies.push(sum / FRAME);
    times.push(i / sr);

    if ((i / HOP) % 200 === 0) {
      await yieldToBrowser();
    }
  }

  if (energies.length < 4) return [];

  // Seuil adaptatif
  const sorted = [...energies].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const threshold = median * 2.5;

  // Détection de pics locaux
  let lastOnset = -1;

  for (let i = 2; i < energies.length - 2; i++) {
    const curr = energies[i];
    const prev = energies[i - 2];
    const next = energies[i + 2];

    if (
      curr > threshold &&
      curr > prev * 1.3 &&
      curr > next * 1.2 &&
      times[i] - lastOnset > 0.15
    ) {
      onsets.push(times[i]);
      lastOnset = times[i];
    }
  }

  return onsets;
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const L = buffer.getChannelData(0);
  const R = buffer.getChannelData(1);
  const out = new Float32Array(L.length);
  for (let i = 0; i < L.length; i++) out[i] = (L[i] + R[i]) * 0.5;
  return out;
}