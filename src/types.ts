export interface DetectedNote {
  midi: number;         // pitch MIDI (0-127)
  start: number;        // secondes
  duration: number;     // secondes
  velocity: number;     // 0-127
  confidence: number;   // 0-1
  track?: TrackType;    // ← AJOUT : lead / bass / harmony / drums
}

export interface AnalysisResult {
  notes: DetectedNote[];
  duration: number;
  sampleRate: number;
  bpm: number;       // ← AJOUT
}

export type TrackType = 'lead' | 'bass' | 'harmony' | 'drums';

export interface QuantizeSettings {
  grid: 0 | 4 | 8 | 16 | 32;
  triplet: boolean;
  swing: number;
  strength: number;
}

export interface EngineSettings {
  sensitivity: number;
  minDuration: number;
  minVelocity: number;
  quantize: QuantizeSettings;
  keySnap: boolean;
  instrument: PresetName;
  splitTracks: boolean;
}

export type PresetName = 'piano' | 'bass' | 'lead' | 'pluck' | 'pad';