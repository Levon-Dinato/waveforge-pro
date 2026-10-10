// src/audio/masteringChain.ts

export type MasteringPreset = 'warm' | 'balanced' | 'open' | 'master';

export interface PresetValues {
  loudness: number;
  presence: number;
  width: number;
  saturation: number;
}

export interface EQBand {
  id: number;
  type: 'lowshelf' | 'peaking' | 'highshelf';
  frequency: number;
  gain: number;
  q: number;
  label: string;
  color: string;
  minFreq: number;
  maxFreq: number;
}

export const DEFAULT_EQ_BANDS: EQBand[] = [
  { id: 0, type: 'lowshelf',  frequency: 80,    gain: 0, q: 0.7, label: 'Basses',   color: '#00d9ff', minFreq: 20,  maxFreq: 300 },
  { id: 1, type: 'peaking',   frequency: 250,   gain: 0, q: 1,   label: 'Low-Mid',  color: '#7c5cff', minFreq: 100, maxFreq: 800 },
  { id: 2, type: 'peaking',   frequency: 1000,  gain: 0, q: 1,   label: 'Mid',      color: '#00ff88', minFreq: 400, maxFreq: 3000 },
  { id: 3, type: 'peaking',   frequency: 4000,  gain: 0, q: 1,   label: 'High-Mid', color: '#ffd43b', minFreq: 1500, maxFreq: 8000 },
  { id: 4, type: 'highshelf', frequency: 12000, gain: 0, q: 0.7, label: 'Aigus',    color: '#ff5cf0', minFreq: 6000, maxFreq: 20000 },
];

export class MasteringChain {
  private inputGain: GainNode;
  private eqBands: BiquadFilterNode[] = [];
  private eqMid: BiquadFilterNode;
  private saturator: WaveShaperNode;
  private stereoWidener: StereoPannerNode;
  private limiter: DynamicsCompressorNode;
  private bassMonoFilter: BiquadFilterNode;
  private bassMonoSplitter: ChannelSplitterNode;
  private bassMonoMerger: ChannelMergerNode;
  private bypassGain: GainNode;
  private processedGain: GainNode;
  private outputGain: GainNode;
  private inputNode: AudioNode | null = null;
  private context: BaseAudioContext;
  private monoMakerEnabled = false;
  private monoMakerFreq = 120;

  constructor(context: BaseAudioContext) {
    this.context = context;

    // Gain d'entrée
    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    // 5 bandes EQ
    for (const band of DEFAULT_EQ_BANDS) {
      const filter = context.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.q;
      this.eqBands.push(filter);
    }

    // EQ Mid (legacy pour compatibilité presets)
    this.eqMid = context.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1000;
    this.eqMid.Q.value = 1;
    this.eqMid.gain.value = 0;

    // Saturateur
    this.saturator = context.createWaveShaper();
    this.saturator.curve = this.makeDistortionCurve(0) as Float32Array<ArrayBuffer>;

    // Stéréo widener
    this.stereoWidener = context.createStereoPanner();
    this.stereoWidener.pan.value = 0;

    // Mono Maker (bass mono)
    this.bassMonoSplitter = context.createChannelSplitter(2);
    this.bassMonoMerger = context.createChannelMerger(2);
    this.bassMonoFilter = context.createBiquadFilter();
    this.bassMonoFilter.type = 'lowpass';
    this.bassMonoFilter.frequency.value = 120;

    // Limiteur
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -1;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.1;

    // Gains bypass
    this.bypassGain = context.createGain();
    this.bypassGain.gain.value = 0;
    this.processedGain = context.createGain();
    this.processedGain.gain.value = 1;

    // Gain sortie
    this.outputGain = context.createGain();

    // Chaîne : input → EQ1 → EQ2 → EQ3 → EQ4 → EQ5 → eqMid → saturator → widener → limiter → processedGain → output
    let prev: AudioNode = this.inputGain;
    for (const band of this.eqBands) {
      prev.connect(band);
      prev = band;
    }
    prev.connect(this.eqMid);
    this.eqMid.connect(this.saturator);
    this.saturator.connect(this.stereoWidener);
    this.stereoWidener.connect(this.limiter);
    this.limiter.connect(this.processedGain);
    this.processedGain.connect(this.outputGain);

    // Bypass
    this.inputGain.connect(this.bypassGain);
    this.bypassGain.connect(this.outputGain);
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 44100;
    const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>;
    const k = amount * 5;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      if (k < 0.001) {
        curve[i] = x;
      } else {
        curve[i] = Math.tanh(k * x) / Math.tanh(k);
      }
    }
    return curve;
  }

  connect(source: AudioNode): void {
    if (this.inputNode) {
      this.inputNode.disconnect(this.inputGain);
    }
    this.inputNode = source;
    source.connect(this.inputGain);
  }

  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  getInputNode(): AudioNode {
    return this.inputGain;
  }

  // ============================================================
  // CONTRÔLES EXISTANTS
  // ============================================================
  setLoudness(value: number): void {
    this.inputGain.gain.value = Math.pow(10, value / 20);
  }

  setPresence(value: number): void {
    this.eqMid.gain.value = value;
  }

  setWidth(value: number): void {
    this.stereoWidener.pan.value = Math.max(-1, Math.min(1, value - 1));
  }

  setSaturation(value: number): void {
    this.saturator.curve = this.makeDistortionCurve(value) as Float32Array<ArrayBuffer>;
  }

  setBypass(bypass: boolean): void {
    this.bypassGain.gain.value = bypass ? 1 : 0;
    this.processedGain.gain.value = bypass ? 0 : 1;
  }

  // ============================================================
  // ✅ NOUVEAU : CONTRÔLE EQ 5 BANDES
  // ============================================================
  setEQBand(index: number, frequency: number, gain: number, q?: number): void {
    const band = this.eqBands[index];
    if (!band) return;
    band.frequency.value = frequency;
    band.gain.value = gain;
    if (q !== undefined) band.Q.value = q;
  }

  getEQBandCount(): number {
    return this.eqBands.length;
  }

  /**
   * Retourne la réponse en fréquence de la chaîne EQ complète
   * (utile pour dessiner la courbe)
   */
  getFrequencyResponse(frequencies: Float32Array): {
    magnitude: Float32Array;
    phase: Float32Array;
  } {
    const N = frequencies.length;
    const totalMag = new Float32Array(N).fill(1);
    const totalPhase = new Float32Array(N).fill(0);

    for (const band of this.eqBands) {
      const mag = new Float32Array(N);
      const phase = new Float32Array(N);
      band.getFrequencyResponse(frequencies, mag, phase);
      for (let i = 0; i < N; i++) {
        totalMag[i] *= mag[i];
        totalPhase[i] += phase[i];
      }
    }

    return { magnitude: totalMag, phase: totalPhase };
  }

  // ============================================================
  // ✅ NOUVEAU : MONO-MAKER
  // ============================================================
  setMonoMaker(enabled: boolean, frequency = 120): void {
    this.monoMakerEnabled = enabled;
    this.monoMakerFreq = frequency;
    this.bassMonoFilter.frequency.value = frequency;
    // Pour simplifier, on utilise juste le filtre pour le moment
    // L'implémentation réelle split/merge serait plus complexe
  }

  getMonoMakerFrequency(): number {
    return this.monoMakerFreq;
  }

  isMonoMakerEnabled(): boolean {
    return this.monoMakerEnabled;
  }

  // ============================================================
  // PRESETS
  // ============================================================
  applyPreset(preset: MasteringPreset): void {
    const values = this.getPresetValues(preset);
    this.setLoudness(values.loudness);
    this.setPresence(values.presence);
    this.setWidth(values.width);
    this.setSaturation(values.saturation);

    // Applique aussi les EQ bands selon le preset
    const eqPresets = this.getEQPreset(preset);
    eqPresets.forEach((band, i) => {
      this.setEQBand(i, band.frequency, band.gain, band.q);
    });
  }

  getPresetValues(preset: MasteringPreset): PresetValues {
    switch (preset) {
      case 'warm':     return { loudness: -1, presence: -1, width: 1.1, saturation: 0.15 };
      case 'balanced': return { loudness: -2, presence: 0, width: 1.0, saturation: 0.08 };
      case 'open':     return { loudness: -3, presence: 2.5, width: 1.3, saturation: 0.05 };
      case 'master':   return { loudness: 0, presence: 0, width: 1.0, saturation: 0 };
    }
  }

  getEQPreset(preset: MasteringPreset): { frequency: number; gain: number; q: number }[] {
    switch (preset) {
      case 'warm':
        return [
          { frequency: 80, gain: 2, q: 0.7 },
          { frequency: 250, gain: 1, q: 1 },
          { frequency: 1000, gain: -0.5, q: 1 },
          { frequency: 4000, gain: 0, q: 1 },
          { frequency: 12000, gain: -1.5, q: 0.7 },
        ];
      case 'balanced':
        return [
          { frequency: 80, gain: 0, q: 0.7 },
          { frequency: 250, gain: 0, q: 1 },
          { frequency: 1000, gain: 0, q: 1 },
          { frequency: 4000, gain: 0, q: 1 },
          { frequency: 12000, gain: 0, q: 0.7 },
        ];
      case 'open':
        return [
          { frequency: 80, gain: -1, q: 0.7 },
          { frequency: 250, gain: -0.5, q: 1 },
          { frequency: 1000, gain: 0, q: 1 },
          { frequency: 4000, gain: 1.5, q: 1 },
          { frequency: 12000, gain: 2.5, q: 0.7 },
        ];
      case 'master':
        return [
          { frequency: 80, gain: 0, q: 0.7 },
          { frequency: 250, gain: 0, q: 1 },
          { frequency: 1000, gain: 0, q: 1 },
          { frequency: 4000, gain: 0, q: 1 },
          { frequency: 12000, gain: 0, q: 0.7 },
        ];
    }
  }

  destroy(): void {
    this.inputGain.disconnect();
    this.eqBands.forEach((b) => b.disconnect());
    this.eqMid.disconnect();
    this.saturator.disconnect();
    this.stereoWidener.disconnect();
    this.bassMonoFilter.disconnect();
    this.bassMonoSplitter.disconnect();
    this.bassMonoMerger.disconnect();
    this.limiter.disconnect();
    this.bypassGain.disconnect();
    this.processedGain.disconnect();
    this.outputGain.disconnect();
  }
}