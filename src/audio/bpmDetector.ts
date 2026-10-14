import { yieldToBrowser } from './asyncHelpers';

export interface BPMResult {
  bpm: number;
  confidence: number;
  candidates: number[];
  alternatives: number[];
}

// Constantes d'analyse
const HOP = 512;
const FRAME = 2048;

/**
 * Détection BPM par autocorrélation de l'enveloppe d'onsets.
 * Beaucoup plus robuste que la méthode par histogramme d'intervalles.
 */
export async function detectBPM(audioBuffer: AudioBuffer): Promise<BPMResult> {
  const sr = audioBuffer.sampleRate;
  const data = mixToMono(audioBuffer);

  console.log(`🥁 Analyse BPM sur ${audioBuffer.duration.toFixed(2)}s`);

  // 1. Enveloppe d'onsets (flux d'énergie filtré)
  const env = await computeOnsetEnvelope(data, sr);
  const hopTime = HOP / sr;

  if (env.length < 64) {
    console.log('⚠️ Fichier trop court pour une analyse fiable');
    return { bpm: 120, confidence: 0, candidates: [120], alternatives: [] };
  }

  // 2. Autocorrélation
  const acf = autocorrelate(env);

  // 3. Comb-filter sur plage 70-200 BPM
  const MIN_BPM = 70;
  const MAX_BPM = 200;
  const minLag = Math.max(1, Math.floor((60 / MAX_BPM) / hopTime));
  const maxLag = Math.min(acf.length - 1, Math.floor((60 / MIN_BPM) / hopTime));

  const candidates: { bpm: number; lag: number; score: number }[] = [];

  for (let lag = minLag; lag <= maxLag; lag++) {
    // Somme pondérée : le lag et ses multiples (comb filter)
    let score = 0;
    for (let k = 1; k <= 4; k++) {
      const idx = lag * k;
      if (idx < acf.length) score += acf[idx] / k;
    }
    candidates.push({ bpm: 60 / (lag * hopTime), lag, score });
  }

  candidates.sort((a, b) => b.score - a.score);

  // 4. Normalisation dans [90, 180] + bonus sur la plage DJ
  const normalized = candidates.slice(0, 20).map((c) => {
    let b = c.bpm;
    while (b < 90) b *= 2;
    while (b > 180) b /= 2;
    const nb = Math.round(b);

    // Bonus pondéré : la house/techno est presque toujours dans 120-132
    let bonus = 0;
    if (nb >= 120 && nb <= 132) bonus += 0.6;
    else if (nb >= 115 && nb <= 140) bonus += 0.3;
    else if (nb >= 100 && nb <= 145) bonus += 0.1;
    else if (nb < 95 || nb > 175) bonus -= 0.3;

    return { ...c, normalizedBpm: nb, finalScore: c.score + bonus };
  });

  // 5. Déduplication par BPM (garde le meilleur score)
  const byBpm: Record<number, typeof normalized[0]> = {};
  for (const n of normalized) {
    if (!byBpm[n.normalizedBpm] || byBpm[n.normalizedBpm].finalScore < n.finalScore) {
      byBpm[n.normalizedBpm] = n;
    }
  }

  const finalList = Object.values(byBpm).sort((a, b) => b.finalScore - a.finalScore);
  const best = finalList[0];
  const second = finalList[1];

  // Confiance = écart relatif avec le second candidat
  const confidence = second && best.finalScore > 0
    ? Math.min(1, (best.finalScore - second.finalScore) / best.finalScore + 0.4)
    : 0.4;

  const finalBPM = best.normalizedBpm;
  const alternatives = finalList.slice(1, 4).map((f) => f.normalizedBpm);

  console.log(
    `✅ BPM final : ${finalBPM} (confiance ${(confidence * 100).toFixed(0)}%)`
  );
  console.log(
    `   Top 5 : ${finalList
      .slice(0, 5)
      .map((f) => `${f.normalizedBpm}(${f.finalScore.toFixed(2)})`)
      .join(', ')}`
  );

  return {
    bpm: finalBPM,
    confidence,
    candidates: finalList.map((f) => f.normalizedBpm),
    alternatives,
  };
}

// ═══════════════════════════════════════════════════════════
// ENVELOPPE D'ONSETS
// ═══════════════════════════════════════════════════════════
async function computeOnsetEnvelope(
  data: Float32Array,
  sr: number
): Promise<Float32Array> {
  // Passe-bande 100 Hz – 8 kHz : retire le DC et le bruit haute fréquence
  const filtered = bandpass(data, sr, 100, 8000);

  const numFrames = Math.floor((filtered.length - FRAME) / HOP) + 1;
  const env = new Float32Array(numFrames);

  let prevEnergy = 0;
  for (let i = 0; i < numFrames; i++) {
    const offset = i * HOP;
    let sum = 0;
    for (let j = 0; j < FRAME; j++) {
      const s = filtered[offset + j];
      sum += s * s;
    }
    const energy = Math.sqrt(sum / FRAME);

    // Half-wave rectified flux : ne garder que les augmentations
    const diff = energy - prevEnergy;
    env[i] = diff > 0 ? diff : 0;
    prevEnergy = energy;

    if (i % 300 === 0) await yieldToBrowser();
  }

  return env;
}

// ═══════════════════════════════════════════════════════════
// AUTOCORRÉLATION
// ═══════════════════════════════════════════════════════════
function autocorrelate(signal: Float32Array): Float32Array {
  const N = Math.min(signal.length, 4096);
  const acf = new Float32Array(N);

  // Moyenne pour centrage
  let mean = 0;
  for (let i = 0; i < N; i++) mean += signal[i];
  mean /= N;

  // ACF naïve O(N²) — acceptable pour N=4096 (~16M ops)
  for (let lag = 0; lag < N; lag++) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i + lag < N; i++) {
      sum += (signal[i] - mean) * (signal[i + lag] - mean);
      count++;
    }
    acf[lag] = count > 0 ? sum / count : 0;
  }

  // Normalisation par acf[0]
  if (acf[0] !== 0) {
    for (let i = 0; i < N; i++) acf[i] /= acf[0];
  }

  return acf;
}

// ═══════════════════════════════════════════════════════════
// FILTRES
// ═══════════════════════════════════════════════════════════
function bandpass(
  data: Float32Array,
  sr: number,
  lowCut: number,
  highCut: number
): Float32Array {
  const lp = lowPass(data, sr, highCut);
  const hp = lowPass(data, sr, lowCut);
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = lp[i] - hp[i];
  return out;
}

function lowPass(
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