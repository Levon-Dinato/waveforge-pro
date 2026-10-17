import type { DetectedNote } from '../types';
import { detectPitchYIN, freqToMidi } from './yinDetector';
import { yieldToBrowser } from './asyncHelpers';

// ═══════════════════════════════════════════════════════════
// BASIC PITCH (Polyphonic - via Web Worker)
// ═══════════════════════════════════════════════════════════
export async function analyzeBasicPitch(
  audioBuffer: AudioBuffer,
  sensitivity: number = 0.5,
  onProgress?: (p: number) => void
): Promise<DetectedNote[]> {
  try {
    // 1. Resample en mono 22050 Hz
    const targetLength = Math.ceil(audioBuffer.duration * 22050);
    const offlineCtx = new OfflineAudioContext(1, targetLength, 22050);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    
    console.log(`🧠 Resampling pour Basic Pitch...`);
    const rendered = await offlineCtx.startRendering();
    const samples = rendered.getChannelData(0);

    // 2. Créer le Worker
    const worker = new Worker(
      new URL('./basicPitch.worker.ts', import.meta.url),
      { type: 'module' }
    );

    return new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'progress') {
          onProgress?.(msg.progress);
        } else if (msg.type === 'result') {
          worker.terminate();
          
          // Convertit au format DetectedNote
          const detectedNotes = msg.notes.map((n: any) => ({
            midi: n.pitchMidi,
            start: n.startTimeSeconds,
            duration: n.durationSeconds,
            velocity: Math.round((n.amplitude ?? 0.8) * 127),
            confidence: n.amplitude ?? 0.8,
          }));
          
          resolve(detectedNotes);
        } else if (msg.type === 'error') {
          worker.terminate();
          reject(new Error(msg.message));
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };

      // 3. Envoie les données au Worker
      worker.postMessage({
        samples,
        onsetThresh: Math.max(0.1, 0.5 - sensitivity * 0.35),
        frameThresh: Math.max(0.1, 0.3 - sensitivity * 0.2),
        minNoteLen: 11,
      }, [samples.buffer]); // Transfert zéro-copie
    });
  } catch (err) {
    console.error('🧠 Basic Pitch (Worker) a échoué :', err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// YIN (Fallback monophonique)
// ═══════════════════════════════════════════════════════════
export async function analyzeMonophonic(
  audioBuffer: AudioBuffer,
  maxDuration: number = audioBuffer.duration,
  sensitivity: number = 0.5
): Promise<DetectedNote[]> {
  const sr = audioBuffer.sampleRate;
  const maxSamples = Math.min(audioBuffer.length, Math.floor(maxDuration * sr));
  const data = audioBuffer.getChannelData(0).slice(0, maxSamples);
  const FRAME = 2048;
  const HOP = 2048;
  const MIN_DURATION = 0.08;
  const confidenceThreshold = 0.7 - sensitivity * 0.4;

  console.log(`🎼 Analyse YIN sur ${maxDuration.toFixed(1)}s (threshold=${confidenceThreshold.toFixed(2)})`);

  const notes: DetectedNote[] = [];
  let current: DetectedNote | null = null;
  let frameCount = 0;

  for (let i = 0; i + FRAME < data.length; i += HOP) {
    if (frameCount % 10 === 0) await yieldToBrowser();
    frameCount++;

    const frame = data.slice(i, i + FRAME);
    const { freq, confidence } = detectPitchYIN(frame, sr);
    const time = i / sr;

    if (freq > 0 && confidence > confidenceThreshold) {
      const midi = freqToMidi(freq);
      if (midi < 24 || midi > 108) continue;

      if (current && current.midi === midi) {
        current.duration = time - current.start + HOP / sr;
        current.confidence = Math.max(current.confidence, confidence);
      } else {
        if (current && current.duration >= MIN_DURATION) notes.push(current);
        current = {
          midi,
          start: time,
          duration: HOP / sr,
          velocity: Math.round(confidence * 127),
          confidence,
        };
      }
    }
  }

  if (current && current.duration >= MIN_DURATION) notes.push(current);

  console.log(`🎼 ${notes.length} notes YIN`);
  return notes;
}

// ═══════════════════════════════════════════════════════════
// ANALYSE PRINCIPALE
// ═══════════════════════════════════════════════════════════
export async function analyzePolyphonic(
  audioBuffer: AudioBuffer,
  sensitivity = 0.5,
  onProgress?: (p: number) => void
): Promise<DetectedNote[]> {
  // Priorité 1 : Basic Pitch (Worker)
  try {
    const bpNotes = await analyzeBasicPitch(audioBuffer, sensitivity, onProgress);
    if (bpNotes.length > 0) {
      console.log(`✅ Basic Pitch (Worker) réussi : ${bpNotes.length} notes`);
      return bpNotes;
    }
    console.warn('⚠️ Basic Pitch a retourné 0 notes, fallback YIN');
  } catch (err) {
    console.warn('⚠️ Basic Pitch Worker indisponible, fallback YIN :', err);
  }

  // Priorité 2 : YIN
  return analyzeMonophonic(audioBuffer, audioBuffer.duration, sensitivity);
}