// src/audio/masteringChain.ts

export type MasteringPreset = 'warm' | 'balanced' | 'open' | 'master';

export interface PresetValues {
  loudness: number;
  presence: number;
  width: number;
  saturation: number;
}

export class MasteringChain {
  private inputGain: GainNode;
  private eqMid: BiquadFilterNode;
  private saturator: WaveShaperNode;
  private stereoWidener: StereoPannerNode;
  private limiter: DynamicsCompressorNode;
  private bypassGain: GainNode;
  private processedGain: GainNode;
  private outputGain: GainNode;
  private inputNode: AudioNode | null = null;

  constructor(context: AudioContext | OfflineAudioContext) {
    // --- 1. Gain d'entrée (Loudness) ---
    this.inputGain = context.createGain();
    this.inputGain.gain.value = 1;

    // --- 2. EQ Mid (Presence) — peaking à 1kHz ---
    this.eqMid = context.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1000;
    this.eqMid.Q.value = 1;
    this.eqMid.gain.value = 0;

    // --- 3. Saturateur (WaveShaper) ---
    this.saturator = context.createWaveShaper();
    this.saturator.curve = this.makeDistortionCurve(0) as Float32Array<ArrayBuffer>;

    // --- 4. Stéréo Widener ---
    this.stereoWidener = context.createStereoPanner();
    this.stereoWidener.pan.value = 0;

    // --- 5. Limiteur final (brickwall) ---
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -1;    // Plafond à -1 dB
    this.limiter.knee.value = 0;          // Knee 0 = brickwall
    this.limiter.ratio.value = 20;        // Ratio 20:1 (limiteur)
    this.limiter.attack.value = 0.003;    // 3 ms
    this.limiter.release.value = 0.1;     // 100 ms

    // --- 6. Gains de bypass ---
    this.bypassGain = context.createGain();
    this.bypassGain.gain.value = 0;       // Inactif par défaut
    this.processedGain = context.createGain();
    this.processedGain.gain.value = 1;    // Actif par défaut

    // --- 7. Gain de sortie ---
    this.outputGain = context.createGain();

    // --- 8. Connexion de la chaîne ---
    // Chemin traité : input → eqMid → saturator → widener → limiter → processedGain → output
    this.inputGain.connect(this.eqMid);
    this.eqMid.connect(this.saturator);
    this.saturator.connect(this.stereoWidener);
    this.stereoWidener.connect(this.limiter);
    this.limiter.connect(this.processedGain);
    this.processedGain.connect(this.outputGain);

    // Chemin bypass : input → bypassGain → output
    this.inputGain.connect(this.bypassGain);
    this.bypassGain.connect(this.outputGain);
  }

  /**
   * Courbe de distorsion douce (tanh).
   * À amount=0 → identité parfaite (aucune distorsion).
   * À amount=1 → saturation audible mais musicale.
   */
  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const samples = 44100;
    const curve = new Float32Array(samples) as Float32Array<ArrayBuffer>;
    const k = amount * 5; // 0 = neutre, 5 = saturation forte

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      if (k < 0.001) {
        curve[i] = x; // Neutre : signal inchangé
      } else {
        curve[i] = Math.tanh(k * x) / Math.tanh(k); // Saturation douce
      }
    }
    return curve;
  }

  /**
   * Connexion d'une source audio (ex: sortie de la lecture).
   */
  connect(source: AudioNode): void {
    if (this.inputNode) {
      this.inputNode.disconnect(this.inputGain);
    }
    this.inputNode = source;
    source.connect(this.inputGain);
  }

  /**
   * Récupère le nœud de sortie (après le limiteur).
   */
  getOutputNode(): AudioNode {
    return this.outputGain;
  }

  /**
   * Récupère le nœud d'entrée (pour l'export hors-ligne).
   */
  getInputNode(): AudioNode {
    return this.inputGain;
  }

  // --- Contrôles ---

  setLoudness(value: number): void {
    this.inputGain.gain.value = Math.pow(10, value / 20);
  }

  setPresence(value: number): void {
    this.eqMid.gain.value = value;
  }

  setWidth(value: number): void {
    // Approximation : plus la valeur est haute, plus on écarte
    this.stereoWidener.pan.value = Math.max(-1, Math.min(1, (value - 1)));
  }

  setSaturation(value: number): void {
    this.saturator.curve = this.makeDistortionCurve(value) as Float32Array<ArrayBuffer>;
  }

  setBypass(bypass: boolean): void {
    this.bypassGain.gain.value = bypass ? 1 : 0;
    this.processedGain.gain.value = bypass ? 0 : 1;
  }

  // --- Presets ---

  applyPreset(preset: MasteringPreset): void {
    const values = this.getPresetValues(preset);
    this.setLoudness(values.loudness);
    this.setPresence(values.presence);
    this.setWidth(values.width);
    this.setSaturation(values.saturation);
  }

  getPresetValues(preset: MasteringPreset): PresetValues {
    switch (preset) {
      case 'warm':
        // ✅ Adapté aux fichiers déjà masterisés (gains négatifs)
        return { loudness: -1, presence: -1, width: 1.1, saturation: 0.15 };
      case 'balanced':
        return { loudness: -2, presence: 0, width: 1.0, saturation: 0.08 };
      case 'open':
        return { loudness: -3, presence: 2.5, width: 1.3, saturation: 0.05 };
      case 'master':
        // ✅ Neutre : uniquement le limiteur de sécurité
        return { loudness: 0, presence: 0, width: 1.0, saturation: 0 };
    }
  }

  // --- Nettoyage ---

  destroy(): void {
    this.inputGain.disconnect();
    this.eqMid.disconnect();
    this.saturator.disconnect();
    this.stereoWidener.disconnect();
    this.limiter.disconnect();
    this.bypassGain.disconnect();
    this.processedGain.disconnect();
    this.outputGain.disconnect();
  }
}