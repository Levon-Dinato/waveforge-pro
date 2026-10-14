// src/audio/vocalPad.ts

// ============================================================
// NOTES & FORMANTES
// ============================================================
const NOTE_OFFSETS: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
  E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10, B: 11,
};

interface FormantDef {
  freq: number;
  q: number;
  gain: number;
}

// Formantes F1/F2/F3 (Hz) — valeurs classiques de phonétique
const FORMANT_TABLE: Record<string, FormantDef[]> = {
  ah:  [{ freq: 730, q: 8, gain: 1.0 }, { freq: 1090, q: 10, gain: 0.7 }, { freq: 2440, q: 12, gain: 0.3 }],
  oh:  [{ freq: 570, q: 8, gain: 1.0 }, { freq: 840,  q: 10, gain: 0.7 }, { freq: 2410, q: 12, gain: 0.3 }],
  ooh: [{ freq: 300, q: 8, gain: 1.0 }, { freq: 870,  q: 10, gain: 0.7 }, { freq: 2240, q: 12, gain: 0.3 }],
  ee:  [{ freq: 270, q: 8, gain: 1.0 }, { freq: 2290, q: 10, gain: 0.7 }, { freq: 3010, q: 12, gain: 0.3 }],
};

export type VocalVowel = 'ah' | 'oh' | 'ooh' | 'ee';

export interface VocalPadOptions {
  key: string;              // "Am", "C", "F#m", "C minor", ...
  duration: number;         // secondes
  vowel?: VocalVowel;
  intensity?: number;       // 0-1 (niveau du pad avant mix)
  octave?: number;          // défaut 4
}

// ============================================================
// KEY → FREQUENCY
// ============================================================
export function keyToFrequency(key: string, octave: number = 4): number {
  const match = key.match(/^([A-G][#b]?)/);
  const note = match?.[1] || 'C';
  const semitone = NOTE_OFFSETS[note] ?? 0;
  const midiNote = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// ============================================================
// GÉNÉRATION DU PAD VOCAL
// ============================================================
export async function generateVocalPad(
  audioContext: AudioContext,
  options: VocalPadOptions
): Promise<AudioBuffer> {
  const {
    key,
    duration,
    vowel = 'ah',
    intensity = 0.7,
    octave = 4,
  } = options;

  const sampleRate = audioContext.sampleRate;
  const length = Math.ceil(duration * sampleRate);
  const offline = new OfflineAudioContext(1, length, sampleRate);

  const rootFreq = keyToFrequency(key, octave);
  const formants = FORMANT_TABLE[vowel];

  // Master envelope
  const master = offline.createGain();
  const attack = Math.min(1.5, duration * 0.15);
  const release = Math.min(2.5, duration * 0.2);
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(intensity, attack);
  master.gain.setValueAtTime(intensity, Math.max(attack, duration - release));
  master.gain.linearRampToValueAtTime(0, duration);

  // Lowpass pour chaleur
  const lp = offline.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3500;
  lp.Q.value = 0.7;
  lp.connect(master);
  master.connect(offline.destination);

  // Chord : root + quinte + octave
  const chord = [0, 7, 12];
  const detunes = [-8, 0, 8]; // cents

  for (const tone of chord) {
    const toneFreq = rootFreq * Math.pow(2, tone / 12);

    for (const detuneCents of detunes) {
      const osc = offline.createOscillator();
      osc.type = 'sawtooth';
      const detuneRatio = Math.pow(2, detuneCents / 1200);
      const voiceFreq = toneFreq * detuneRatio;
      osc.frequency.value = voiceFreq;

      // Vibrato
      const lfo = offline.createOscillator();
      lfo.frequency.value = 4.5 + Math.random() * 1.5;
      const lfoGain = offline.createGain();
      lfoGain.gain.value = voiceFreq * 0.006;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      // Gain de la voix
      const voiceGain = offline.createGain();
      voiceGain.gain.value = 0.12 / chord.length;
      osc.connect(voiceGain);

      // Banque de formants
      for (const f of formants) {
        const filter = offline.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = f.freq;
        filter.Q.value = f.q;
        const fGain = offline.createGain();
        fGain.gain.value = f.gain;
        voiceGain.connect(filter);
        filter.connect(fGain);
        fGain.connect(lp);
      }

      osc.start(0);
      lfo.start(0);
      osc.stop(duration);
      lfo.stop(duration);
    }
  }

  return await offline.startRendering();
}

// ============================================================
// MIX (préserve le stéréo de l'instrumental)
// ============================================================
export function mixBuffers(
  ctx: BaseAudioContext,
  main: AudioBuffer,
  overlay: AudioBuffer,
  overlayGain: number = 0.5
): AudioBuffer {
  const numChannels = main.numberOfChannels;
  const sampleRate = main.sampleRate;
  const length = main.length;
  const output = ctx.createBuffer(numChannels, length, sampleRate);
  const overlayData = overlay.getChannelData(0);
  const ratio = overlay.sampleRate / sampleRate;

  for (let ch = 0; ch < numChannels; ch++) {
    const out = output.getChannelData(ch);
    const mainData = main.getChannelData(ch);
    for (let i = 0; i < mainData.length; i++) out[i] = mainData[i];

    // Pad mono → ajouté aux 2 canaux (centré)
    for (let i = 0; i < overlayData.length; i++) {
      const j = Math.floor(i / ratio);
      if (j >= out.length) break;
      out[j] += overlayData[i] * overlayGain;
    }

    // Soft clip (tanh) pour éviter le clipping brutal
    for (let i = 0; i < out.length; i++) {
      out[i] = Math.tanh(out[i]);
    }
  }

  return output;
}

// ============================================================
// HIGH-LEVEL : ajoute le pad vocal à un blob instrumental
// ============================================================
export async function addVocalPadToBlob(
  audioContext: AudioContext,
  instrumentalBlob: Blob,
  options: {
    key: string;
    vowel?: VocalVowel;
    level?: number; // niveau du pad dans le mix (0-1), défaut 0.35
  }
): Promise<Blob> {
  const arrBuf = await instrumentalBlob.arrayBuffer();
  const instrumental = await audioContext.decodeAudioData(arrBuf.slice(0));

  const vocalPad = await generateVocalPad(audioContext, {
    key: options.key,
    vowel: options.vowel ?? 'ah',
    duration: instrumental.duration,
    intensity: 0.7,
  });

  const mixed = mixBuffers(
    audioContext,
    instrumental,
    vocalPad,
    options.level ?? 0.35
  );

  return encodeWavBlob(mixed);
}

// ============================================================
// WAV ENCODER (16-bit PCM, mono ou stéréo)
// ============================================================
function encodeWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = length * blockAlign;
  const bufferLength = 44 + dataLength;
  const arr = new ArrayBuffer(bufferLength);
  const view = new DataView(arr);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arr], { type: 'audio/wav' });
}