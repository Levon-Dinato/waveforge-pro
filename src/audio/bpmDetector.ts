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
 * ✅ Inclut une préférence élargie 120-180 pour le hardcore/uptempo.
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

  // 3. Comb-filter sur plage 70-220 BPM (élargi pour hardcore)
  const MIN_BPM = 70;
  const MAX_BPM = 220;
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

  // 4. Normalisation dans [85, 200] + bonus pondéré (élargi hardcore)
  const normalized = candidates.slice(0, 30).map((c) => {
    let b = c.bpm;
    // ✅ Plage élargie à [85, 200] (au lieu de [90, 180])
    while (b < 85) b *= 2;
    while (b > 200) b /= 2;
    const nb = Math.round(b);

    // ✅ Bonus pondéré — inclut maintenant le hardcore 140-180
    let bonus = 0;
    // Zone "dance floor" moderne : on booste plus large
    if (nb >= 118 && nb <= 132) bonus += 0.6;       // House/Techno classique
    else if (nb >= 133 && nb <= 155) bonus += 0.55; // Tech/Hard House
    else if (nb >= 156 && nb <= 180) bonus += 0.5;  // Hardcore/Hardstyle/Uptempo
    else if (nb >= 100 && nb <= 117) bonus += 0.2;  // Minimal/Deep
    else if (nb >= 181 && nb <= 200) bonus += 0.3;  // Uptempo extrême
    else if (nb < 95 || nb > 200) bonus -= 0.3;

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

  // ✅ 6. Règle anti-erreur : si 120 et un candidat 140-185 sont proches,
  //     on préfère le candidat élevé (cas typique hardcore / 3:4 ambiguity)
  const top = finalList[0];
  if (top && top.normalizedBpm <= 135) {
    // Cherche un candidat dans la plage hardcore
    const higherAlt = finalList.find(
      (f) => f.normalizedBpm >= 140 && f.normalizedBpm <= 185
    );
    if (higherAlt && higherAlt.finalScore >= top.finalScore * 0.75) {
      console.log(
        `🔧 Anti-erreur : ${top.normalizedBpm} BPM (score ${top.finalScore.toFixed(2)}) → ${higherAlt.normalizedBpm} BPM (score ${higherAlt.finalScore.toFixed(2)})`
      );
      // Remonte le candidat hardcore au top
      const idx = finalList.indexOf(higherAlt);
      finalList.splice(idx, 1);
      finalList.unshift(higherAlt);
    }
  }

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
  // ✅ Passe-bande élargi côté bas (60 Hz) pour mieux capter les kicks hardcore
  const filtered = bandpass(data, sr, 60, 8000);

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