// src/audio/referenceMatch.ts
// Analyse un track de référence et génère un preset custom

import type { MasteringChain, MasteringPreset, PresetValues } from './masteringChain';

export interface ReferenceAnalysis {
  integratedLufs: number;
  peakDb: number;
  rmsDb: number;
  crestFactor: number;
  bandRmsDb: number[];    // RMS par bande (dBFS)
  recommendedPreset: MasteringPreset;
  customValues: PresetValues;
  customEq: { frequency: number; gain: number; q: number }[];
}

const BAND_FREQS = [
  { freq: 80,    type: 'lowshelf' as const,  q: 0.7 },
  { freq: 250,   type: 'peaking' as const,   q: 1   },
  { freq: 1000,  type: 'peaking' as const,   q: 1   },
  { freq: 4000,  type: 'peaking' as const,   q: 1   },
  { freq: 12000, type: 'highshelf' as const, q: 0.7 },
];

/**
 * Analyse un AudioBuffer de référence (offline, ~10x rapide).
 */
export async function analyzeReference(refBuffer: AudioBuffer): Promise<ReferenceAnalysis> {
  // 1. LUFS integrated via K-weighting
  const lufs = await measureLufs(refBuffer);

  // 2. Peak / RMS
  const { peak, rms } = measurePeakRms(refBuffer);
  const peakDb = 20 * Math.log10(peak + 1e-10);
  const rmsDb = 20 * Math.log10(rms + 1e-10);
  const crestFactor = peakDb - rmsDb;

  // 3. RMS par bande (via filtres offline)
  const bandRmsDb = await measureBandRms(refBuffer);

  // 4. Preset recommandé selon les caractéristiques
  const recommendedPreset = recommendPreset(crestFactor, bandRmsDb, lufs);

  // 5. Génère un preset custom : on cible un profil "moderne"
  const customValues: PresetValues = {
    loudness: clamp((crestFactor - 8) * 0.5, -3, 6),
    presence: 0, // neutre, on laisse l'EQ faire le travail
    width: 1 + clamp((crestFactor - 10) * 0.05, 0, 0.5),
    saturation: clamp((14 - crestFactor) * 0.02, 0.03, 0.25),
  };

  const customEq = generateCustomEq(bandRmsDb);

  return {
    integratedLufs: lufs,
    peakDb,
    rmsDb,
    crestFactor,
    bandRmsDb,
    recommendedPreset,
    customValues,
    customEq,
  };
}

// ------------------------------------------------------------------
// Mesure LUFS simplifiée (K-weighting + gating)
// ------------------------------------------------------------------
async function measureLufs(buffer: AudioBuffer): Promise<number> {
  const offline = new OfflineAudioContext(2, buffer.length, buffer.sampleRate);

  const hs = offline.createBiquadFilter();
  hs.type = 'highshelf';
  hs.frequency.value = 1500;
  hs.gain.value = 4;

  const hp = offline.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 38;
  hp.Q.value = 0.5;

  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.connect(hs);
  hs.connect(hp);
  hp.connect(offline.destination);
  src.start(0);

  const rendered = await offline.startRendering();

  // Calcule LUFS par blocs de 400ms
  const blockSize = Math.floor(rendered.sampleRate * 0.4);
  const chL = rendered.getChannelData(0);
  const chR = rendered.numberOfChannels > 1 ? rendered.getChannelData(1) : chL;

  const blockLufs: number[] = [];
  for (let i = 0; i + blockSize < rendered.length; i += blockSize) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      const l = chL[i + j];
      const r = chR[i + j];
      sum += l * l + r * r;
    }
    const rms = Math.sqrt(sum / (blockSize * 2));
    const lufsBlock = -0.691 + 10 * Math.log10(rms + 1e-10);
    blockLufs.push(lufsBlock);
  }

  // Gating absolu
  const absGated = blockLufs.filter(v => v > -70);
  if (absGated.length === 0) return -Infinity;

  // Gating relatif (seuil = LUFS intégré - 10)
  const absLufs = -0.691 + 10 * Math.log10(
    absGated.reduce((s, v) => s + Math.pow(10, (v + 0.691) / 10), 0) / absGated.length
  );
  const relGated = absGated.filter(v => v > absLufs - 10);
  if (relGated.length === 0) return absLufs;

  return -0.691 + 10 * Math.log10(
    relGated.reduce((s, v) => s + Math.pow(10, (v + 0.691) / 10), 0) / relGated.length
  );
}

// ------------------------------------------------------------------
// Peak + RMS broadband
// ------------------------------------------------------------------
function measurePeakRms(buffer: AudioBuffer): { peak: number; rms: number } {
  let peak = 0;
  let sum = 0;
  let count = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
      sum += data[i] * data[i];
      count++;
    }
  }
  return { peak, rms: Math.sqrt(sum / count) };
}

// ------------------------------------------------------------------
// RMS par bande (via filtres offline)
// ------------------------------------------------------------------
async function measureBandRms(buffer: AudioBuffer): Promise<number[]> {
  const results: number[] = [];
  for (const band of BAND_FREQS) {
    const offline = new OfflineAudioContext(2, buffer.length, buffer.sampleRate);
    const filter = offline.createBiquadFilter();
    filter.type = band.type;
    filter.frequency.value = band.freq;
    filter.Q.value = band.q;

    const src = offline.createBufferSource();
    src.buffer = buffer;
    src.connect(filter);
    filter.connect(offline.destination);
    src.start(0);

    const rendered = await offline.startRendering();

    let sum = 0;
    let count = 0;
    for (let c = 0; c < rendered.numberOfChannels; c++) {
      const data = rendered.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
        count++;
      }
    }
    const rms = Math.sqrt(sum / count);
    results.push(20 * Math.log10(rms + 1e-10));
  }
  return results;
}

// ------------------------------------------------------------------
// Recommandation de preset
// ------------------------------------------------------------------
function recommendPreset(
  crestFactor: number,
  bandRms: number[],
  lufs: number
): MasteringPreset {
  const hasStrongBass = bandRms[0] > bandRms[2] + 4;
  const isBright = bandRms[4] > bandRms[2] + 2;
  const isSquashed = crestFactor < 8;     // très compressé
  const isDynamic = crestFactor > 14;

  if (lufs > -10) return 'master';         // déjà masterisé loud
  if (hasStrongBass && !isBright) return 'warm';
  if (isBright && isDynamic) return 'open';
  if (isSquashed) return 'balanced';
  return 'balanced';
}

// ------------------------------------------------------------------
// Génère des gains EQ custom basés sur le spectre de référence
// ------------------------------------------------------------------
function generateCustomEq(bandRms: number[]): { frequency: number; gain: number; q: number }[] {
  // Profil cible : basse légèrement renforcée, médiums neutres, aigus ouverts
  const targetProfile = [0, -1, 0, +1, +2]; // dB par bande (cible "mastering moderne")

  return BAND_FREQS.map((band, i) => {
    // Si la référence a déjà beaucoup de cette bande, on baisse
    // Si elle en a peu, on monte
    const ref = bandRms[i];
    const avg = bandRms.reduce((s, v) => s + v, 0) / bandRms.length;
    const delta = ref - avg; // positif = référence a plus de cette bande
    const gain = targetProfile[i] - delta * 0.3; // compensation douce

    return {
      frequency: band.freq,
      gain: clamp(gain, -6, 6),
      q: band.q,
    };
  });
}

// ------------------------------------------------------------------
// Utilitaire
// ------------------------------------------------------------------
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Applique une analyse de référence à une chaîne de mastering existante.
 */
export function applyReferenceToChain(
  chain: MasteringChain,
  analysis: ReferenceAnalysis
): void {
  analysis.customEq.forEach((band, i) => {
    chain.setEQBand(i, band.frequency, band.gain, band.q);
  });
  chain.setLoudness(analysis.customValues.loudness);
  chain.setPresence(analysis.customValues.presence);
  chain.setWidth(analysis.customValues.width);
  chain.setSaturation(analysis.customValues.saturation);
}