// src/audio/musicgenClient.ts
import { isProduction, MUSICGEN_URL } from '../utils/env';

export interface MusicGenRequest {
  prompt: string;
  duration: number;
  temperature: number;
  withVocals?: boolean;
}

export interface MusicGenStatus {
  status: 'online' | 'offline';
  model?: string;
  device?: string;
  max_duration?: number;
}

const MAX_SINGLE_DURATION = 30;   // limite native MusicGen
const OVERLAP_SECONDS = 3;        // crossfade entre segments

// ============================================================
// HEALTH
// ============================================================
export async function checkMusicGenHealth(): Promise<MusicGenStatus> {
  if (isProduction()) return { status: 'offline' };

  try {
    const res = await fetch(`${MUSICGEN_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { status: 'offline' };
    const data = await res.json();
    return { status: 'online', ...data };
  } catch {
    return { status: 'offline' };
  }
}

// ============================================================
// APPEL UNIQUE (segment ≤ 30s)
// ============================================================
async function generateSegment(
  prompt: string,
  duration: number,
  temperature: number,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const res = await fetch(`${MUSICGEN_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, duration, temperature }),
    signal,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Erreur MusicGen (${res.status}): ${errorText}`);
  }

  return res.arrayBuffer();
}

// ============================================================
// GÉNÉRATION LONGUE (sliding window + crossfade)
// ============================================================
export async function generateMusic(
  request: MusicGenRequest,
  onProgress?: (step: string) => void
): Promise<{ audioUrl: string; generationTime: number }> {
  const startTime = Date.now();
  const { prompt, duration, temperature } = request;

  // ✅ Cas simple : ≤ 30s → 1 appel
  if (duration <= MAX_SINGLE_DURATION) {
    onProgress?.('Envoi de la requête...');
    const arrayBuffer = await generateSegment(prompt, duration, temperature);
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(blob);
    onProgress?.('Terminé !');
    return { audioUrl, generationTime: (Date.now() - startTime) / 1000 };
  }

  // ✅ Cas long : découpe en segments de 30s avec overlap 3s
  const segmentCount = Math.ceil(duration / MAX_SINGLE_DURATION);
  onProgress?.(`Génération longue : ${segmentCount} segments de ${MAX_SINGLE_DURATION}s...`);

  const segments: ArrayBuffer[] = [];
  for (let i = 0; i < segmentCount; i++) {
    onProgress?.(`Segment ${i + 1}/${segmentCount}...`);
    const segPrompt = prompt;
    const segDuration = Math.min(
      MAX_SINGLE_DURATION,
      duration - i * (MAX_SINGLE_DURATION - OVERLAP_SECONDS)
    );
    if (segDuration <= 0) break;

    const buf = await generateSegment(segPrompt, segDuration, temperature);
    segments.push(buf);
  }

  // ✅ Crossfade des segments avec Web Audio
  onProgress?.('Assemblage + crossfade...');
  const merged = await crossfadeSegments(segments, OVERLAP_SECONDS);

  const blob = new Blob([merged], { type: 'audio/wav' });
  const audioUrl = URL.createObjectURL(blob);
  onProgress?.('Terminé !');

  return { audioUrl, generationTime: (Date.now() - startTime) / 1000 };
}

// ============================================================
// CROSSFADE (Web Audio OfflineAudioContext)
// ============================================================
async function crossfadeSegments(
  segments: ArrayBuffer[],
  overlapSeconds: number
): Promise<ArrayBuffer> {
  const ctx = new OfflineAudioContext(
    1,
    44100 * 300,
    44100
  );

  // Décode chaque segment
  const buffers: AudioBuffer[] = [];
  for (const buf of segments) {
    const decoded = await ctx.decodeAudioData(buf.slice(0));
    buffers.push(decoded);
  }

  if (buffers.length === 1) {
    return encodeWav(buffers[0]);
  }

  // Calcule la durée totale réelle (avec overlap)
  let totalDuration = 0;
  for (let i = 0; i < buffers.length; i++) {
    totalDuration += buffers[i].duration;
    if (i < buffers.length - 1) totalDuration -= overlapSeconds;
  }

  // Crée un buffer de sortie
  const finalCtx = new OfflineAudioContext(
    1,
    Math.ceil(totalDuration * 44100),
    44100
  );
  const output = finalCtx.createBuffer(1, finalCtx.length, 44100);

  let cursor = 0;
  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    const data = buf.getChannelData(0);
    const outData = output.getChannelData(0);

    const startSample = Math.floor(cursor * 44100);
    const isFirst = i === 0;
    const isLast = i === buffers.length - 1;
    const fadeSamples = Math.floor(overlapSeconds * 44100);

    for (let j = 0; j < data.length; j++) {
      const outIdx = startSample + j;
      if (outIdx >= outData.length) break;

      let gain = 1;

      // Fade-in au début du segment (sauf premier)
      if (!isFirst && j < fadeSamples) {
        gain = j / fadeSamples;
      }

      // Fade-out à la fin du segment (sauf dernier)
      if (!isLast && j > data.length - fadeSamples) {
        const fadePos = data.length - j;
        gain = Math.min(gain, fadePos / fadeSamples);
      }

      outData[outIdx] += data[j] * gain;
    }

    // Avance le curseur : durée du segment - overlap
    cursor += buf.duration - (isLast ? 0 : overlapSeconds);
  }

  return encodeWav(output);
}

// ============================================================
// WAV ENCODER (PCM 16-bit mono)
// ============================================================
function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0);
  const dataLength = samples.length * 2;
  const bufferLength = 44 + dataLength;
  const arr = new ArrayBuffer(bufferLength);
  const view = new DataView(arr);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return arr;
}