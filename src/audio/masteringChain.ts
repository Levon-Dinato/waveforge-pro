// src/audio/masteringChain.ts

export type MasteringPreset = 'universal' | 'fire' | 'clarity' | 'cassette' | 'natural' | 'spatial' | 'cinematic' | 'punch';

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

export class LUFSMeter {
  private ctx: BaseAudioContext;
  private kHS: BiquadFilterNode;
  private kHP: BiquadFilterNode;
  private analyser: AnalyserNode;
  private silence: GainNode;
  private buf: Float32Array<ArrayBuffer>;
  private sampleHistory: number[] = [];
  private lastUpdate = 0;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    this.kHS = ctx.createBiquadFilter(); this.kHS.type = 'highshelf'; this.kHS.frequency.value = 1500; this.kHS.gain.value = 4;
    this.kHP = ctx.createBiquadFilter(); this.kHP.type = 'highpass'; this.kHP.frequency.value = 38; this.kHP.Q.value = 0.5;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 2048;
    this.buf = new Float32Array(2048) as Float32Array<ArrayBuffer>;
    this.silence = ctx.createGain(); this.silence.gain.value = 0;
    this.kHS.connect(this.kHP); this.kHP.connect(this.analyser); this.analyser.connect(this.silence); this.silence.connect(ctx.destination);
  }

  getInput(): AudioNode { return this.kHS; }

  read(): { momentary: number; shortTerm: number; integrated: number } {
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
    const rms = Math.sqrt(sum / this.buf.length);
    const momentary = -0.691 + 20 * Math.log10(rms + 1e-10);
    const now = this.ctx.currentTime;
    if (now - this.lastUpdate > 0.1) { this.sampleHistory.push(momentary); if (this.sampleHistory.length > 400) this.sampleHistory.shift(); this.lastUpdate = now; }
    const recent = this.sampleHistory.slice(-30);
    const shortTerm = recent.length > 0 ? -0.691 + 10 * Math.log10(recent.reduce((s, v) => s + Math.pow(10, (v + 0.691) / 10), 0) / recent.length) : -Infinity;
    const above70 = this.sampleHistory.filter(v => v > -70);
    let integrated = -Infinity;
    if (above70.length > 0) {
      const absLufs = -0.691 + 10 * Math.log10(above70.reduce((s, v) => s + Math.pow(10, (v + 0.691) / 10), 0) / above70.length);
      const threshold = absLufs - 10;
      const aboveRel = above70.filter(v => v > threshold);
      if (aboveRel.length > 0) integrated = -0.691 + 10 * Math.log10(aboveRel.reduce((s, v) => s + Math.pow(10, (v + 0.691) / 10), 0) / aboveRel.length);
    }
    return { momentary, shortTerm, integrated };
  }

  destroy(): void {
    try { this.kHS.disconnect(); } catch {}
    try { this.kHP.disconnect(); } catch {}
    try { this.analyser.disconnect(); } catch {}
    try { this.silence.disconnect(); } catch {}
  }
}

export class MasteringChain {
  private inputGain: GainNode;
  private eqBands: BiquadFilterNode[] = [];
  private eqMid: BiquadFilterNode;
  private saturator: WaveShaperNode;
  private widenerInput: GainNode; private widenerOutput: GainNode;
  private widenerSplitter: ChannelSplitterNode; private widenerMerger: ChannelMergerNode;
  private widenerMidL: GainNode; private widenerMidR: GainNode; private widenerMidSum: GainNode;
  private widenerSideL: GainNode; private widenerSideR: GainNode; private widenerSideSum: GainNode;
  private widenerMidToL: GainNode; private widenerMidToR: GainNode; private widenerSideToL: GainNode; private widenerSideToR: GainNode;
  private monoMakerInput: GainNode; private monoMakerOutput: GainNode;
  private monoMakerSplitter: ChannelSplitterNode; private monoMakerMerger: ChannelMergerNode;
  private monoMakerBassL: BiquadFilterNode; private monoMakerBassR: BiquadFilterNode; private monoMakerHighL: BiquadFilterNode; private monoMakerHighR: BiquadFilterNode;
  private monoMakerBassGainL: GainNode; private monoMakerBassGainR: GainNode; private monoMakerBassMono: GainNode;
  private monoMakerMixL: GainNode; private monoMakerMixR: GainNode; private monoMakerWetGain: GainNode; private monoMakerDryGain: GainNode;
  private monoMakerFreq = 120; private monoMakerEnabled = false;
  private imagerInput: GainNode; private imagerOutput: GainNode; private imagerWetGain: GainNode; private imagerDryGain: GainNode;
  private imagerLowFilter: BiquadFilterNode; private imagerLowSplitter: ChannelSplitterNode; private imagerLowMerger: ChannelMergerNode;
  private imagerLowDryL: GainNode; private imagerLowDryR: GainNode; private imagerLowMonoSum: GainNode; private imagerLowMonoGain: GainNode;
  private imagerMidFilter: BiquadFilterNode; private imagerMidSplitter: ChannelSplitterNode; private imagerMidMerger: ChannelMergerNode;
  private imagerMidDryL: GainNode; private imagerMidDryR: GainNode; private imagerMidMonoSum: GainNode; private imagerMidMonoGain: GainNode;
  private imagerHighFilter: BiquadFilterNode; private imagerHighSplitter: ChannelSplitterNode; private imagerHighMerger: ChannelMergerNode;
  private imagerHighDryL: GainNode; private imagerHighDryR: GainNode; private imagerHighMonoSum: GainNode; private imagerHighMonoGain: GainNode;
  private compressor: DynamicsCompressorNode; private compressorMakeup: GainNode;
  private exciterHighShelf: BiquadFilterNode; private exciterDrive: WaveShaperNode; private exciterWetGain: GainNode; private exciterDryGain: GainNode;
  private subBassFilter: BiquadFilterNode; private bassShelf: BiquadFilterNode; private subBassGain: GainNode; private airShelf: BiquadFilterNode;
  private limiter: DynamicsCompressorNode; private finalClip: WaveShaperNode;
  private bypassGain: GainNode; private processedGain: GainNode; private outputGain: GainNode;
  private inputNode: AudioNode | null = null; private context: BaseAudioContext;
  private curveCache = new Map<string, Float32Array<ArrayBuffer>>();

  constructor(context: BaseAudioContext) {
    this.context = context;
    this.inputGain = context.createGain(); this.inputGain.gain.value = 1;
    for (const band of DEFAULT_EQ_BANDS) {
      const filter = context.createBiquadFilter();
      filter.type = band.type; filter.frequency.value = band.frequency; filter.gain.value = band.gain; filter.Q.value = band.q;
      this.eqBands.push(filter);
    }
    this.eqMid = context.createBiquadFilter(); this.eqMid.type = 'peaking'; this.eqMid.frequency.value = 1000; this.eqMid.Q.value = 1; this.eqMid.gain.value = 0;
    
    // Saturation très légère (pour éviter le métal)
    this.saturator = context.createWaveShaper(); this.saturator.curve = this.makeDistortionCurve(0.05) as any; this.saturator.oversample = '4x';
    
    this.widenerInput = context.createGain(); this.widenerOutput = context.createGain();
    this.widenerSplitter = context.createChannelSplitter(2); this.widenerMerger = context.createChannelMerger(2);
    this.widenerMidL = context.createGain(); this.widenerMidL.gain.value = 0.5; this.widenerMidR = context.createGain(); this.widenerMidR.gain.value = 0.5;
    this.widenerMidSum = context.createGain(); this.widenerMidSum.gain.value = 1; this.widenerSideL = context.createGain(); this.widenerSideL.gain.value = 0.5;
    this.widenerSideR = context.createGain(); this.widenerSideR.gain.value = -0.5; this.widenerSideSum = context.createGain(); this.widenerSideSum.gain.value = 1;
    this.widenerMidToL = context.createGain(); this.widenerMidToL.gain.value = 1; this.widenerMidToR = context.createGain(); this.widenerMidToR.gain.value = 1;
    this.widenerSideToL = context.createGain(); this.widenerSideToL.gain.value = 0; this.widenerSideToR = context.createGain(); this.widenerSideToR.gain.value = 0;
    this.widenerInput.connect(this.widenerSplitter); this.widenerSplitter.connect(this.widenerMidL, 0); this.widenerSplitter.connect(this.widenerMidR, 1);
    this.widenerMidL.connect(this.widenerMidSum); this.widenerMidR.connect(this.widenerMidSum);
    this.widenerSplitter.connect(this.widenerSideL, 0); this.widenerSplitter.connect(this.widenerSideR, 1);
    this.widenerSideL.connect(this.widenerSideSum); this.widenerSideR.connect(this.widenerSideSum);
    this.widenerMidSum.connect(this.widenerMidToL); this.widenerMidSum.connect(this.widenerMidToR);
    this.widenerMidToL.connect(this.widenerMerger, 0, 0); this.widenerMidToR.connect(this.widenerMerger, 0, 1);
    this.widenerSideSum.connect(this.widenerSideToL); this.widenerSideSum.connect(this.widenerSideToR);
    this.widenerSideToL.connect(this.widenerMerger, 0, 0); this.widenerSideToR.connect(this.widenerMerger, 0, 1);
    this.widenerMerger.connect(this.widenerOutput);

    this.imagerInput = context.createGain(); this.imagerOutput = context.createGain();
    this.imagerWetGain = context.createGain(); this.imagerWetGain.gain.value = 0; this.imagerDryGain = context.createGain(); this.imagerDryGain.gain.value = 1;
    const createImagerBand = (filter: BiquadFilterNode, dryL: GainNode, dryR: GainNode, monoSum: GainNode, monoGain: GainNode, merger: ChannelMergerNode, splitter: ChannelSplitterNode) => {
      this.imagerInput.connect(filter); filter.connect(splitter); splitter.connect(dryL, 0); splitter.connect(dryR, 1); dryL.connect(merger, 0, 0); dryR.connect(merger, 0, 1);
      splitter.connect(monoSum, 0); splitter.connect(monoSum, 1); monoSum.connect(monoGain); monoGain.connect(merger, 0, 0); monoGain.connect(merger, 0, 1); merger.connect(this.imagerWetGain);
    };
    this.imagerLowFilter = context.createBiquadFilter(); this.imagerLowFilter.type = 'lowpass'; this.imagerLowFilter.frequency.value = 200; this.imagerLowFilter.Q.value = 0.7;
    this.imagerLowSplitter = context.createChannelSplitter(2); this.imagerLowMerger = context.createChannelMerger(2); this.imagerLowDryL = context.createGain(); this.imagerLowDryL.gain.value = 1;
    this.imagerLowDryR = context.createGain(); this.imagerLowDryR.gain.value = 1; this.imagerLowMonoSum = context.createGain(); this.imagerLowMonoSum.gain.value = 0.5;
    this.imagerLowMonoGain = context.createGain(); this.imagerLowMonoGain.gain.value = 0;
    createImagerBand(this.imagerLowFilter, this.imagerLowDryL, this.imagerLowDryR, this.imagerLowMonoSum, this.imagerLowMonoGain, this.imagerLowMerger, this.imagerLowSplitter);
    this.imagerMidFilter = context.createBiquadFilter(); this.imagerMidFilter.type = 'bandpass'; this.imagerMidFilter.frequency.value = 1000; this.imagerMidFilter.Q.value = 0.5;
    this.imagerMidSplitter = context.createChannelSplitter(2); this.imagerMidMerger = context.createChannelMerger(2); this.imagerMidDryL = context.createGain(); this.imagerMidDryL.gain.value = 1;
    this.imagerMidDryR = context.createGain(); this.imagerMidDryR.gain.value = 1; this.imagerMidMonoSum = context.createGain(); this.imagerMidMonoSum.gain.value = 0.5;
    this.imagerMidMonoGain = context.createGain(); this.imagerMidMonoGain.gain.value = 0;
    createImagerBand(this.imagerMidFilter, this.imagerMidDryL, this.imagerMidDryR, this.imagerMidMonoSum, this.imagerMidMonoGain, this.imagerMidMerger, this.imagerMidSplitter);
    this.imagerHighFilter = context.createBiquadFilter(); this.imagerHighFilter.type = 'highpass'; this.imagerHighFilter.frequency.value = 4000; this.imagerHighFilter.Q.value = 0.7;
    this.imagerHighSplitter = context.createChannelSplitter(2); this.imagerHighMerger = context.createChannelMerger(2); this.imagerHighDryL = context.createGain(); this.imagerHighDryL.gain.value = 1;
    this.imagerHighDryR = context.createGain(); this.imagerHighDryR.gain.value = 1; this.imagerHighMonoSum = context.createGain(); this.imagerHighMonoSum.gain.value = 0.5;
    this.imagerHighMonoGain = context.createGain(); this.imagerHighMonoGain.gain.value = 0;
    createImagerBand(this.imagerHighFilter, this.imagerHighDryL, this.imagerHighDryR, this.imagerHighMonoSum, this.imagerHighMonoGain, this.imagerHighMerger, this.imagerHighSplitter);
    this.imagerInput.connect(this.imagerDryGain); this.imagerDryGain.connect(this.imagerOutput); this.imagerWetGain.connect(this.imagerOutput);

    this.monoMakerInput = context.createGain(); this.monoMakerOutput = context.createGain(); this.monoMakerSplitter = context.createChannelSplitter(2); this.monoMakerMerger = context.createChannelMerger(2);
    this.monoMakerBassL = context.createBiquadFilter(); this.monoMakerBassL.type = 'lowpass'; this.monoMakerBassL.frequency.value = this.monoMakerFreq; this.monoMakerBassL.Q.value = 0.7;
    this.monoMakerBassR = context.createBiquadFilter(); this.monoMakerBassR.type = 'lowpass'; this.monoMakerBassR.frequency.value = this.monoMakerFreq; this.monoMakerBassR.Q.value = 0.7;
    this.monoMakerBassGainL = context.createGain(); this.monoMakerBassGainL.gain.value = 0.5; this.monoMakerBassGainR = context.createGain(); this.monoMakerBassGainR.gain.value = 0.5;
    this.monoMakerBassMono = context.createGain(); this.monoMakerBassMono.gain.value = 1;
    this.monoMakerHighL = context.createBiquadFilter(); this.monoMakerHighL.type = 'highpass'; this.monoMakerHighL.frequency.value = this.monoMakerFreq; this.monoMakerHighL.Q.value = 0.7;
    this.monoMakerHighR = context.createBiquadFilter(); this.monoMakerHighR.type = 'highpass'; this.monoMakerHighR.frequency.value = this.monoMakerFreq; this.monoMakerHighR.Q.value = 0.7;
    this.monoMakerMixL = context.createGain(); this.monoMakerMixL.gain.value = 1; this.monoMakerMixR = context.createGain(); this.monoMakerMixR.gain.value = 1;
    this.monoMakerWetGain = context.createGain(); this.monoMakerWetGain.gain.value = 0; this.monoMakerDryGain = context.createGain(); this.monoMakerDryGain.gain.value = 1;
    this.monoMakerInput.connect(this.monoMakerSplitter); this.monoMakerInput.connect(this.monoMakerDryGain); this.monoMakerDryGain.connect(this.monoMakerOutput);
    this.monoMakerSplitter.connect(this.monoMakerBassL, 0); this.monoMakerBassL.connect(this.monoMakerBassGainL); this.monoMakerBassGainL.connect(this.monoMakerBassMono);
    this.monoMakerSplitter.connect(this.monoMakerBassR, 1); this.monoMakerBassR.connect(this.monoMakerBassGainR); this.monoMakerBassGainR.connect(this.monoMakerBassMono);
    this.monoMakerSplitter.connect(this.monoMakerHighL, 0); this.monoMakerHighL.connect(this.monoMakerMixL);
    this.monoMakerSplitter.connect(this.monoMakerHighR, 1); this.monoMakerHighR.connect(this.monoMakerMixR);
    this.monoMakerBassMono.connect(this.monoMakerMixL); this.monoMakerBassMono.connect(this.monoMakerMixR);
    this.monoMakerMixL.connect(this.monoMakerMerger, 0, 0); this.monoMakerMixR.connect(this.monoMakerMerger, 0, 1);
    this.monoMakerMerger.connect(this.monoMakerWetGain); this.monoMakerWetGain.connect(this.monoMakerOutput);

    // Compresseur modéré (pour entendre la différence)
    this.compressor = context.createDynamicsCompressor(); this.compressor.threshold.value = -15; this.compressor.knee.value = 6; this.compressor.ratio.value = 3; this.compressor.attack.value = 0.01; this.compressor.release.value = 0.25;
    this.compressorMakeup = context.createGain(); this.compressorMakeup.gain.value = 1.0;

    // Exciter léger (mais audible)
    this.exciterHighShelf = context.createBiquadFilter(); this.exciterHighShelf.type = 'highshelf'; this.exciterHighShelf.frequency.value = 3000; this.exciterHighShelf.gain.value = 2;
    this.exciterDrive = context.createWaveShaper(); this.exciterDrive.curve = this.makeExciterCurve(1.5) as any; this.exciterDrive.oversample = '4x';
    this.exciterWetGain = context.createGain(); this.exciterWetGain.gain.value = 0.15; this.exciterDryGain = context.createGain(); this.exciterDryGain.gain.value = 0.85;

    this.subBassFilter = context.createBiquadFilter(); this.subBassFilter.type = 'peaking'; this.subBassFilter.frequency.value = 60; this.subBassFilter.Q.value = 1.2; this.subBassFilter.gain.value = 1;
    this.bassShelf = context.createBiquadFilter(); this.bassShelf.type = 'lowshelf'; this.bassShelf.frequency.value = 120; this.bassShelf.gain.value = 1;
    this.subBassGain = context.createGain(); this.subBassGain.gain.value = 1;
    this.airShelf = context.createBiquadFilter(); this.airShelf.type = 'highshelf'; this.airShelf.frequency.value = 14000; this.airShelf.gain.value = 2;

    this.limiter = context.createDynamicsCompressor(); this.limiter.threshold.value = -2.0; this.limiter.knee.value = 4; this.limiter.ratio.value = 10; this.limiter.attack.value = 0.002; this.limiter.release.value = 0.2;
    this.finalClip = context.createWaveShaper(); this.finalClip.curve = this.makeBrickwallCurve(-0.5) as any; this.finalClip.oversample = '4x';

    this.bypassGain = context.createGain(); this.bypassGain.gain.value = 0; this.processedGain = context.createGain(); this.processedGain.gain.value = 1;
    this.outputGain = context.createGain();

    let prev: AudioNode = this.inputGain;
    for (const band of this.eqBands) { prev.connect(band); prev = band; }
    prev.connect(this.eqMid); this.eqMid.connect(this.saturator); this.saturator.connect(this.widenerInput);
    this.widenerOutput.connect(this.imagerInput); this.imagerOutput.connect(this.monoMakerInput);
    this.monoMakerOutput.connect(this.subBassFilter); this.subBassFilter.connect(this.subBassGain); this.subBassGain.connect(this.bassShelf);
    this.bassShelf.connect(this.compressor); this.compressor.connect(this.compressorMakeup); this.compressorMakeup.connect(this.exciterHighShelf);
    this.exciterHighShelf.connect(this.exciterWetGain); this.exciterWetGain.connect(this.exciterDrive); this.exciterDrive.connect(this.airShelf);
    this.exciterHighShelf.connect(this.exciterDryGain); this.exciterDryGain.connect(this.airShelf);
    this.airShelf.connect(this.limiter); this.limiter.connect(this.finalClip); this.finalClip.connect(this.processedGain); this.processedGain.connect(this.outputGain);
    this.inputGain.connect(this.bypassGain); this.bypassGain.connect(this.outputGain);
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 4096; const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>; const k = amount * 4;
    for (let i = 0; i < samples; i++) { const x = (i * 2) / samples - 1; curve[i] = k < 0.001 ? x : Math.tanh(k * x) / Math.tanh(k); }
    return curve;
  }
  private makeExciterCurve(drive: number): Float32Array<ArrayBuffer> {
    const samples = 4096; const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>;
    for (let i = 0; i < samples; i++) { const x = (i * 2) / samples - 1; const pos = Math.tanh(drive * x) / Math.tanh(drive); const neg = Math.tanh(drive * 0.7 * x) / Math.tanh(drive * 0.7); curve[i] = x >= 0 ? pos : neg * 0.9; }
    return curve;
  }
  private makeBrickwallCurve(ceilingDb: number): Float32Array<ArrayBuffer> {
    const samples = 4096; const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>; const ceiling = Math.pow(10, ceilingDb / 20);
    for (let i = 0; i < samples; i++) { const x = (i * 2) / samples - 1; const a = Math.abs(x); if (a <= ceiling) { curve[i] = x; } else { const over = (a - ceiling) / (1 - ceiling); const compressed = ceiling + Math.tanh(over * 3) * (1 - ceiling) * 0.9; curve[i] = Math.sign(x) * Math.min(compressed, 1); } }
    return curve;
  }
  private getCachedDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const key = `d${Math.round(amount * 1000)}`; let curve = this.curveCache.get(key);
    if (!curve) { curve = this.makeDistortionCurve(amount); if (this.curveCache.size >= 16) { const first = this.curveCache.keys().next().value; if (first) this.curveCache.delete(first); } this.curveCache.set(key, curve); }
    return curve;
  }

  connect(source: AudioNode): void {
    if (this.inputNode) { try { this.inputNode.disconnect(this.inputGain); } catch {} }
    this.inputNode = source; source.connect(this.inputGain);
  }
  getOutputNode(): AudioNode { return this.outputGain; }
  getInputNode(): AudioNode { return this.inputGain; }

  setLoudness(value: number): void {
    const k = Math.max(-6, Math.min(6, value)); const now = this.context.currentTime;
    this.inputGain.gain.setTargetAtTime(Math.pow(10, k / 20), now, 0.02);
    const makeupDb = 1 + k * 0.3; this.compressorMakeup.gain.setTargetAtTime(Math.pow(10, makeupDb / 20), now, 0.02);
    const threshold = Math.max(-12, -2.0 - k * 0.3); this.limiter.threshold.setTargetAtTime(threshold, now, 0.02);
  }
  setPresence(value: number): void { this.eqMid.gain.setTargetAtTime(value, this.context.currentTime, 0.02); }
  
  setWidth(value: number): void {
    const sideGain = value > 1 ? Math.min(0.2, (value - 1) * 0.2) : 0;
    const midGain = value > 1 ? 1 - (sideGain * 0.1) : 1 + (1 - value) * 0.1;
    const now = this.context.currentTime;
    this.widenerSideToL.gain.setTargetAtTime(sideGain, now, 0.02);
    this.widenerSideToR.gain.setTargetAtTime(-sideGain, now, 0.02);
    this.widenerMidToL.gain.setTargetAtTime(midGain, now, 0.02);
    this.widenerMidToR.gain.setTargetAtTime(midGain, now, 0.02);
  }

  setSaturation(value: number): void { this.saturator.curve = this.getCachedDistortionCurve(value * 0.05) as any; }
  
  setBypass(bypass: boolean): void {
    const now = this.context.currentTime;
    this.bypassGain.gain.setTargetAtTime(bypass ? 1 : 0, now, 0.01); this.processedGain.gain.setTargetAtTime(bypass ? 0 : 1, now, 0.01);
  }
  
  setEQBand(index: number, frequency: number, gain: number, q?: number): void {
    const band = this.eqBands[index]; if (!band) return;
    band.frequency.value = frequency; band.gain.setTargetAtTime(gain, this.context.currentTime, 0.02); if (q !== undefined) band.Q.value = q;
  }

  setEQGain(bandIndex: number, gainDb: number): void {
    const band = this.eqBands[bandIndex];
    if (band) {
      band.gain.setTargetAtTime(gainDb, this.context.currentTime, 0.02);
    }
  }

  setCompressor(thresholdDb: number, ratio: number, attack: number, release: number): void {
    const now = this.context.currentTime;
    this.compressor.threshold.setTargetAtTime(thresholdDb, now, 0.02); this.compressor.ratio.setTargetAtTime(ratio, now, 0.02);
    this.compressor.attack.setTargetAtTime(attack, now, 0.02); this.compressor.release.setTargetAtTime(release, now, 0.02);
  }
  setLimiterCeiling(ceilingDb: number): void { this.finalClip.curve = this.makeBrickwallCurve(ceilingDb) as any; }
  getEQBandCount(): number { return this.eqBands.length; }
  setMonoMaker(enabled: boolean, frequency?: number): void {
    this.monoMakerEnabled = false;
    const now = this.context.currentTime; this.monoMakerWetGain.gain.setTargetAtTime(0, now, 0.02); this.monoMakerDryGain.gain.setTargetAtTime(1, now, 0.02);
  }
  isMonoMakerEnabled(): boolean { return this.monoMakerEnabled; }
  getMonoMakerFrequency(): number { return this.monoMakerFreq; }
  setImager(enabled: boolean, lowAmount?: number, midAmount?: number, highAmount?: number): void {
    if (lowAmount !== undefined) { this.imagerLowDryL.gain.value = 1 - lowAmount; this.imagerLowDryR.gain.value = 1 - lowAmount; this.imagerLowMonoGain.gain.value = lowAmount; }
    if (midAmount !== undefined) { this.imagerMidDryL.gain.value = 1 - midAmount; this.imagerMidDryR.gain.value = 1 - midAmount; this.imagerMidMonoGain.gain.value = midAmount; }
    if (highAmount !== undefined) { this.imagerHighDryL.gain.value = 1 - highAmount; this.imagerHighDryR.gain.value = 1 - highAmount; this.imagerHighMonoGain.gain.value = highAmount; }
    const now = this.context.currentTime; this.imagerWetGain.gain.setTargetAtTime(enabled ? 1 : 0, now, 0.02); this.imagerDryGain.gain.setTargetAtTime(enabled ? 0 : 1, now, 0.02);
  }

  applyPreset(preset: MasteringPreset, intensity: number = 1): void {
    const k = Math.max(0, Math.min(1, intensity)); const v = this.getPresetValues(preset);
    this.setLoudness(v.loudness * k); this.setPresence(v.presence * k); this.setWidth(1 + (v.width - 1) * k); this.setSaturation(v.saturation * k);
    const eq = this.getEQPreset(preset); eq.forEach((band, i) => { this.setEQBand(i, band.frequency, band.gain * k, band.q); });
    this.setMonoMaker(false, 120);
  }

  getPresetValues(preset: MasteringPreset): PresetValues {
    switch (preset) {
      case 'universal': return { loudness: 1.0, presence: 0.5, width: 1.05, saturation: 0.02 };
      case 'fire':      return { loudness: 2.5, presence: 1.5, width: 1.0, saturation: 0.10 };
      case 'clarity':   return { loudness: 1.0, presence: 2.0, width: 1.1, saturation: 0.02 };
      case 'cassette':  return { loudness: 0.5, presence: -0.5, width: 0.9, saturation: 0.15 };
      case 'natural':   return { loudness: 0.0, presence: 0.0, width: 1.0, saturation: 0.00 };
      case 'spatial':   return { loudness: 0.5, presence: 0.5, width: 1.3, saturation: 0.02 };
      case 'cinematic': return { loudness: 2.0, presence: 1.0, width: 1.2, saturation: 0.08 };
      case 'punch':     return { loudness: 3.5, presence: 1.0, width: 1.0, saturation: 0.12 };
    }
  }

  getEQPreset(preset: MasteringPreset): { frequency: number; gain: number; q: number }[] {
    switch (preset) {
      case 'universal': return [ { frequency: 80, gain: 1.0, q: 0.7 }, { frequency: 250, gain: 0.0, q: 1 }, { frequency: 1000, gain: 0.0, q: 1 }, { frequency: 4000, gain: 0.5, q: 1 }, { frequency: 12000, gain: 1.0, q: 0.7 } ];
      case 'fire': return [ { frequency: 80, gain: 4.0, q: 0.7 }, { frequency: 250, gain: 1.5, q: 1 }, { frequency: 1000, gain: -1.0, q: 1 }, { frequency: 4000, gain: 1.0, q: 1 }, { frequency: 12000, gain: -0.5, q: 0.7 } ];
      case 'clarity': return [ { frequency: 80, gain: -1.5, q: 0.7 }, { frequency: 250, gain: -1.0, q: 1 }, { frequency: 1000, gain: 0.0, q: 1 }, { frequency: 4000, gain: 2.5, q: 1 }, { frequency: 12000, gain: 4.0, q: 0.7 } ];
      case 'cassette': return [ { frequency: 80, gain: 1.5, q: 0.7 }, { frequency: 250, gain: 0.5, q: 1 }, { frequency: 1000, gain: -1.5, q: 1 }, { frequency: 4000, gain: -2.0, q: 1 }, { frequency: 12000, gain: -4.0, q: 0.7 } ];
      case 'natural': return [ { frequency: 80, gain: 0, q: 0.7 }, { frequency: 250, gain: 0, q: 1 }, { frequency: 1000, gain: 0, q: 1 }, { frequency: 4000, gain: 0, q: 1 }, { frequency: 12000, gain: 0, q: 0.7 } ];
      case 'spatial': return [ { frequency: 80, gain: -1.0, q: 0.7 }, { frequency: 250, gain: -0.5, q: 1 }, { frequency: 1000, gain: -1.0, q: 1 }, { frequency: 4000, gain: 1.0, q: 1 }, { frequency: 12000, gain: 2.0, q: 0.7 } ];
      case 'cinematic': return [ { frequency: 80, gain: 3.0, q: 0.7 }, { frequency: 250, gain: 1.0, q: 1 }, { frequency: 1000, gain: 0.0, q: 1 }, { frequency: 4000, gain: -1.0, q: 1 }, { frequency: 12000, gain: 1.0, q: 0.7 } ];
      case 'punch': return [ { frequency: 80, gain: 5.0, q: 0.7 }, { frequency: 250, gain: 2.0, q: 1 }, { frequency: 1000, gain: 0.0, q: 1 }, { frequency: 4000, gain: 2.0, q: 1 }, { frequency: 12000, gain: 3.0, q: 0.7 } ];
    }
  }

  destroy(): void {
    try { this.inputGain.disconnect(); } catch {}
    this.eqBands.forEach((b) => { try { b.disconnect(); } catch {} });
    try { this.eqMid.disconnect(); } catch {}
    try { this.saturator.disconnect(); } catch {}
    const allNodes: AudioNode[] = [
      this.widenerInput, this.widenerOutput, this.widenerSplitter, this.widenerMerger, this.widenerMidL, this.widenerMidR, this.widenerMidSum, this.widenerSideL, this.widenerSideR, this.widenerSideSum, this.widenerMidToL, this.widenerMidToR, this.widenerSideToL, this.widenerSideToR,
      this.imagerInput, this.imagerOutput, this.imagerWetGain, this.imagerDryGain, this.imagerLowFilter, this.imagerLowSplitter, this.imagerLowMerger, this.imagerLowDryL, this.imagerLowDryR, this.imagerLowMonoSum, this.imagerLowMonoGain, this.imagerMidFilter, this.imagerMidSplitter, this.imagerMidMerger, this.imagerMidDryL, this.imagerMidDryR, this.imagerMidMonoSum, this.imagerMidMonoGain, this.imagerHighFilter, this.imagerHighSplitter, this.imagerHighMerger, this.imagerHighDryL, this.imagerHighDryR, this.imagerHighMonoSum, this.imagerHighMonoGain,
      this.monoMakerInput, this.monoMakerOutput, this.monoMakerSplitter, this.monoMakerMerger, this.monoMakerBassL, this.monoMakerBassR, this.monoMakerHighL, this.monoMakerHighR, this.monoMakerBassGainL, this.monoMakerBassGainR, this.monoMakerBassMono, this.monoMakerMixL, this.monoMakerMixR, this.monoMakerWetGain, this.monoMakerDryGain,
      this.compressor, this.compressorMakeup, this.exciterHighShelf, this.exciterDrive, this.exciterWetGain, this.exciterDryGain, this.subBassFilter, this.bassShelf, this.subBassGain, this.airShelf, this.limiter, this.finalClip, this.bypassGain, this.processedGain, this.outputGain,
    ];
    allNodes.forEach((n) => { try { n.disconnect(); } catch {} });
    this.curveCache.clear();
  }
}

let _singletonChain: MasteringChain | null = null;
let _singletonCtx: AudioContext | null = null;

export function getMasteringChainSingleton(ctx: AudioContext): MasteringChain {
  if (_singletonChain && _singletonCtx === ctx) return _singletonChain;
  if (_singletonChain) { try { _singletonChain.destroy(); } catch {} _singletonChain = null; _singletonCtx = null; }
  _singletonChain = new MasteringChain(ctx); _singletonCtx = ctx; return _singletonChain;
}

export async function renderMasteredOffline(buffer: AudioBuffer, preset: MasteringPreset, intensity: number = 1): Promise<AudioBuffer> {
  const offline = new OfflineAudioContext(2, buffer.length, buffer.sampleRate);
  const offlineChain = new MasteringChain(offline); offlineChain.applyPreset(preset, intensity);
  const src = offline.createBufferSource(); src.buffer = buffer; src.connect(offlineChain.getInputNode()); offlineChain.getOutputNode().connect(offline.destination); src.start(0);
  const rendered = await offline.startRendering(); offlineChain.destroy(); return rendered;
}