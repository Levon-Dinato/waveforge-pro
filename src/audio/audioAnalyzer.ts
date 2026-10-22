// src/utils/audioAnalyzer.ts
export interface WaveformData {
  low: Float32Array;
  mid: Float32Array;
  high: Float32Array;
  max: number;
}

export const analyzeAudio = async (audioBuffer: AudioBuffer): Promise<WaveformData> => {
  const FPS = 100; // Résolution (100 points par seconde)
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const step = Math.floor(sampleRate / FPS);
  const numFrames = Math.floor(length / step);

  // Création des buffers pour isoler les fréquences
  const offlineCtx = new OfflineAudioContext(1, length, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  const lowFilter = offlineCtx.createBiquadFilter();
  lowFilter.type = 'lowpass';
  lowFilter.frequency.value = 250;

  const midFilter = offlineCtx.createBiquadFilter();
  midFilter.type = 'bandpass';
  midFilter.frequency.value = 1000;
  midFilter.Q.value = 1;

  const highFilter = offlineCtx.createBiquadFilter();
  highFilter.type = 'highpass';
  highFilter.frequency.value = 4000;

  // Splitter en 3 canaux
  const splitter = offlineCtx.createChannelSplitter(3);
  source.connect(lowFilter); source.connect(midFilter); source.connect(highFilter);
  
  // On doit rendre l'audio pour chaque filtre (simplifié ici pour la performance)
  // En production, on utiliserait un seul graphe avec un splitter vers 3 gain nodes
  // Pour simplifier le code, on fait 3 rendus séparés (un peu plus long au chargement mais très stable)
  
  const renderFilter = async (filter: BiquadFilterNode) => {
    const ctx = new OfflineAudioContext(1, length, sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(filter);
    filter.connect(ctx.destination);
    src.start();
    const rendered = await ctx.startRendering();
    return rendered.getChannelData(0);
  };

  const [lowData, midData, highData] = await Promise.all([
    renderFilter(lowFilter),
    renderFilter(midFilter),
    renderFilter(highFilter)
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

    const lowRms = Math.sqrt(lowSum / step);
    const midRms = Math.sqrt(midSum / step);
    const highRms = Math.sqrt(highSum / step);

    lowArr[i] = lowRms;
    midArr[i] = midRms;
    highArr[i] = highRms;

    const total = lowRms + midRms + highRms;
    if (total > maxVal) maxVal = total;
  }

  // Normalisation
  for (let i = 0; i < numFrames; i++) {
    lowArr[i] /= maxVal;
    midArr[i] /= maxVal;
    highArr[i] /= maxVal;
  }

  return { low: lowArr, mid: midArr, high: highArr, max: maxVal };
};