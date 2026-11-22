import * as Meyda from 'meyda';

Meyda.bufferSize = 4096;
Meyda.sampleRate = 44100;
Meyda.windowingFunction = 'hanning';

const sr = 44100;
const signal = new Float32Array(4096);
for (let i = 0; i < 4096; i++) {
  signal[i] = Math.sin(2 * Math.PI * 440 * i / sr);
}

const rms = Meyda.extract('rms', signal);
const chroma = Meyda.extract('chroma', signal);

console.log('rms:', rms);
console.log('chroma type:', typeof chroma, Array.isArray(chroma) ? 'Array' : '');
console.log('chroma length:', chroma && chroma.length);
console.log('chroma:', chroma);

// Test spectralCentroid / autres features dispo
console.log('features dispo test amplitudeSpectrum:', Array.isArray(Meyda.extract('amplitudeSpectrum', signal)));
