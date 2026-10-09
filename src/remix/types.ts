// src/remix/types.ts

export interface RemixEntry {
  id: string;
  timestamp: number;

  // Source
  sourceAudioHash: string;
  sourceFileName: string;
  sourceBPM: number;
  sourceKey: string;

  // Génération
  stylePrompt: string;
  styleTags: string[];
  generationParams: {
    intensity: number;
    preserveMelody: number;
    model: string;
  };

  // Résultat
  resultAudioUrl: string;
  resultAudioHash: string;
  duration: number;

  // Feedback utilisateur
  userRating: 0 | 1 | 2 | 3 | 4 | 5;
  userAction: 'generated' | 'kept' | 'deleted' | 'exported' | 'regenerated';
  notes: string;
}

export interface UserPreferences {
  // Fréquences de chaque tag/style
  topStyles: Array<{ tag: string; count: number; avgRating: number }>;

  // Paramètres moyens
  avgIntensity: number;
  avgPreserveMelody: number;

  // BPM préférés
  preferredBPMRange: { min: number; max: number };

  // Statistiques globales
  totalGenerations: number;
  totalExports: number;
  avgRating: number;
}

export interface TrebloGenerationRequest {
  audioFile: File;
  styleTags: string[];
  intensity: number;
  preserveMelody: number;
}

export interface TrebloGenerationResponse {
  id: string;
  audioUrl: string;
  duration: number;
  status: 'success' | 'error';
  error?: string;
}