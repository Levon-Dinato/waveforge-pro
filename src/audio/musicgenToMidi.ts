// src/audio/musicgenToMidi.ts
import { analyzePolyphonic } from './basicPitchEngine';
import { exportMidi, download } from './midiExporter';
import type { DetectedNote } from '../types';

export interface TranscriptionResult {
  notes: DetectedNote[];
  midiBlob: Blob;
  fileName: string;
  noteCount: number;
  duration: number;
}

/**
 * Transcrit un audio MusicGen en notes MIDI via Basic Pitch.
 * @param audioBlob Le blob WAV généré par MusicGen
 * @param bpm BPM de référence (par défaut 120)
 * @param onProgress Callback pour suivre la progression
 */
export async function transcribeToMidi(
  audioBlob: Blob,
  bpm: number = 120,
  onProgress?: (step: string) => void
): Promise<TranscriptionResult> {
  // 1. Décoder le blob en AudioBuffer
  onProgress?.('Décodage de l\'audio...');
  const arrayBuffer = await audioBlob.arrayBuffer();

  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // 2. Analyse polyphonique (Basic Pitch)
  onProgress?.('Analyse polyphonique (Basic Pitch)...');
  const notes = await analyzePolyphonic(audioBuffer, 0.5);

  // 3. Génération du MIDI
  onProgress?.('Génération du fichier MIDI...');
  const midiBlob = exportMidi(notes, bpm);

  // 4. Nettoyage
  audioContext.close();

  const fileName = `musicgen-${Date.now()}.mid`;

  return {
    notes,
    midiBlob,
    fileName,
    noteCount: notes.length,
    duration: audioBuffer.duration,
  };
}

/**
 * Télécharge un fichier MIDI
 */
export function downloadMidi(blob: Blob, filename: string): void {
  download(blob, filename);
}

/**
 * Formate la durée en secondes → mm:ss
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}