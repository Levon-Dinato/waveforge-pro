// src/audio/dualDeckEngine.ts

export type DeckId = 'A' | 'B';
export type EQBand = 'hi' | 'mid' | 'lo';

export interface DeckState {
  buffer: AudioBuffer | null;
  fileName: string;
  bpm: number;
  duration: number;
  isPlaying: boolean;
  currentTime: number;
}

interface DeckNodes {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  crossfadeGain: GainNode;
  eqHi: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqLo: BiquadFilterNode;
  startTime: number;
  offset: number;
  playbackRate: number;
}

export type MixerListener = (state: {
  A: DeckState;
  B: DeckState;
  crossfader: number;
  masterVolume: number;
}) => void;

export class DualDeckEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private decks: Record<DeckId, DeckNodes>;
  private states: Record<DeckId, DeckState>;
  private crossfader = 0;
  private masterVolume = 0.8;
  private rafId: number | null = null;
  private listeners: Set<MixerListener> = new Set();

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(ctx.destination);

    this.decks = {
      A: this.createDeckNodes(),
      B: this.createDeckNodes(),
    };

    this.states = {
      A: { buffer: null, fileName: '', bpm: 0, duration: 0, isPlaying: false, currentTime: 0 },
      B: { buffer: null, fileName: '', bpm: 0, duration: 0, isPlaying: false, currentTime: 0 },
    };

    this.updateCrossfadeGains();
    this.startTick();
  }

  private createDeckNodes(): DeckNodes {
    const gain = this.ctx.createGain();
    const crossfadeGain = this.ctx.createGain();
    const eqLo = this.ctx.createBiquadFilter();
    const eqMid = this.ctx.createBiquadFilter();
    const eqHi = this.ctx.createBiquadFilter();

    eqLo.type = 'lowshelf';
    eqLo.frequency.value = 200;
    eqLo.gain.value = 0;

    eqMid.type = 'peaking';
    eqMid.frequency.value = 1000;
    eqMid.Q.value = 1;
    eqMid.gain.value = 0;

    eqHi.type = 'highshelf';
    eqHi.frequency.value = 4000;
    eqHi.gain.value = 0;

    eqLo.connect(eqMid);
    eqMid.connect(eqHi);
    eqHi.connect(gain);
    gain.connect(crossfadeGain);
    crossfadeGain.connect(this.masterGain);

    return {
      source: null,
      gain,
      crossfadeGain,
      eqHi,
      eqMid,
      eqLo,
      startTime: 0,
      offset: 0,
      playbackRate: 1,
    };
  }

  subscribe(listener: MixerListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = {
      A: { ...this.states.A },
      B: { ...this.states.B },
      crossfader: this.crossfader,
      masterVolume: this.masterVolume,
    };
    this.listeners.forEach((l) => l(snapshot));
  }

  private startTick() {
    const tick = () => {
      (['A', 'B'] as DeckId[]).forEach((id) => {
        const deck = this.decks[id];
        const state = this.states[id];
        if (state.isPlaying && deck.source) {
          const elapsed = (this.ctx.currentTime - deck.startTime) * deck.playbackRate;
          state.currentTime = Math.min(deck.offset + elapsed, state.duration);
        }
      });
      this.notify();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  async loadTrack(deckId: DeckId, file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.loadTrackFromBuffer(deckId, buffer, file.name);
  }

  loadTrackFromBuffer(deckId: DeckId, buffer: AudioBuffer, fileName: string) {
    this.stop(deckId);
    const state = this.states[deckId];
    state.buffer = buffer;
    state.fileName = fileName;
    state.duration = buffer.duration;
    state.currentTime = 0;
    if (state.bpm <= 0) state.bpm = 120;
    this.notify();
  }

  play(deckId: DeckId) {
    const state = this.states[deckId];
    const deck = this.decks[deckId];
    if (!state.buffer) return;

    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.stopSource(deckId);

    const source = this.ctx.createBufferSource();
    source.buffer = state.buffer;
    source.playbackRate.value = deck.playbackRate;
    source.connect(deck.eqLo);

    source.start(0, state.currentTime);
    deck.source = source;
    deck.startTime = this.ctx.currentTime;
    deck.offset = state.currentTime;
    state.isPlaying = true;

    source.onended = () => {
      if (deck.source === source) {
        state.isPlaying = false;
        state.currentTime = 0;
        deck.source = null;
        this.notify();
      }
    };
    this.notify();
  }

  pause(deckId: DeckId) {
    const state = this.states[deckId];
    const deck = this.decks[deckId];
    if (deck.source) {
      const elapsed = (this.ctx.currentTime - deck.startTime) * deck.playbackRate;
      state.currentTime = Math.min(deck.offset + elapsed, state.duration);
    }
    this.stopSource(deckId);
    state.isPlaying = false;
    this.notify();
  }

  stop(deckId: DeckId) {
    this.stopSource(deckId);
    this.states[deckId].isPlaying = false;
    this.states[deckId].currentTime = 0;
    this.notify();
  }

  private stopSource(deckId: DeckId) {
    const deck = this.decks[deckId];
    if (deck.source) {
      try {
        deck.source.stop();
      } catch (err) {
        /* ignore */
      }
      deck.source = null;
    }
  }

  toggle(deckId: DeckId) {
    if (this.states[deckId].isPlaying) this.pause(deckId);
    else this.play(deckId);
  }

  setTempo(deckId: DeckId, percent: number) {
    const deck = this.decks[deckId];
    const newRate = 1 + percent / 100;
    deck.playbackRate = newRate;
    if (deck.source && this.states[deckId].isPlaying) {
      const elapsed = (this.ctx.currentTime - deck.startTime) * deck.playbackRate;
      deck.offset = deck.offset + elapsed;
      deck.startTime = this.ctx.currentTime;
      deck.source.playbackRate.value = newRate;
    }
    this.notify();
  }

  setEQ(deckId: DeckId, band: EQBand, value: number) {
    const deck = this.decks[deckId];
    const gainValue = value * 12;
    if (band === 'hi') deck.eqHi.gain.value = gainValue;
    if (band === 'mid') deck.eqMid.gain.value = gainValue;
    if (band === 'lo') deck.eqLo.gain.value = gainValue;
  }

  setVolume(deckId: DeckId, value: number) {
    this.decks[deckId].gain.gain.value = value;
    this.notify();
  }

  setMasterVolume(value: number) {
    this.masterVolume = value;
    this.masterGain.gain.value = value;
    this.notify();
  }

  setCrossfader(value: number) {
    this.crossfader = Math.max(-1, Math.min(1, value));
    this.updateCrossfadeGains();
    this.notify();
  }

  private updateCrossfadeGains() {
    const angle = (this.crossfader + 1) * (Math.PI / 4);
    const gainA = Math.cos(angle);
    const gainB = Math.sin(angle);
    this.decks.A.crossfadeGain.gain.value = gainA;
    this.decks.B.crossfadeGain.gain.value = gainB;
  }

  getState(deckId: DeckId): DeckState {
    return this.states[deckId];
  }

  getAllState() {
    return {
      A: { ...this.states.A },
      B: { ...this.states.B },
      crossfader: this.crossfader,
      masterVolume: this.masterVolume,
    };
  }

  destroy() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.stopSource('A');
    this.stopSource('B');
    this.masterGain.disconnect();
    this.listeners.clear();
  }
}