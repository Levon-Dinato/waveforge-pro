import { yieldToBrowser } from './asyncHelpers';

export interface BPMResult {
  bpm: number;
  confidence: number;
  candidates: number[];
  alternatives: number[];
}

/**
 * Détection BPM avancée avec harmoniques (half/double-time).
 */
export async function detectBPM(audioBuffer: AudioBuffer): Promise<BPMResult> {
  const sr = audioBuffer.sampleRate;
  const data = mixToMono(audioBuffer);

  console.log(`🥁 Analyse BPM sur ${audioBuffer.duration.toFixed(2)}s`);

  // 1. Détection des onsets
  const onsets = await detectOnsets(data, sr);
  console.log(`🥁 ${onsets.length} onsets détectés`);

  if (onsets.length < 6) {
    return { bpm: 120, confidence: 0, candidates: [120], alternatives: [] };
  }

  // 2. Intervalles entre onsets consécutifs
  const _intervals: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    const dt = onsets[i] - onsets[i - 1];
    if (dt > 0.15 && dt < 2.0) _intervals.push(dt);
  }

  if (_intervals.length < 6) {
    return { bpm: 120, confidence: 0, candidates: [120], alternatives: [] };
  }

  // 3. Détection du kick
  const kickOnsets = await detectKickOnsets(data, sr);
  console.log(`🥁 ${kickOnsets.length} kicks détectés`);

  // 4. BPM brut
  const rawBPM = computeBPMFromIntervals(_intervals);
  console.log(`🥁 BPM brut : ${rawBPM}`);

  // 5. Harmoniques
  const harmonics = [
    { factor: 0.5, bpm: Math.round(rawBPM * 0.5) },
    { factor: 1.0, bpm: Math.round(rawBPM) },
    { factor: 2.0, bpm: Math.round(rawBPM * 2) },
    { factor: 3.0, bpm: Math.round(rawBPM * 3) },
  ].filter((h) => h.bpm >= 60 && h.bpm <= 220);

  console.log(
    `🥁 Harmoniques testées : ${harmonics.map((h) => h.bpm).join(', ')}`
  );

  // 6. Scoring
  const scored = harmonics.map((h) => ({
    ...h,
    score: scoreBPM(h.bpm, _intervals, kickOnsets, audioBuffer.duration),
  }));

  scored.sort((a, b) => b.score - a.score);

  // 7. BPM final
  let finalBPM = scored[0].bpm;
  const confidence = Math.min(1, scored[0].score);

  while (finalBPM < 90) finalBPM *= 2;
  while (finalBPM > 180) finalBPM = Math.round(finalBPM / 2);
  finalBPM = Math.round(finalBPM);

  // 8. Alternatives
  const alternatives = scored
    .slice(1, 4)
    .map((s) => {
      let b = s.bpm;
      while (b < 90) b *= 2;
      while (b > 180) b = Math.round(b / 2);
      return Math.round(b);
    });

  console.log(
    `✅ BPM final : ${finalBPM} (confiance ${(confidence * 100).toFixed(0)}%) · Alt : ${alternatives.join(', ')}`
  );

  return {
    bpm: finalBPM,
    confidence,
    candidates: scored.map((s) => s.bpm),
    alternatives,
  };
}

/**
 * Calcule le BPM dominant à partir des intervalles.
 */
function computeBPMFromIntervals(intervals: number[]): number {
  const histogram: Record<number, number> = {};

  for (const dt of intervals) {
    const bpm = Math.round(60 / dt);
    if (bpm < 50 || bpm > 250) continue;

    for (let b = bpm - 2; b <= bpm + 2; b++) {
      histogram[b] = (histogram[b] ?? 0) + 1;
    }
  }

  let bestBPM = 120;
  let bestCount = 0;

  for (const [bpm, count] of Object.entries(histogram)) {
    if (count > bestCount) {
      bestCount = count;
      bestBPM = parseInt(bpm);
    }
  }

  return bestBPM;
}

/**
 * Score un BPM candidat.
 */
function scoreBPM(
  bpm: number,
  _intervals: number[],
  kickOnsets: number[],
  totalDuration: number
): number {
  let score = 0;

  // 1. Préférence pour 100-140 BPM
  if (bpm >= 100 && bpm <= 140) score += 3;
  else if (bpm >= 90 && bpm <= 160) score += 1.5;
  else if (bpm >= 70 && bpm <= 180) score += 0.5;
  else score -= 1;

  // 2. Cohérence avec les kicks
  if (kickOnsets.length >= 4) {
    const kickIntervals: number[] = [];
    for (let i = 1; i < kickOnsets.length; i++) {
      kickIntervals.push(kickOnsets[i] - kickOnsets[i - 1]);
    }

    const beatDur = 60 / bpm;
    let matches = 0;

    for (const ki of kickIntervals) {
      const ratio = ki / beatDur;
      const rounded = Math.round(ratio);
      if (rounded >= 1 && rounded <= 4) {
        const diff = Math.abs(ratio - rounded);
        if (diff < 0.15) matches++;
      }
    }

    if (kickIntervals.length > 0) {
      score += (matches / kickIntervals.length) * 2;
    }
  }

  // 3. Nombre de kicks par minute
  const kicksPerMin = (kickOnsets.length / totalDuration) * 60;
  const expectedKicksPerMin = bpm / 2;
  const kickRatio = kicksPerMin / expectedKicksPerMin;

  if (kickRatio >= 0.7 && kickRatio <= 1.3) score += 1.5;
  else if (kickRatio >= 0.4 && kickRatio <= 1.6) score += 0.5;

  return score;
}

/**
 * Détecte les onsets par pics d'énergie.
 */
async function detectOnsets(data: Float32Array, sr: number): Promise<number[]> {
  const FRAME = 1024;
  const HOP = 512;
  const onsets: number[] = [];
  const energies: number[] = [];
  const times: number[] = [];

  for (let i = 0; i + FRAME < data.length; i += HOP) {
    let sum = 0;
    for (let j = 0; j < FRAME; j++) {
      sum += data[i + j] * data[i + j];
    }
    energies.push(sum / FRAME);
    times.push(i / sr);

    if ((i / HOP) % 200 === 0) await yieldToBrowser();
  }

  if (energies.length < 4) return [];

  const sorted = [...energies].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const threshold = median * 2.5;

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

/**
 * Détecte les onsets de kick (basses fréquences).
 */
async function detectKickOnsets(
  data: Float32Array,
  sr: number
): Promise<number[]> {
  const filtered = lowPassFilter(data, sr, 150);

  const FRAME = 2048;
  const HOP = 1024;
  const onsets: number[] = [];
  const energies: number[] = [];
  const times: number[] = [];

  for (let i = 0; i + FRAME < filtered.length; i += HOP) {
    let sum = 0;
    for (let j = 0; j < FRAME; j++) {
      sum += filtered[i + j] * filtered[i + j];
    }
    energies.push(sum / FRAME);
    times.push(i / sr);

    if ((i / HOP) % 200 === 0) await yieldToBrowser();
  }

  if (energies.length < 4) return [];

  const sorted = [...energies].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const threshold = median * 3;

  let lastKick = -1;

  for (let i = 2; i < energies.length - 2; i++) {
    const curr = energies[i];
    const prev = energies[i - 2];
    const next = energies[i + 2];

    if (
      curr > threshold &&
      curr > prev * 1.5 &&
      curr > next * 1.3 &&
      times[i] - lastKick > 0.2
    ) {
      onsets.push(times[i]);
      lastKick = times[i];
    }
  }

  return onsets;
}

function lowPassFilter(
  data: Float32Array,
  sr: number,
  cutoff: number
): Float32Array {
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

function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const L = buffer.getChannelData(0);
  const R = buffer.getChannelData(1);
  const out = new Float32Array(L.length);
  for (let i = 0; i < L.length; i++) out[i] = (L[i] + R[i]) * 0.5;
  return out;
}