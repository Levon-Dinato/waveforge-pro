// src/audio/audioAnalyzer.ts

export interface AudioMetrics {
  lufs: number;
  truePeak: number;
  dr: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private sourceNode: AudioNode | null = null;
  private dataArray: Float32Array;
  private lufsBuffer: number[] = [];
  private readonly LUFS_WINDOW = 3;
  private isRunning = false;
  private animationFrameId: number | null = null;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0.8;
    this.dataArray = new Float32Array(this.analyser.fftSize);
    this.lufsBuffer = new Array(Math.floor(this.LUFS_WINDOW * 10)).fill(-Infinity);
  }

  connect(source: AudioNode): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect(this.analyser);
    }
    this.sourceNode = source;
    source.connect(this.analyser);
  }

  disconnect(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect(this.analyser);
      this.sourceNode = null;
    }
  }

  start(callback: (metrics: AudioMetrics) => void): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const analyze = () => {
      if (!this.isRunning) return;
      const metrics = this.getMetrics();
      callback(metrics);
      this.animationFrameId = requestAnimationFrame(analyze);
    };
    analyze();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  getMetrics(): AudioMetrics {
    this.analyser.getFloatTimeDomainData(this.dataArray as Float32Array<ArrayBuffer>);

    // True Peak (approximation)
    let peak = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const absVal = Math.abs(this.dataArray[i]);
      if (absVal > peak) peak = absVal;
    }
    const truePeak = peak > 0 ? 20 * Math.log10(peak) + 0.5 : -Infinity;

    // LUFS (approximation RMS K-weighted)
    let sumSquares = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sumSquares += this.dataArray[i] * this.dataArray[i];
    }
    const rms = Math.sqrt(sumSquares / this.dataArray.length);
    const lufsInstant = rms > 0 ? 20 * Math.log10(rms) - 0.691 : -Infinity;

    this.lufsBuffer.push(lufsInstant);
    if (this.lufsBuffer.length > Math.floor(this.LUFS_WINDOW * 10)) {
      this.lufsBuffer.shift();
    }

    const validLufs = this.lufsBuffer.filter((v) => isFinite(v));
    const lufs = validLufs.length > 0
      ? validLufs.reduce((a, b) => a + b, 0) / validLufs.length
      : -Infinity;

    const dr = (isFinite(truePeak) && isFinite(lufs)) ? Math.max(0, truePeak - lufs) : 0;

    return {
      lufs: isFinite(lufs) ? parseFloat(lufs.toFixed(1)) : -Infinity,
      truePeak: isFinite(truePeak) ? parseFloat(truePeak.toFixed(1)) : -Infinity,
      dr: parseFloat(dr.toFixed(1)),
    };
  }

  reset(): void {
    this.lufsBuffer = new Array(Math.floor(this.LUFS_WINDOW * 10)).fill(-Infinity);
  }

  destroy(): void {
    this.stop();
    this.disconnect();
  }
}