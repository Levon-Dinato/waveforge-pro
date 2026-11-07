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

  reset() { this.sampleHistory = []; }

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
  private saturatorWet: GainNode;
  private saturatorDry: GainNode;
  
  private widenerInput: GainNode; private widenerOutput: GainNode;
  private widenerSplitter: ChannelSplitterNode; private widenerMerger: ChannelMergerNode;
  private widenerMidL: GainNode; private widenerMidR: GainNode; private widenerMidSum: GainNode;
  private widenerSideL: GainNode; private widenerSideR: GainNode; private widenerSideSum: GainNode;
  private widenerMidToL: GainNode; private widenerMidToR: GainNode; private widenerSideToL: GainNode; private widenerSideToR: GainNode;
  private compressor: DynamicsCompressorNode; private compressorMakeup: GainNode;
  
  // ✅ NOUVEAU : LIMITEUR BRICKWALL
  private limiter: DynamicsCompressorNode;
  private limiterOutputGain: GainNode;

  private bypassGain: GainNode;
  private processedGain: GainNode;
  private outputGain: GainNode;
  private inputNode: AudioNode | null = null;
  private context: BaseAudioContext;
  private curveCache = new Map<string, Float32Array<ArrayBuffer>>();
  
  private presetEQBase: number[] = [0, 0, 0, 0, 0];
  private manualEQ: number[] = [0, 0, 0, 0, 0];

  constructor(context: BaseAudioContext) {
    this.context = context;
    this.inputGain = context.createGain(); this.inputGain.gain.value = 1;
    
    for (const band of DEFAULT_EQ_BANDS) {
      const filter = context.createBiquadFilter();
      filter.type = band.type; filter.frequency.value = band.frequency; filter.gain.value = band.gain; filter.Q.value = band.q;
      this.eqBands.push(filter);
    }
    
    this.eqMid = context.createBiquadFilter(); this.eqMid.type = 'peaking'; this.eqMid.frequency.value = 1000; this.eqMid.Q.value = 1; this.eqMid.gain.value = 0;

    this.saturator = context.createWaveShaper(); this.saturator.curve = this.makeDistortionCurve(0) as any; this.saturator.oversample = '4x';
    this.saturatorWet = context.createGain(); this.saturatorWet.gain.value = 0;
    this.saturatorDry = context.createGain(); this.saturatorDry.gain.value = 1;

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

    this.compressor = context.createDynamicsCompressor(); 
    this.compressor.threshold.value = -18; 
    this.compressor.knee.value = 10; 
    this.compressor.ratio.value = 1.5;
    this.compressor.attack.value = 0.03; 
    this.compressor.release.value = 0.25;
    this.compressorMakeup = context.createGain(); this.compressorMakeup.gain.value = 1.0;
    
    // ✅ LIMITEUR BRICKWALL (Ratio 20:1, Attack 1ms, threshold -0.3dB)
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -0.3;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.05;
    
    this.limiterOutputGain = context.createGain(); this.limiterOutputGain.gain.value = 1.0;

    this.processedGain = context.createGain(); this.processedGain.gain.value = 1;
    this.bypassGain = context.createGain(); this.bypassGain.gain.value = 0;
    this.outputGain = context.createGain();

    // Câblage : Gain -> EQ -> Saturateur -> Widener -> Compresseur -> Limiteur -> Sortie
    let prev: AudioNode = this.inputGain;
    for (const band of this.eqBands) { prev.connect(band); prev = band; }
    prev.connect(this.eqMid); 
    
    this.eqMid.connect(this.saturatorDry);
    this.saturatorDry.connect(this.widenerInput);
    
    this.eqMid.connect(this.saturator);
    this.saturator.connect(this.saturatorWet);
    this.saturatorWet.connect(this.widenerInput);
    
    this.widenerOutput.connect(this.compressor);
    this.compressor.connect(this.compressorMakeup);
    this.compressorMakeup.connect(this.processedGain);
    
    // ✅ Limiteur branché juste avant la sortie
    this.processedGain.connect(this.limiter);
    this.limiter.connect(this.limiterOutputGain);
    this.limiterOutputGain.connect(this.outputGain);
    
    this.inputGain.connect(this.bypassGain);
    this.bypassGain.connect(this.outputGain);
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 4096; const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>; const k = amount * 4;
    for (let i = 0; i < samples; i++) { const x = (i * 2) / samples - 1; curve[i] = k < 0.001 ? x : Math.tanh(k * x) / Math.tanh(k); }
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

  setInputGain(gainDb: number): void {
    const now = this.context.currentTime;
    this.inputGain.gain.setTargetAtTime(Math.pow(10, gainDb / 20), now, 0.02);
  }

  setLoudness(value: number): void {
    const k = Math.max(-6, Math.min(6, value)); 
    this.inputGain.gain.setTargetAtTime(Math.pow(10, (k * 1.5) / 20), this.context.currentTime, 0.02);
  }
  
  setPresence(value: number): void { this.eqMid.gain.setTargetAtTime(value, this.context.currentTime, 0.02); }
  
  setWidth(value: number): void {
    const sideGain = value > 1 ? Math.min(0.25, (value - 1) * 0.25) : 0;
    const midGain = value > 1 ? 1 - (sideGain * 0.15) : 1;
    const now = this.context.currentTime;
    this.widenerSideToL.gain.setTargetAtTime(sideGain, now, 0.05);
    this.widenerSideToR.gain.setTargetAtTime(-sideGain, now, 0.05);
    this.widenerMidToL.gain.setTargetAtTime(midGain, now, 0.05);
    this.widenerMidToR.gain.setTargetAtTime(midGain, now, 0.05);
  }
  
  setSaturation(value: number): void { 
    this.saturator.curve = this.getCachedDistortionCurve(value) as any;
    const wetAmount = value > 0 ? Math.min(0.35, value * 0.4) : 0;
    this.saturatorWet.gain.setTargetAtTime(wetAmount, this.context.currentTime, 0.05);
    this.saturatorDry.gain.setTargetAtTime(1 - wetAmount, this.context.currentTime, 0.05);
  }
  
  setBypass(bypass: boolean): void {
    const now = this.context.currentTime;
    this.bypassGain.gain.setTargetAtTime(bypass ? 1 : 0, now, 0.01); 
    this.processedGain.gain.setTargetAtTime(bypass ? 0 : 1, now, 0.01);
  }
  
  setEQBand(index: number, frequency: number, gain: number, q?: number): void {
    const band = this.eqBands[index]; if (!band) return;
    band.frequency.setTargetAtTime(frequency, this.context.currentTime, 0.05); 
    band.gain.setTargetAtTime(gain, this.context.currentTime, 0.05); 
    if (q !== undefined) band.Q.setTargetAtTime(q, this.context.currentTime, 0.05);
  }

  setEQGain(bandIndex: number, gainDb: number): void {
    this.setManualEQGain(bandIndex, gainDb);
  }
  
  // ✅ Combine le preset et le manuel
  setManualEQGain(bandIndex: number, gainDb: number): void {
    this.manualEQ[bandIndex] = gainDb;
    const band = this.eqBands[bandIndex];
    if (band) {
      const totalGain = this.presetEQBase[bandIndex] + this.manualEQ[bandIndex];
      band.gain.setTargetAtTime(totalGain, this.context.currentTime, 0.03);
    }
  }

  setCompressor(thresholdDb: number, ratio: number, attack: number, release: number): void {
    const now = this.context.currentTime;
    this.compressor.threshold.setTargetAtTime(thresholdDb, now, 0.05); 
    this.compressor.ratio.setTargetAtTime(ratio, now, 0.05);
    this.compressor.attack.setTargetAtTime(attack, now, 0.05); 
    this.compressor.release.setTargetAtTime(release, now, 0.05);
    
    let makeupDb = 0;
    if (ratio > 1 && thresholdDb < 0) {
      makeupDb = Math.abs(thresholdDb) * (1 - 1/ratio) * 0.7;
    }
    this.compressorMakeup.gain.setTargetAtTime(Math.pow(10, makeupDb / 20), now, 0.05);
  }
  
  // ✅ Réglage du limiteur (Ceiling)
  setLimiterCeiling(ceilingDb: number): void {
    const now = this.context.currentTime;
    this.limiter.threshold.setTargetAtTime(ceilingDb, now, 0.05);
  }

  setMonoMaker(...args: any[]): void { }
  setImager(...args: any[]): void { }
  isMonoMakerEnabled(): boolean { return false; }
  getMonoMakerFrequency(): number { return 120; }
  getEQBandCount(): number { return this.eqBands.length; }

  applyPreset(preset: MasteringPreset, intensity: number = 1): void {
    const k = Math.max(0, Math.min(1, intensity)); 
    const v = this.getPresetValues(preset);
    
    this.setLoudness(v.loudness * k);
    this.setSaturation(v.saturation * k);
    
    const eq = this.getEQPreset(preset); 
    eq.forEach((band, i) => {
      this.presetEQBase[i] = band.gain * k;
      this.eqBands[i].frequency.setTargetAtTime(band.frequency, this.context.currentTime, 0.05);
      this.eqBands[i].Q.setTargetAtTime(band.q, this.context.currentTime, 0.05);
      const totalGain = this.presetEQBase[i] + this.manualEQ[i];
      this.eqBands[i].gain.setTargetAtTime(totalGain, this.context.currentTime, 0.05);
    });
    
    this.setWidth(1 + (v.width - 1) * k);
    
    const comp = this.getCompressorPreset(preset);
    this.setCompressor(comp.threshold, 1 + (comp.ratio - 1) * k, comp.attack, comp.release);
  }

  // ✅ NOUVEAU : Récupérer l'état actuel pour l'affichage UI
  getCurrentState(preset: MasteringPreset): {
    presetName: string;
    presetValues: PresetValues;
    compressor: { threshold: number; ratio: number; attack: number; release: number };
    eq: { frequency: number; gain: number; q: number }[];
  } {
    return {
      presetName: preset,
      presetValues: this.getPresetValues(preset),
      compressor: this.getCompressorPreset(preset),
      eq: this.getEQPreset(preset),
    };
  }

  getCompressorPreset(preset: MasteringPreset): { threshold: number; ratio: number; attack: number; release: number } {
    switch (preset) {
      case 'universal': return { threshold: -18, ratio: 1.8, attack: 0.03, release: 0.25 };
      case 'fire':      return { threshold: -16, ratio: 2.5, attack: 0.02, release: 0.20 };
      case 'clarity':   return { threshold: -20, ratio: 1.5, attack: 0.04, release: 0.30 };
      case 'cassette':  return { threshold: -22, ratio: 2.0, attack: 0.05, release: 0.40 };
      case 'natural':   return { threshold: -20, ratio: 1.3, attack: 0.05, release: 0.30 };
      case 'spatial':   return { threshold: -20, ratio: 1.5, attack: 0.04, release: 0.30 };
      case 'cinematic': return { threshold: -18, ratio: 2.2, attack: 0.03, release: 0.35 };
      case 'punch':     return { threshold: -14, ratio: 3.0, attack: 0.01, release: 0.10 };
    }
  }

  getPresetValues(preset: MasteringPreset): PresetValues {
    switch (preset) {
      case 'universal': return { loudness: 3.0, presence: 0, width: 1.0, saturation: 0.15 };
      case 'fire':      return { loudness: 5.0, presence: 0, width: 1.0, saturation: 0.4 };
      case 'clarity':   return { loudness: 3.0, presence: 0, width: 1.0, saturation: 0.15 };
      case 'cassette':  return { loudness: 2.5, presence: 0, width: 0.9, saturation: 0.5 };
      case 'natural':   return { loudness: 0.5, presence: 0, width: 1.0, saturation: 0.05 };
      case 'spatial':   return { loudness: 2.5, presence: 0, width: 1.4, saturation: 0.15 };
      case 'cinematic': return { loudness: 4.5, presence: 0, width: 1.1, saturation: 0.3 };
      case 'punch':     return { loudness: 6.0, presence: 0, width: 1.0, saturation: 0.4 };
    }
  }

  getEQPreset(preset: MasteringPreset): { frequency: number; gain: number; q: number }[] {
    switch (preset) {
      case 'universal': return [ { frequency: 80, gain: 3.0, q: 0.7 }, { frequency: 250, gain: 0.0, q: 0.8 }, { frequency: 1000, gain: 0.0, q: 0.8 }, { frequency: 4000, gain: 1.5, q: 0.8 }, { frequency: 12000, gain: 3.0, q: 0.7 } ];
      case 'fire': return [ { frequency: 80, gain: 6.0, q: 0.7 }, { frequency: 250, gain: 3.0, q: 0.8 }, { frequency: 1000, gain: -1.5, q: 0.8 }, { frequency: 4000, gain: 1.0, q: 0.8 }, { frequency: 12000, gain: -1.5, q: 0.7 } ];
      case 'clarity': return [ { frequency: 80, gain: -3.0, q: 0.7 }, { frequency: 250, gain: -2.0, q: 0.8 }, { frequency: 1000, gain: 0.0, q: 0.8 }, { frequency: 4000, gain: 4.0, q: 0.8 }, { frequency: 12000, gain: 6.0, q: 0.7 } ];
      case 'cassette': return [ { frequency: 80, gain: 3.0, q: 0.7 }, { frequency: 250, gain: 1.5, q: 0.8 }, { frequency: 1000, gain: -3.0, q: 0.8 }, { frequency: 4000, gain: -4.0, q: 0.8 }, { frequency: 12000, gain: -6.0, q: 0.7 } ];
      case 'natural': return [ { frequency: 80, gain: 0, q: 0.7 }, { frequency: 250, gain: 0, q: 0.8 }, { frequency: 1000, gain: 0, q: 0.8 }, { frequency: 4000, gain: 0, q: 0.8 }, { frequency: 12000, gain: 0, q: 0.7 } ];
      case 'spatial': return [ { frequency: 80, gain: -2.5, q: 0.7 }, { frequency: 250, gain: -1.5, q: 0.8 }, { frequency: 1000, gain: -2.5, q: 0.8 }, { frequency: 4000, gain: 2.5, q: 0.8 }, { frequency: 12000, gain: 4.5, q: 0.7 } ];
      case 'cinematic': return [ { frequency: 80, gain: 4.5, q: 0.7 }, { frequency: 250, gain: 2.5, q: 0.8 }, { frequency: 1000, gain: 0.0, q: 0.8 }, { frequency: 4000, gain: -2.5, q: 0.8 }, { frequency: 12000, gain: 2.5, q: 0.7 } ];
      case 'punch': return [ { frequency: 80, gain: 7.0, q: 0.7 }, { frequency: 250, gain: 3.0, q: 0.8 }, { frequency: 1000, gain: 0.0, q: 0.8 }, { frequency: 4000, gain: 3.0, q: 0.8 }, { frequency: 12000, gain: 4.5, q: 0.7 } ];
    }
  }

  destroy(): void {
    try { this.inputGain.disconnect(); } catch {}
    this.eqBands.forEach((b) => { try { b.disconnect(); } catch {} });
    try { this.eqMid.disconnect(); } catch {}
    try { this.saturator.disconnect(); } catch {}
    try { this.saturatorWet.disconnect(); } catch {}
    try { this.saturatorDry.disconnect(); } catch {}
    try { this.widenerInput.disconnect(); } catch {}
    try { this.widenerOutput.disconnect(); } catch {}
    try { this.compressor.disconnect(); } catch {}
    try { this.compressorMakeup.disconnect(); } catch {}
    try { this.limiter.disconnect(); } catch {}
    try { this.limiterOutputGain.disconnect(); } catch {}
    try { this.bypassGain.disconnect(); } catch {}
    try { this.processedGain.disconnect(); } catch {}
    try { this.outputGain.disconnect(); } catch {}
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