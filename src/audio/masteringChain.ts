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
  { id: 0, type: 'lowshelf',  frequency: 80,    gain: 0, q: 0.7, label: 'Basses',   color: '#00d9ff', minFreq: 20,   maxFreq: 300 },
  { id: 1, type: 'peaking',   frequency: 250,   gain: 0, q: 1,   label: 'Low-Mid',  color: '#7c5cff', minFreq: 100,  maxFreq: 800 },
  { id: 2, type: 'peaking',   frequency: 1000,  gain: 0, q: 1,   label: 'Mid',      color: '#00ff88', minFreq: 400,  maxFreq: 3000 },
  { id: 3, type: 'peaking',   frequency: 4000,  gain: 0, q: 1,   label: 'High-Mid', color: '#ffd43b', minFreq: 1500, maxFreq: 8000 },
  { id: 4, type: 'highshelf', frequency: 12000, gain: 0, q: 0.7, label: 'Aigus',    color: '#ff5cf0', minFreq: 6000, maxFreq: 20000 },
];

export class MasteringChain {
  // EQ
  private inputGain: GainNode;
  private eqBands: BiquadFilterNode[] = [];
  private eqMid: BiquadFilterNode;
  private saturator: WaveShaperNode;
  private stereoWidener: StereoPannerNode;

  // Mono-Maker
  private monoMakerInput: GainNode;
  private monoMakerOutput: GainNode;
  private monoMakerSplitter: ChannelSplitterNode;
  private monoMakerMerger: ChannelMergerNode;
  private monoMakerBassL: BiquadFilterNode;
  private monoMakerBassR: BiquadFilterNode;
  private monoMakerHighL: BiquadFilterNode;
  private monoMakerHighR: BiquadFilterNode;
  private monoMakerBassGainL: GainNode;
  private monoMakerBassGainR: GainNode;
  private monoMakerBassMono: GainNode;
  private monoMakerMixL: GainNode;
  private monoMakerMixR: GainNode;
  private monoMakerWetGain: GainNode;
  private monoMakerDryGain: GainNode;
  private monoMakerFreq = 120;
  private monoMakerEnabled = false;

  // Imager 3 bandes
  private imagerInput: GainNode;
  private imagerOutput: GainNode;
  private imagerWetGain: GainNode;
  private imagerDryGain: GainNode;
  // Basses
  private imagerLowFilter: BiquadFilterNode;
  private imagerLowSplitter: ChannelSplitterNode;
  private imagerLowMerger: ChannelMergerNode;
  private imagerLowDryL: GainNode;
  private imagerLowDryR: GainNode;
  private imagerLowMonoSum: GainNode;
  private imagerLowMonoGain: GainNode;
  // Mids
  private imagerMidFilter: BiquadFilterNode;
  private imagerMidSplitter: ChannelSplitterNode;
  private imagerMidMerger: ChannelMergerNode;
  private imagerMidDryL: GainNode;
  private imagerMidDryR: GainNode;
  private imagerMidMonoSum: GainNode;
  private imagerMidMonoGain: GainNode;
  // Aigus
  private imagerHighFilter: BiquadFilterNode;
  private imagerHighSplitter: ChannelSplitterNode;
  private imagerHighMerger: ChannelMergerNode;
  private imagerHighDryL: GainNode;
  private imagerHighDryR: GainNode;
  private imagerHighMonoSum: GainNode;
  private imagerHighMonoGain: GainNode;
  private imagerEnabled = false;

  // Limiteur & sortie
  private limiter: DynamicsCompressorNode;
  private bypassGain: GainNode;
  private processedGain: GainNode;
  private outputGain: GainNode;
  private inputNode: AudioNode | null = null;
  private context: BaseAudioContext;

  constructor(context: BaseAudioContext) {
    this.context = context;

    // ============================================================
    // 1. Gain d'entrée
    // ============================================================
    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    // ============================================================
    // 2. EQ 5 bandes
    // ============================================================
    for (const band of DEFAULT_EQ_BANDS) {
      const filter = context.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = band.q;
      this.eqBands.push(filter);
    }

    // EQ Mid legacy
    this.eqMid = context.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1000;
    this.eqMid.Q.value = 1;
    this.eqMid.gain.value = 0;

    // ============================================================
    // 3. Saturateur
    // ============================================================
    this.saturator = context.createWaveShaper();
    this.saturator.curve = this.makeDistortionCurve(0) as Float32Array<ArrayBuffer>;

    // ============================================================
    // 4. Stéréo Widener
    // ============================================================
    this.stereoWidener = context.createStereoPanner();
    this.stereoWidener.pan.value = 0;

    // ============================================================
    // 5. IMAGER 3 BANDES
    // ============================================================
    this.imagerInput = context.createGain();
    this.imagerOutput = context.createGain();
    this.imagerWetGain = context.createGain();
    this.imagerWetGain.gain.value = 0;
    this.imagerDryGain = context.createGain();
    this.imagerDryGain.gain.value = 1;

    // Basses (lowpass 200Hz)
    this.imagerLowFilter = context.createBiquadFilter();
    this.imagerLowFilter.type = 'lowpass';
    this.imagerLowFilter.frequency.value = 200;
    this.imagerLowFilter.Q.value = 0.7;
    this.imagerLowSplitter = context.createChannelSplitter(2);
    this.imagerLowMerger = context.createChannelMerger(2);
    this.imagerLowDryL = context.createGain();
    this.imagerLowDryL.gain.value = 1;
    this.imagerLowDryR = context.createGain();
    this.imagerLowDryR.gain.value = 1;
    this.imagerLowMonoSum = context.createGain();
    this.imagerLowMonoSum.gain.value = 0.5;
    this.imagerLowMonoGain = context.createGain();
    this.imagerLowMonoGain.gain.value = 0;

    // Mids (bandpass ~1kHz)
    this.imagerMidFilter = context.createBiquadFilter();
    this.imagerMidFilter.type = 'bandpass';
    this.imagerMidFilter.frequency.value = 1000;
    this.imagerMidFilter.Q.value = 0.5;
    this.imagerMidSplitter = context.createChannelSplitter(2);
    this.imagerMidMerger = context.createChannelMerger(2);
    this.imagerMidDryL = context.createGain();
    this.imagerMidDryL.gain.value = 1;
    this.imagerMidDryR = context.createGain();
    this.imagerMidDryR.gain.value = 1;
    this.imagerMidMonoSum = context.createGain();
    this.imagerMidMonoSum.gain.value = 0.5;
    this.imagerMidMonoGain = context.createGain();
    this.imagerMidMonoGain.gain.value = 0;

    // Aigus (highpass 4kHz)
    this.imagerHighFilter = context.createBiquadFilter();
    this.imagerHighFilter.type = 'highpass';
    this.imagerHighFilter.frequency.value = 4000;
    this.imagerHighFilter.Q.value = 0.7;
    this.imagerHighSplitter = context.createChannelSplitter(2);
    this.imagerHighMerger = context.createChannelMerger(2);
    this.imagerHighDryL = context.createGain();
    this.imagerHighDryL.gain.value = 1;
    this.imagerHighDryR = context.createGain();
    this.imagerHighDryR.gain.value = 1;
    this.imagerHighMonoSum = context.createGain();
    this.imagerHighMonoSum.gain.value = 0.5;
    this.imagerHighMonoGain = context.createGain();
    this.imagerHighMonoGain.gain.value = 0;

    // Connexions Imager
    this.imagerInput.connect(this.imagerDryGain);
    this.imagerDryGain.connect(this.imagerOutput);

    // Basses
    this.imagerInput.connect(this.imagerLowFilter);
    this.imagerLowFilter.connect(this.imagerLowSplitter);
    this.imagerLowSplitter.connect(this.imagerLowDryL, 0);
    this.imagerLowSplitter.connect(this.imagerLowDryR, 1);
    this.imagerLowDryL.connect(this.imagerLowMerger, 0, 0);
    this.imagerLowDryR.connect(this.imagerLowMerger, 0, 1);
    this.imagerLowSplitter.connect(this.imagerLowMonoSum, 0);
    this.imagerLowSplitter.connect(this.imagerLowMonoSum, 1);
    this.imagerLowMonoSum.connect(this.imagerLowMonoGain);
    this.imagerLowMonoGain.connect(this.imagerLowMerger, 0, 0);
    this.imagerLowMonoGain.connect(this.imagerLowMerger, 0, 1);
    this.imagerLowMerger.connect(this.imagerWetGain);

    // Mids
    this.imagerInput.connect(this.imagerMidFilter);
    this.imagerMidFilter.connect(this.imagerMidSplitter);
    this.imagerMidSplitter.connect(this.imagerMidDryL, 0);
    this.imagerMidSplitter.connect(this.imagerMidDryR, 1);
    this.imagerMidDryL.connect(this.imagerMidMerger, 0, 0);
    this.imagerMidDryR.connect(this.imagerMidMerger, 0, 1);
    this.imagerMidSplitter.connect(this.imagerMidMonoSum, 0);
    this.imagerMidSplitter.connect(this.imagerMidMonoSum, 1);
    this.imagerMidMonoSum.connect(this.imagerMidMonoGain);
    this.imagerMidMonoGain.connect(this.imagerMidMerger, 0, 0);
    this.imagerMidMonoGain.connect(this.imagerMidMerger, 0, 1);
    this.imagerMidMerger.connect(this.imagerWetGain);

    // Aigus
    this.imagerInput.connect(this.imagerHighFilter);
    this.imagerHighFilter.connect(this.imagerHighSplitter);
    this.imagerHighSplitter.connect(this.imagerHighDryL, 0);
    this.imagerHighSplitter.connect(this.imagerHighDryR, 1);
    this.imagerHighDryL.connect(this.imagerHighMerger, 0, 0);
    this.imagerHighDryR.connect(this.imagerHighMerger, 0, 1);
    this.imagerHighSplitter.connect(this.imagerHighMonoSum, 0);
    this.imagerHighSplitter.connect(this.imagerHighMonoSum, 1);
    this.imagerHighMonoSum.connect(this.imagerHighMonoGain);
    this.imagerHighMonoGain.connect(this.imagerHighMerger, 0, 0);
    this.imagerHighMonoGain.connect(this.imagerHighMerger, 0, 1);
    this.imagerHighMerger.connect(this.imagerWetGain);

    // Wet → Output
    this.imagerWetGain.connect(this.imagerOutput);

    // ============================================================
    // 6. MONO-MAKER
    // ============================================================
    this.monoMakerInput = context.createGain();
    this.monoMakerOutput = context.createGain();
    this.monoMakerSplitter = context.createChannelSplitter(2);
    this.monoMakerMerger = context.createChannelMerger(2);

    this.monoMakerBassL = context.createBiquadFilter();
    this.monoMakerBassL.type = 'lowpass';
    this.monoMakerBassL.frequency.value = this.monoMakerFreq;
    this.monoMakerBassL.Q.value = 0.7;

    this.monoMakerBassR = context.createBiquadFilter();
    this.monoMakerBassR.type = 'lowpass';
    this.monoMakerBassR.frequency.value = this.monoMakerFreq;
    this.monoMakerBassR.Q.value = 0.7;

    this.monoMakerBassGainL = context.createGain();
    this.monoMakerBassGainL.gain.value = 0.5;
    this.monoMakerBassGainR = context.createGain();
    this.monoMakerBassGainR.gain.value = 0.5;

    this.monoMakerBassMono = context.createGain();
    this.monoMakerBassMono.gain.value = 1;

    this.monoMakerHighL = context.createBiquadFilter();
    this.monoMakerHighL.type = 'highpass';
    this.monoMakerHighL.frequency.value = this.monoMakerFreq;
    this.monoMakerHighL.Q.value = 0.7;

    this.monoMakerHighR = context.createBiquadFilter();
    this.monoMakerHighR.type = 'highpass';
    this.monoMakerHighR.frequency.value = this.monoMakerFreq;
    this.monoMakerHighR.Q.value = 0.7;

    this.monoMakerMixL = context.createGain();
    this.monoMakerMixL.gain.value = 1;
    this.monoMakerMixR = context.createGain();
    this.monoMakerMixR.gain.value = 1;

    this.monoMakerWetGain = context.createGain();
    this.monoMakerWetGain.gain.value = 0;
    this.monoMakerDryGain = context.createGain();
    this.monoMakerDryGain.gain.value = 1;

    // Connexions Mono-Maker
    this.monoMakerInput.connect(this.monoMakerSplitter);
    this.monoMakerInput.connect(this.monoMakerDryGain);
    this.monoMakerDryGain.connect(this.monoMakerOutput);

    this.monoMakerSplitter.connect(this.monoMakerBassL, 0);
    this.monoMakerBassL.connect(this.monoMakerBassGainL);
    this.monoMakerBassGainL.connect(this.monoMakerBassMono);

    this.monoMakerSplitter.connect(this.monoMakerBassR, 1);
    this.monoMakerBassR.connect(this.monoMakerBassGainR);
    this.monoMakerBassGainR.connect(this.monoMakerBassMono);

    this.monoMakerSplitter.connect(this.monoMakerHighL, 0);
    this.monoMakerHighL.connect(this.monoMakerMixL);

    this.monoMakerSplitter.connect(this.monoMakerHighR, 1);
    this.monoMakerHighR.connect(this.monoMakerMixR);

    this.monoMakerBassMono.connect(this.monoMakerMixL);
    this.monoMakerBassMono.connect(this.monoMakerMixR);

    this.monoMakerMixL.connect(this.monoMakerMerger, 0, 0);
    this.monoMakerMixR.connect(this.monoMakerMerger, 0, 1);

    this.monoMakerMerger.connect(this.monoMakerWetGain);
    this.monoMakerWetGain.connect(this.monoMakerOutput);

    // ============================================================
    // 7. Limiteur
    // ============================================================
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -1;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.1;

    // ============================================================
    // 8. Bypass & gains
    // ============================================================
    this.bypassGain = context.createGain();
    this.bypassGain.gain.value = 0;
    this.processedGain = context.createGain();
    this.processedGain.gain.value = 1;
    this.outputGain = context.createGain();

    // ============================================================
    // 9. Chaîne principale
    // ============================================================
    // input → EQ1..5 → eqMid → saturator → widener → IMAGER → MONO-MAKER → limiter → processedGain → output
    let prev: AudioNode = this.inputGain;
    for (const band of this.eqBands) {
      prev.connect(band);
      prev = band;
    }
    prev.connect(this.eqMid);
    this.eqMid.connect(this.saturator);
    this.saturator.connect(this.stereoWidener);
    this.stereoWidener.connect(this.imagerInput);
    this.imagerOutput.connect(this.monoMakerInput);
    this.monoMakerOutput.connect(this.limiter);
    this.limiter.connect(this.processedGain);
    this.processedGain.connect(this.outputGain);

    // Bypass complet
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

  getOutputNode(): AudioNode { return this.outputGain; }
  getInputNode(): AudioNode { return this.inputGain; }

  // ============================================================
  // CONTRÔLES PRINCIPAUX
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
  // EQ 5 BANDES
  // ============================================================
  setEQBand(index: number, frequency: number, gain: number, q?: number): void {
    const band = this.eqBands[index];
    if (!band) return;
    band.frequency.value = frequency;
    band.gain.value = gain;
    if (q !== undefined) band.Q.value = q;
  }

  getEQBandCount(): number { return this.eqBands.length; }

  // ============================================================
  // MONO-MAKER
  // ============================================================
  setMonoMaker(enabled: boolean, frequency?: number): void {
    this.monoMakerEnabled = enabled;
    if (frequency !== undefined) {
      this.monoMakerFreq = frequency;
      this.monoMakerBassL.frequency.value = frequency;
      this.monoMakerBassR.frequency.value = frequency;
      this.monoMakerHighL.frequency.value = frequency;
      this.monoMakerHighR.frequency.value = frequency;
    }

    const now = this.context.currentTime;
    if (enabled) {
      this.monoMakerWetGain.gain.setTargetAtTime(1, now, 0.02);
      this.monoMakerDryGain.gain.setTargetAtTime(0, now, 0.02);
    } else {
      this.monoMakerWetGain.gain.setTargetAtTime(0, now, 0.02);
      this.monoMakerDryGain.gain.setTargetAtTime(1, now, 0.02);
    }
  }

  isMonoMakerEnabled(): boolean { return this.monoMakerEnabled; }
  getMonoMakerFrequency(): number { return this.monoMakerFreq; }

  // ============================================================
  // IMAGER 3 BANDES
  // ============================================================
  setImager(enabled: boolean, lowAmount?: number, midAmount?: number, highAmount?: number): void {
    this.imagerEnabled = enabled;

    if (lowAmount !== undefined) {
      this.imagerLowDryL.gain.value = 1 - lowAmount;
      this.imagerLowDryR.gain.value = 1 - lowAmount;
      this.imagerLowMonoGain.gain.value = lowAmount;
    }
    if (midAmount !== undefined) {
      this.imagerMidDryL.gain.value = 1 - midAmount;
      this.imagerMidDryR.gain.value = 1 - midAmount;
      this.imagerMidMonoGain.gain.value = midAmount;
    }
    if (highAmount !== undefined) {
      this.imagerHighDryL.gain.value = 1 - highAmount;
      this.imagerHighDryR.gain.value = 1 - highAmount;
      this.imagerHighMonoGain.gain.value = highAmount;
    }

    const now = this.context.currentTime;
    if (enabled) {
      this.imagerWetGain.gain.setTargetAtTime(1, now, 0.02);
      this.imagerDryGain.gain.setTargetAtTime(0, now, 0.02);
    } else {
      this.imagerWetGain.gain.setTargetAtTime(0, now, 0.02);
      this.imagerDryGain.gain.setTargetAtTime(1, now, 0.02);
    }
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

    const eqPreset = this.getEQPreset(preset);
    eqPreset.forEach((band, i) => {
      this.setEQBand(i, band.frequency, band.gain, band.q);
    });

    if (preset === 'warm' || preset === 'balanced') {
      this.setMonoMaker(true, 120);
    } else {
      this.setMonoMaker(false);
    }
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
    // EQ
    this.inputGain.disconnect();
    this.eqBands.forEach((b) => b.disconnect());
    this.eqMid.disconnect();
    this.saturator.disconnect();
    this.stereoWidener.disconnect();

    // Imager
    this.imagerInput.disconnect();
    this.imagerOutput.disconnect();
    this.imagerWetGain.disconnect();
    this.imagerDryGain.disconnect();
    this.imagerLowFilter.disconnect();
    this.imagerLowSplitter.disconnect();
    this.imagerLowMerger.disconnect();
    this.imagerLowDryL.disconnect();
    this.imagerLowDryR.disconnect();
    this.imagerLowMonoSum.disconnect();
    this.imagerLowMonoGain.disconnect();
    this.imagerMidFilter.disconnect();
    this.imagerMidSplitter.disconnect();
    this.imagerMidMerger.disconnect();
    this.imagerMidDryL.disconnect();
    this.imagerMidDryR.disconnect();
    this.imagerMidMonoSum.disconnect();
    this.imagerMidMonoGain.disconnect();
    this.imagerHighFilter.disconnect();
    this.imagerHighSplitter.disconnect();
    this.imagerHighMerger.disconnect();
    this.imagerHighDryL.disconnect();
    this.imagerHighDryR.disconnect();
    this.imagerHighMonoSum.disconnect();
    this.imagerHighMonoGain.disconnect();

    // Mono-Maker
    this.monoMakerInput.disconnect();
    this.monoMakerOutput.disconnect();
    this.monoMakerSplitter.disconnect();
    this.monoMakerMerger.disconnect();
    this.monoMakerBassL.disconnect();
    this.monoMakerBassR.disconnect();
    this.monoMakerHighL.disconnect();
    this.monoMakerHighR.disconnect();
    this.monoMakerBassGainL.disconnect();
    this.monoMakerBassGainR.disconnect();
    this.monoMakerBassMono.disconnect();
    this.monoMakerMixL.disconnect();
    this.monoMakerMixR.disconnect();
    this.monoMakerWetGain.disconnect();
    this.monoMakerDryGain.disconnect();

    // Limiteur & sortie
    this.limiter.disconnect();
    this.bypassGain.disconnect();
    this.processedGain.disconnect();
    this.outputGain.disconnect();
  }
}