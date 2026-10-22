// src/utils/audioAnalyzer.ts
export interface WaveformData {
  low: Float32Array;
  mid: Float32Array;
  high: Float32Array;
  max: number;
}

export const analyzeAudio = async (audioBuffer: AudioBuffer): Promise<WaveformData> => {
  const FPS = 100; // 100 points par seconde
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const step = Math.floor(sampleRate / FPS);
  const numFrames = Math.floor(length / step);

  const renderFilter = async (filterType: BiquadFilterType, frequency: number, Q = 0.7) => {
    const ctx = new OfflineAudioContext(1, length, sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = Q;
    src.connect(filter);
    filter.connect(ctx.destination);
    src.start();
    const rendered = await ctx.startRendering();
    return rendered.getChannelData(0);
  };

  const [lowData, midData, highData] = await Promise.all([
    renderFilter('lowpass', 250),
    renderFilter('bandpass', 1000, 1),
    renderFilter('highpass', 4000)
  ]);

  const lowArr = new Float32Array(numFrames);
  const midArr = new Float32Array(numFrames);
  const highArr = new Float32Array(numFrames);
  let maxVal = 0.01;

  for (let i = 0; i < numFrames; i++) {
    const start = i * step;
    let lowSum = 0, midSum = 0, highSum = 0;

    for (let j = 0; j < step; j++) {
      const idx = start + j;
      lowSum += lowData[idx] * lowData[idx];
      midSum += midData[idx] * midData[idx];
      highSum += highData[idx] * highData[idx];
    }

    lowArr[i] = Math.sqrt(lowSum / step);
    midArr[i] = Math.sqrt(midSum / step);
    highArr[i] = Math.sqrt(highSum / step);

    const total = lowArr[i] + midArr[i] + highArr[i];
    if (total > maxVal) maxVal = total;
  }

  for (let i = 0; i < numFrames; i++) {
    lowArr[i] /= maxVal;
    midArr[i] /= maxVal;
    highArr[i] /= maxVal;
  }

  return { low: lowArr, mid: midArr, high: highArr, max: maxVal };
};