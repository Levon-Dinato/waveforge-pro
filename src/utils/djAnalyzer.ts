// src/utils/djAnalyzer.ts

export interface AutoCue {
  name: string;
  position: number;
  color: string;
  type: 'intro' | 'drop' | 'breakdown' | 'outro' | 'cue';
}

export interface VocalSection {
  start: number;
  end: number;
}

export interface AnalysisResult {
  bpm: number;
  key: string;
  camelot: string;
  duration: number;
  autoCues: AutoCue[];
  vocalSections: VocalSection[];
}

// ============================================================
// DÉTECTION BPM PRO
// ============================================================
export function detectBPM(audioBuffer: AudioBuffer): number {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const biquad = createLowpassFilter(sampleRate, 200, 0.7);
  const filtered = new Float32Array(channelData.length);
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < channelData.length; i++) {
    const x = channelData[i];
    const y = biquad.b0 * x + z1;
    z1 = biquad.b1 * x - biquad.a1 * y + z2;
    z2 = biquad.b2 * x - biquad.a2 * y;
    filtered[i] = y;
  }

  const hopSize = 512;
  const windowSize = 1024;
  const numFrames = Math.floor((filtered.length - windowSize) / hopSize);
  const envelope = new Float32Array(numFrames);

  for (let i = 0; i < numFrames; i++) {
    let sum = 0;
    const start = i * hopSize;
    for (let j = 0; j < windowSize; j++) {
      const s = filtered[start + j];
      sum += s * s;
    }
    envelope[i] = Math.sqrt(sum / windowSize);
  }

  const avg = envelope.reduce((a, b) => a + b, 0) / envelope.length;
  const onsets: number[] = [];
  const threshold = avg * 1.3;
  const minGap = 4;

  for (let i = 1; i < numFrames - 1; i++) {
    if (
      envelope[i] > threshold &&
      envelope[i] > envelope[i - 1] &&
      envelope[i] > envelope[i + 1]
    ) {
      if (onsets.length === 0 || i - onsets[onsets.length - 1] > minGap) {
        onsets.push(i);
      }
    }
  }

  if (onsets.length < 8) return 120;

  const intervals: number[] = [];
  for (let i = 1; i < onsets.length; i++) {
    intervals.push(onsets[i] - onsets[i - 1]);
  }

  const samplesPerSecond = sampleRate / hopSize;
  const minIntervalFrames = Math.round((60 / 200) * samplesPerSecond);
  const maxIntervalFrames = Math.round((60 / 60) * samplesPerSecond);

  const histogram = new Map<number, number>();
  intervals.forEach((interval) => {
    for (let mult = 1; mult <= 4; mult++) {
      const testInterval = interval * mult;
      if (
        testInterval >= minIntervalFrames &&
        testInterval <= maxIntervalFrames
      ) {
        const bucket = Math.round(testInterval);
        histogram.set(bucket, (histogram.get(bucket) || 0) + 1 / mult);
      }
    }
  });

  let bestInterval = 0;
  let bestScore = 0;
  histogram.forEach((score, interval) => {
    if (score > bestScore) {
      bestScore = score;
      bestInterval = interval;
    }
  });

  if (bestInterval === 0) return 120;

  const secondsPerFrame = hopSize / sampleRate;
  const beatDuration = bestInterval * secondsPerFrame;
  const rawBpm = 60 / beatDuration;

  const candidates: number[] = [
    rawBpm / 3,
    rawBpm / 2,
    rawBpm * (2 / 3),
    rawBpm * (3 / 4),
    rawBpm,
    rawBpm * (4 / 3),
    rawBpm * (3 / 2),
    rawBpm * 2,
    rawBpm * 3,
  ];

  const TARGET = 124;
  let bestBpm = rawBpm;
  let bestCandidateScore = -Infinity;

  candidates.forEach((candidate) => {
    if (candidate < 70 || candidate > 200) return;

    const distance = Math.abs(candidate - TARGET);
    let score = -distance * 3;

    if (candidate >= 120 && candidate <= 128) score += 150;
    if (candidate >= 115 && candidate <= 135) score += 80;
    if (candidate >= 110 && candidate <= 145) score += 40;
    if (candidate >= 170 && candidate <= 180) score += 20;

    if (score > bestCandidateScore) {
      bestCandidateScore = score;
      bestBpm = candidate;
    }
  });

  const searchRadius = 2;
  const step = 0.01;
  let bestRegressionBpm = bestBpm;
  let bestRegressionScore = Infinity;

  const onsetsInSeconds = onsets.map((o) => o * secondsPerFrame);

  for (
    let testBpm = bestBpm - searchRadius;
    testBpm <= bestBpm + searchRadius;
    testBpm += step
  ) {
    if (testBpm < 70 || testBpm > 200) continue;

    const testBeatDur = 60 / testBpm;
    let totalError = 0;
    let matchedCount = 0;

    onsetsInSeconds.forEach((onsetTime) => {
      const beatNumber = Math.round(onsetTime / testBeatDur);
      const nearestBeatTime = beatNumber * testBeatDur;
      const error = Math.abs(onsetTime - nearestBeatTime);

      if (error < testBeatDur * 0.25) {
        totalError += error * error;
        matchedCount++;
      }
    });

    if (matchedCount > onsets.length * 0.4) {
      const score = totalError / matchedCount;
      if (score < bestRegressionScore) {
        bestRegressionScore = score;
        bestRegressionBpm = testBpm;
      }
    }
  }

  const nearestInteger = Math.round(bestRegressionBpm);
  const distanceToInteger = Math.abs(bestRegressionBpm - nearestInteger);

  let finalBpm = bestRegressionBpm;
  if (distanceToInteger < 0.25) {
    finalBpm = nearestInteger;
  }

  return Math.round(finalBpm * 10) / 10;
}

// ============================================================
// HELPERS
// ============================================================
function createLowpassFilter(
  sampleRate: number,
  cutoffFreq: number,
  Q: number
): { b0: number; b1: number; b2: number; a1: number; a2: number } {
  const w0 = (2 * Math.PI * cutoffFreq) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * Q);

  const b0 = (1 - cosW0) / 2;
  const b1 = 1 - cosW0;
  const b2 = (1 - cosW0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW0;
  const a2 = 1 - alpha;

  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function createHighpassFilter(
  sampleRate: number,
  cutoffFreq: number,
  Q: number
): { b0: number; b1: number; b2: number; a1: number; a2: number } {
  const w0 = (2 * Math.PI * cutoffFreq) / sampleRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * Q);

  const b0 = (1 + cosW0) / 2;
  const b1 = -(1 + cosW0);
  const b2 = (1 + cosW0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW0;
  const a2 = 1 - alpha;

  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

// ============================================================
// DÉTECTION KEY
// ============================================================
const CAMELOT_MAP: Record<string, string> = {
  'C major': '8B', 'A minor': '8A',
  'G major': '9B', 'E minor': '9A',
  'D major': '10B', 'B minor': '10A',
  'A major': '11B', 'F# minor': '11A',
  'E major': '12B', 'C# minor': '12A',
  'B major': '1B', 'G# minor': '1A',
  'F# major': '2B', 'D# minor': '2A',
  'C# major': '3B', 'A# minor': '3A',
  'G# major': '4B', 'F minor': '4A',
  'D# major': '5B', 'C minor': '5A',
  'A# major': '6B', 'G minor': '6A',
  'F major': '7B', 'D minor': '7A',
};

export function detectKey(audioBuffer: AudioBuffer): { key: string; camelot: string } {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const fftSize = 4096;
  const maxSamples = Math.min(channelData.length, sampleRate * 10);
  const numFrames = Math.floor(maxSamples / fftSize);

  if (numFrames < 4) return { key: 'C major', camelot: '8B' };

  const chroma = new Float32Array(12);
  const noteFrequencies: number[] = [];
  for (let octave = 2; octave <= 5; octave++) {
    for (let note = 0; note < 12; note++) {
      noteFrequencies.push(440 * Math.pow(2, octave - 4 + (note - 9) / 12));
    }
  }

  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * fftSize;
    for (let noteIdx = 0; noteIdx < noteFrequencies.length; noteIdx++) {
      const freq = noteFrequencies[noteIdx];
      const bin = Math.round((freq * fftSize) / sampleRate);
      if (bin < 1 || bin >= fftSize / 2) continue;

      let real = 0;
      let imag = 0;
      for (let i = 0; i < fftSize; i += 8) {
        const t = (start + i) / sampleRate;
        const angle = 2 * Math.PI * freq * t;
        const sample = channelData[start + i] || 0;
        real += sample * Math.cos(angle);
        imag += sample * Math.sin(angle);
      }
      const mag = Math.sqrt(real * real + imag * imag);
      chroma[noteIdx % 12] += mag;
    }
  }

  let maxIdx = 0;
  let maxVal = 0;
  for (let i = 0; i < 12; i++) {
    if (chroma[i] > maxVal) {
      maxVal = chroma[i];
      maxIdx = i;
    }
  }

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rootName = noteNames[maxIdx];
  const minorThirdIdx = (maxIdx + 3) % 12;
  const isMinor = chroma[minorThirdIdx] > chroma[(maxIdx + 4) % 12] * 0.8;

  const keyName = `${rootName} ${isMinor ? 'minor' : 'major'}`;
  const camelot = CAMELOT_MAP[keyName] || '8B';

  return { key: keyName, camelot };
}

// ============================================================
// DÉTECTION VOCAL SECTIONS
// ============================================================
export function detectVocalSections(audioBuffer: AudioBuffer): VocalSection[] {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;

  const highpass = createHighpassFilter(sampleRate, 250, 0.7);
  const lowpass = createLowpassFilter(sampleRate, 4000, 0.7);

  const vocalBand = new Float32Array(channelData.length);
  let hpz1 = 0, hpz2 = 0;
  let lpz1 = 0, lpz2 = 0;

  for (let i = 0; i < channelData.length; i++) {
    const x = channelData[i];

    const hpy = highpass.b0 * x + hpz1;
    hpz1 = highpass.b1 * x - highpass.a1 * hpy + hpz2;
    hpz2 = highpass.b2 * x - highpass.a2 * hpy;

    const lpy = lowpass.b0 * hpy + lpz1;
    lpz1 = lowpass.b1 * hpy - lowpass.a1 * lpy + lpz2;
    lpz2 = lowpass.b2 * hpy - lowpass.a2 * lpy;

    vocalBand[i] = lpy;
  }

  const windowSec = 0.25;
  const windowSize = Math.floor(sampleRate * windowSec);
  const numWindows = Math.floor(vocalBand.length / windowSize);
  const vocalEnergy = new Float32Array(numWindows);

  for (let i = 0; i < numWindows; i++) {
    let sum = 0;
    const start = i * windowSize;
    for (let j = 0; j < windowSize; j += 50) {
      const s = vocalBand[start + j];
      sum += s * s;
    }
    vocalEnergy[i] = Math.sqrt(sum / (windowSize / 50));
  }

  const smoothed = new Float32Array(numWindows);
  const smoothWin = 8;
  for (let i = 0; i < numWindows; i++) {
    let sum = 0;
    let count = 0;
    for (let j = -smoothWin; j <= smoothWin; j++) {
      if (i + j >= 0 && i + j < numWindows) {
        sum += vocalEnergy[i + j];
        count++;
      }
    }
    smoothed[i] = sum / count;
  }

  const avg = smoothed.reduce((a, b) => a + b, 0) / smoothed.length;
  const threshold = avg * 1.35;

  const sections: VocalSection[] = [];
  let inVocal = false;
  let start = 0;

  for (let i = 0; i < numWindows; i++) {
    if (smoothed[i] > threshold && !inVocal) {
      inVocal = true;
      start = i;
    } else if (smoothed[i] < threshold * 0.75 && inVocal) {
      inVocal = false;
      const startTime = start * windowSec;
      const endTime = i * windowSec;
      if (endTime - startTime > 1.5) {
        sections.push({ start: startTime, end: endTime });
      }
    }
  }

  if (inVocal) {
    sections.push({ start: start * windowSec, end: duration });
  }

  return sections;
}

// ============================================================
// DÉTECTION CUE POINTS
// ============================================================
export function detectAutoCues(audioBuffer: AudioBuffer, bpm: number): AutoCue[] {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;

  const beatDur = 60 / bpm;
  const barDur = beatDur * 4;
  const snapToBar = (time: number) =>
    Math.max(0, Math.round(time / barDur) * barDur);
  const snapToBeat = (time: number) =>
    Math.max(0, Math.round(time / beatDur) * beatDur);

  const windowSec = 0.25;
  const windowSize = Math.floor(sampleRate * windowSec);
  const numWindows = Math.floor(channelData.length / windowSize);

  const lowEnergy = new Float32Array(numWindows);
  const midEnergy = new Float32Array(numWindows);
  const highEnergy = new Float32Array(numWindows);

  let lowState = 0;
  let highState = 0;

  for (let i = 0; i < numWindows; i++) {
    let lowSum = 0, midSum = 0, highSum = 0;
    const start = i * windowSize;

    for (let j = 0; j < windowSize; j += 20) {
      const sample = channelData[start + j] || 0;

      lowState = lowState * 0.92 + sample * 0.08;
      lowSum += lowState * lowState;

      const high = sample - lowState;
      highState = highState * 0.7 + high * 0.3;
      highSum += highState * highState;

      const mid = sample - lowState - highState;
      midSum += mid * mid;
    }

    const samplesCount = windowSize / 20;
    lowEnergy[i] = Math.sqrt(lowSum / samplesCount);
    midEnergy[i] = Math.sqrt(midSum / samplesCount);
    highEnergy[i] = Math.sqrt(highSum / samplesCount);
  }

  const smoothArray = (arr: Float32Array, win: number): Float32Array => {
    const result = new Float32Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
      let sum = 0, count = 0;
      for (let j = -win; j <= win; j++) {
        if (i + j >= 0 && i + j < arr.length) {
          sum += arr[i + j];
          count++;
        }
      }
      result[i] = sum / count;
    }
    return result;
  };

  const lowSmooth = smoothArray(lowEnergy, 8);
  const midSmooth = smoothArray(midEnergy, 8);
  const highSmooth = smoothArray(highEnergy, 8);

  const totalEnergy = new Float32Array(numWindows);
  for (let i = 0; i < numWindows; i++) {
    totalEnergy[i] = (lowSmooth[i] + midSmooth[i] + highSmooth[i]) / 3;
  }

  const avgLow = lowSmooth.reduce((a, b) => a + b, 0) / lowSmooth.length;
  const avgMid = midSmooth.reduce((a, b) => a + b, 0) / midSmooth.length;
  const avgHigh = highSmooth.reduce((a, b) => a + b, 0) / highSmooth.length;
  const avgTotal = totalEnergy.reduce((a, b) => a + b, 0) / totalEnergy.length;
  const maxTotal = Math.max(...Array.from(totalEnergy));

  const timeFromWindow = (idx: number) => idx * windowSec;

  interface CueCandidate {
    time: number;
    score: number;
    name: string;
    color: string;
    type: AutoCue['type'];
  }

  const candidates: CueCandidate[] = [];

  // DROPS
  const dropThreshold = maxTotal * 0.75;
  let inDrop = false;
  let dropStart = 0;

  for (let i = 0; i < numWindows; i++) {
    if (totalEnergy[i] > dropThreshold && !inDrop) {
      inDrop = true;
      dropStart = i;
    } else if (totalEnergy[i] < dropThreshold * 0.9 && inDrop) {
      inDrop = false;
      candidates.push({
        time: timeFromWindow(dropStart),
        score: 100,
        name: 'DROP',
        color: '#ff3366',
        type: 'drop',
      });
    }
  }

  // INTRO
  for (let i = 0; i < numWindows; i++) {
    if (totalEnergy[i] > avgTotal * 0.6) {
      candidates.push({
        time: timeFromWindow(i),
        score: 95,
        name: 'INTRO',
        color: '#00ff88',
        type: 'intro',
      });
      break;
    }
  }

  // OUTRO
  for (let i = numWindows - 1; i >= numWindows * 0.7; i--) {
    if (totalEnergy[i] < avgTotal * 0.5) {
      candidates.push({
        time: timeFromWindow(i),
        score: 85,
        name: 'OUTRO',
        color: '#7c5cff',
        type: 'outro',
      });
      break;
    }
  }

  // BUILD
  const buildWindow = Math.floor(8 / windowSec);
  for (let i = buildWindow; i < numWindows - buildWindow; i++) {
    let rising = true;
    let riseAmount = 0;
    for (let j = 0; j < buildWindow; j++) {
      if (totalEnergy[i - j] < totalEnergy[i - j - 1]) {
        rising = false;
        break;
      }
      riseAmount += totalEnergy[i - j] - totalEnergy[i - j - 1];
    }

    if (rising && riseAmount > avgTotal * 0.5) {
      let hasDropAfter = false;
      for (let j = 0; j < Math.floor(4 / windowSec); j++) {
        if (i + j < numWindows && totalEnergy[i + j] > dropThreshold) {
          hasDropAfter = true;
          break;
        }
      }

      if (hasDropAfter) {
        candidates.push({
          time: timeFromWindow(i - buildWindow),
          score: 80,
          name: 'BUILD',
          color: '#ffd43b',
          type: 'cue',
        });
        i += buildWindow;
      }
    }
  }

  // BREAK
  const breakThreshold = avgTotal * 0.45;
  let inBreak = false;
  let breakStart = 0;

  for (let i = 2; i < numWindows - 2; i++) {
    if (totalEnergy[i] < breakThreshold && !inBreak) {
      if (totalEnergy[i - 2] > avgTotal * 0.7) {
        inBreak = true;
        breakStart = i;
      }
    } else if (totalEnergy[i] > breakThreshold * 1.3 && inBreak) {
      const breakDuration = timeFromWindow(i) - timeFromWindow(breakStart);
      if (breakDuration > 3) {
        candidates.push({
          time: timeFromWindow(breakStart),
          score: 75,
          name: 'BREAK',
          color: '#ffd43b',
          type: 'breakdown',
        });
      }
      inBreak = false;
    }
  }

  // KICK IN / OUT
  for (let i = 2; i < numWindows - 2; i++) {
    const prevLow = lowSmooth[i - 2];
    const curLow = lowSmooth[i];

    if (prevLow > avgLow * 1.2 && curLow < avgLow * 0.5) {
      candidates.push({
        time: timeFromWindow(i),
        score: 70,
        name: 'KICK OUT',
        color: '#ff8800',
        type: 'cue',
      });
    }

    if (prevLow < avgLow * 0.6 && curLow > avgLow * 1.3) {
      candidates.push({
        time: timeFromWindow(i),
        score: 72,
        name: 'KICK IN',
        color: '#00d9ff',
        type: 'cue',
      });
    }
  }

  // VOCAL IN
  for (let i = 4; i < numWindows - 4; i++) {
    const prevMid = midSmooth[i - 4];
    const curMid = midSmooth[i];

    if (
      curMid > prevMid * 1.8 &&
      curMid > avgMid * 1.3 &&
      lowSmooth[i] < avgLow * 1.1
    ) {
      candidates.push({
        time: timeFromWindow(i),
        score: 68,
        name: 'VOCAL IN',
        color: '#ff5cf0',
        type: 'cue',
      });
      i += Math.floor(4 / windowSec);
    }
  }

  // FILL
  for (let i = 2; i < numWindows - Math.floor(3 / windowSec); i++) {
    if (
      highSmooth[i] > avgHigh * 1.6 &&
      highSmooth[i] > highSmooth[i - 2] * 1.4
    ) {
      let hasDropSoon = false;
      for (let j = i; j < i + Math.floor(3 / windowSec); j++) {
        if (j < numWindows && totalEnergy[j] > dropThreshold) {
          hasDropSoon = true;
          break;
        }
      }
      if (hasDropSoon) {
        candidates.push({
          time: timeFromWindow(i),
          score: 65,
          name: 'FILL',
          color: '#ff8800',
          type: 'cue',
        });
        i += Math.floor(2 / windowSec);
      }
    }
  }

  // CRASH
  for (let i = 2; i < numWindows - 2; i++) {
    if (
      totalEnergy[i] > maxTotal * 0.9 &&
      totalEnergy[i] > totalEnergy[i - 1] * 1.5 &&
      totalEnergy[i] > totalEnergy[i + 1] * 1.3
    ) {
      candidates.push({
        time: timeFromWindow(i),
        score: 60,
        name: 'CRASH',
        color: '#ffffff',
        type: 'cue',
      });
      i += Math.floor(1 / windowSec);
    }
  }

  // Filtre top cues
  candidates.sort((a, b) => b.score - a.score);

  const minDistance = barDur * 4;
  const finalCues: CueCandidate[] = [];

  for (const cand of candidates) {
    const tooClose = finalCues.some(
      (c) => Math.abs(c.time - cand.time) < minDistance
    );
    if (!tooClose) {
      finalCues.push(cand);
      if (finalCues.length >= 8) break;
    }
  }

  const snappedCues = finalCues
    .map((c) => ({
      ...c,
      time: c.score >= 80 ? snapToBar(c.time) : snapToBeat(c.time),
    }))
    .sort((a, b) => a.time - b.time);

  // ============================================================
  // ✅ FILTRE : retire les cues au-delà de 85% (fade out)
  // (l'OUTRO est détecté naturellement à la fin, on l'enlève)
  // ============================================================
  const maxCueTime = duration * 0.85;
  const filteredCues = snappedCues.filter((c) => c.time <= maxCueTime);
  snappedCues.length = 0;
  snappedCues.push(...filteredCues);

  // ============================================================
  // GARANTIE 8 CUES — Limité à 85% du morceau
  // ============================================================
  const TARGET_CUES = 8;
  const usableDuration = duration * 0.85;
  const interval = usableDuration / (TARGET_CUES + 1);

  for (let i = 1; i <= TARGET_CUES && snappedCues.length < TARGET_CUES; i++) {
    const targetTime = i * interval;
    const snapped = snapToBar(targetTime);

    const tooClose = snappedCues.some(
      (c) => Math.abs(c.time - snapped) < barDur * 2
    );

    if (!tooClose) {
      snappedCues.push({
        time: snapped,
        score: 40,
        name: 'MARQUEUR',
        color: '#00a8ff',
        type: 'cue',
      });
    }
  }

  snappedCues.sort((a, b) => a.time - b.time);

  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  return snappedCues.slice(0, 8).map((cue, i) => ({
    name: `${letters[i]} · ${cue.name}`,
    position: cue.time,
    color: cue.color,
    type: cue.type,
  }));
}

// ============================================================
// ANALYSE COMPLÈTE
// ============================================================
export async function analyzeTrack(
  audioBuffer: AudioBuffer,
  onProgress?: (step: string) => void
): Promise<AnalysisResult> {
  onProgress?.('Détection BPM...');
  const bpm = detectBPM(audioBuffer);

  onProgress?.('Détection tonalité...');
  const { key, camelot } = detectKey(audioBuffer);

  onProgress?.('Détection cue points...');
  const autoCues = detectAutoCues(audioBuffer, bpm);

  onProgress?.('Détection vocals...');
  const vocalSections = detectVocalSections(audioBuffer);

  onProgress?.('Analyse terminée');

  return {
    bpm,
    key,
    camelot,
    duration: audioBuffer.duration,
    autoCues,
    vocalSections,
  };
}