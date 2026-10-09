/**
 * Détection BPM "pro" utilisant web-audio-beat-detector.
 * Simple, fiable, 100% JavaScript (pas de WASM).
 */

import { guess } from 'web-audio-beat-detector';

export interface BPMResultPro {
  bpm: number;
  confidence: number;
  candidates: number[];
  beats: number[];
}

/**
 * Détecte le BPM avec web-audio-beat-detector.
 */
export async function detectBPMPro(
  audioBuffer: AudioBuffer
): Promise<BPMResultPro> {
  console.log(`🥁 Analyse BPM sur ${audioBuffer.duration.toFixed(2)}s`);

  try {
    // Detection via web-audio-beat-detector
    const t0 = performance.now();
    const rawBPM = await guess(audioBuffer);
    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

    console.log(`🥁 BPM brut détecté : ${rawBPM.bpm.toFixed(2)} (en ${elapsed}s)`);

    // Arrondi
    let bpm = Math.round(rawBPM.bpm);

    // Ajustement dans la plage 90-180
    while (bpm < 90) bpm *= 2;
    while (bpm > 180) bpm = Math.round(bpm / 2);

    // Candidats
    const candidates = [
      Math.round(bpm * 0.5),
      bpm,
      Math.round(bpm * 2),
    ].filter((b) => b >= 60 && b <= 220);

    console.log(
      `✅ BPM final : ${bpm} BPM · Candidats : ${candidates.join(', ')}`
    );

    return {
      bpm,
      confidence: 0.9,
      candidates,
      beats: [],
    };
  } catch (error) {
    console.error('❌ Erreur web-audio-beat-detector :', error);
    console.log('🥁 Fallback sur la détection basique...');

    const { detectBPM } = await import('./bpmDetector');
    const fallback = await detectBPM(audioBuffer);

    return {
      bpm: fallback.bpm,
      confidence: fallback.confidence,
      candidates: fallback.candidates,
      beats: [],
    };
  }
}