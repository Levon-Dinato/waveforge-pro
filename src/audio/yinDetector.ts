/**
 * Détecteur de pitch YIN simplifié.
 * Retourne la fréquence dominante (Hz) d'un buffer, ou -1 si silence.
 */
export function detectPitchYIN(
  buffer: Float32Array,
  sampleRate: number,
  threshold = 0.1
): { freq: number; confidence: number } {
  const SIZE = buffer.length;
  const yinBuffer = new Float32Array(SIZE / 2);

  // 1. Difference function
  for (let tau = 0; tau < yinBuffer.length; tau++) {
    yinBuffer[tau] = 0;
    for (let i = 0; i < yinBuffer.length; i++) {
      const delta = buffer[i] - buffer[i + tau];
      yinBuffer[tau] += delta * delta;
    }
  }

  // 2. Cumulative mean normalized difference
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < yinBuffer.length; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }

  // 3. Absolute threshold
  let tauEstimate = -1;
  for (let tau = 2; tau < yinBuffer.length; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < yinBuffer.length && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) return { freq: -1, confidence: 0 };

  // 4. Parabolic interpolation
  const betterTau = parabolicInterpolation(yinBuffer, tauEstimate);
  const freq = sampleRate / betterTau;
  const confidence = 1 - yinBuffer[tauEstimate];

  return { freq, confidence };
}

function parabolicInterpolation(arr: Float32Array, tau: number): number {
  const x0 = tau < 1 ? tau : tau - 1;
  const x2 = tau + 1 < arr.length ? tau + 1 : tau;
  if (x0 === tau) return arr[tau] <= arr[x2] ? tau : x2;
  if (x2 === tau) return arr[tau] <= arr[x0] ? tau : x0;
  const s0 = arr[x0], s1 = arr[tau], s2 = arr[x2];
  const denom = 2 * (2 * s1 - s2 - s0);
  return denom === 0 ? tau : tau + (s2 - s0) / denom;
}

/** Convertit une fréquence en note MIDI (arrondie). */
export function freqToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

/** Fréquence d'une note MIDI. */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}