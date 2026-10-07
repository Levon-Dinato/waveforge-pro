import type { DetectedNote } from '../types';

// Notes MIDI du General MIDI (canal 10 = percussion)
const GM_KICK = 36;
const GM_SNARE = 38;
const GM_HIHAT = 42;

/**
 * Détecte les onsets (attaques) d'un signal audio et les classifie
 * en kick / snare / hihat selon leur contenu fréquentiel.
 */
export function transcribeDrums(audioBuffer: AudioBuffer): DetectedNote[] {
  const sr = audioBuffer.sampleRate;
  const data = audioBuffer.getChannelData(0);

  // 1. Détection des onsets par spectral flux
  const onsets = detectOnsets(data, sr);

  // 2. Classification kick/snare/hihat par analyse fréquentielle
  const notes: DetectedNote[] = [];

  for (const onset of onsets) {
    const { time, energy } = onset;
    const startSample = Math.floor(time * sr);
    const endSample = Math.min(startSample + 2048, data.length);
    const window = data.slice(startSample, endSample);

    if (window.length < 256) continue;

    // FFT simple pour analyse fréquentielle
    const spectrum = computeSpectrum(window);

    // Bandes d'énergie
    const lowEnergy = bandEnergy(spectrum, sr, 0, 120);       // kick
    const midEnergy = bandEnergy(spectrum, sr, 120, 8000);    // snare
    const highEnergy = bandEnergy(spectrum, sr, 8000, 16000); // hihat

    const total = lowEnergy + midEnergy + highEnergy;
    if (total < 0.01) continue;

    // Classification
    let midi = GM_HIHAT;
    if (lowEnergy / total > 0.4) midi = GM_KICK;
    else if (midEnergy / total > 0.35) midi = GM_SNARE;
    else if (highEnergy / total > 0.3) midi = GM_HIHAT;

    const velocity = Math.min(127, Math.round(energy * 200 + 40));

    notes.push({
      midi,
      start: time,
      duration: 0.05,
      velocity,
      confidence: Math.min(1, energy * 2),
      track: 'drums' as any,
    });
  }

  return notes;
}

/**
 * Détecte les onsets par différence spectrale (spectral flux).
 */
function detectOnsets(data: Float32Array, sr: number): { time: number; energy: number }[] {
  const FRAME = 1024;
  const HOP = 512;
  const THRESHOLD = 0.15;

  const energies: number[] = [];
  const times: number[] = [];

  for (let i = 0; i + FRAME < data.length; i += HOP) {
    let energy = 0;
    for (let j = 0; j < FRAME; j++) {
      energy += data[i + j] * data[i + j];
    }
    energies.push(energy / FRAME);
    times.push(i / sr);
  }

  // Détection des pics (onsets)
  const onsets: { time: number; energy: number }[] = [];
  for (let i = 1; i < energies.length - 1; i++) {
    const prev = energies[i - 1];
    const curr = energies[i];
    const next = energies[i + 1];

    // Pic local + seuil
    if (curr > prev * 1.5 && curr > next * 1.2 && curr > THRESHOLD) {
      onsets.push({ time: times[i], energy: curr });
    }
  }

  return onsets;
}

/**
 * Calcule un spectre simple (magnitude) via FFT rudimentaire.
 */
function computeSpectrum(window: Float32Array): Float32Array {
  const N = Math.min(512, window.length);
  const spectrum = new Float32Array(N / 2);

  for (let k = 0; k < N / 2; k++) {
    let real = 0;
    let imag = 0;
    for (let n = 0; n < N; n++) {
      const angle = (-2 * Math.PI * k * n) / N;
      real += window[n] * Math.cos(angle);
      imag += window[n] * Math.sin(angle);
    }
    spectrum[k] = Math.sqrt(real * real + imag * imag) / N;
  }

  return spectrum;
}

/**
 * Somme l'énergie dans une bande de fréquences.
 */
function bandEnergy(spectrum: Float32Array, sr: number, fMin: number, fMax: number): number {
  const binHz = sr / (spectrum.length * 2);
  const kMin = Math.floor(fMin / binHz);
  const kMax = Math.min(Math.ceil(fMax / binHz), spectrum.length - 1);

  let sum = 0;
  for (let k = kMin; k <= kMax; k++) sum += spectrum[k];
  return sum;
}