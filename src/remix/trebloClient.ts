// src/remix/trebloClient.ts
import type { TrebloGenerationRequest, TrebloGenerationResponse } from './types';

// ✅ Proxy Vite pour éviter le CORS
const TREBLO_API_URL = '/api/treblo';
const API_KEY_STORAGE = 'waveforge-treblo-api-key';

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE);
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE);
}

/**
 * Récupère la durée d'un fichier audio (en secondes)
 */
async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      URL.revokeObjectURL(audio.src);
      resolve(isFinite(dur) ? dur : 90);
    };
    audio.onerror = () => resolve(90);
    audio.src = URL.createObjectURL(file);
  });
}

/**
 * Étape 1 : Upload du fichier audio vers Treblo
 */
async function uploadAudio(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Clé API Treblo manquante');

  const formData = new FormData();
  formData.append('file', file);

  onProgress?.(0.05);
  console.log('📤 Upload du fichier vers /api/treblo/uploads...');

  const response = await fetch(`${TREBLO_API_URL}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur upload Treblo (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('📤 Upload réussi :', data);

  return data.audio_upload_id || data.id;
}

/**
 * Étape 2 : Génération du remix
 */
export async function generateRemix(
  request: TrebloGenerationRequest,
  onProgress?: (progress: number) => void
): Promise<TrebloGenerationResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Clé API Treblo manquante. Renseignez-la dans les paramètres.');
  }

  try {
    onProgress?.(0.05);
    console.log("📤 Upload de l'audio vers Treblo...");
    const uploadId = await uploadAudio(request.audioFile, (p) => onProgress?.(p * 0.3));

    onProgress?.(0.35);
    console.log('🎵 Génération du remix avec audio_upload_id:', uploadId);

    // ✅ Calcule la durée réelle du fichier pour adapter le crop
    const audioDuration = await getAudioDuration(request.audioFile);
    const cropEnd = Math.min(Math.floor(audioDuration), 90);
    console.log(`⏱️ Durée audio: ${audioDuration.toFixed(1)}s → crop_end: ${cropEnd}s`);

    const payload = {
      audio_upload_id: uploadId,
      prompt:
        request.styleTags.length > 0
          ? `Remix in the style of ${request.styleTags.join(', ')}`
          : 'Remix of this song',
      tags: request.styleTags,
      reference_scale: Math.max(1.0, Math.min(5.0, request.preserveMelody * 5)),
      reference_crop_start: 0,
      reference_crop_end: cropEnd,
      output_format: 'wav',
    };

    console.log('🎼 Envoi /generations/v3/reference avec payload:', payload);

    const response = await fetch(`${TREBLO_API_URL}/generations/v3/reference`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    onProgress?.(0.4);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur Treblo (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('🎼 Tâche créée :', data);

    if (data.task_id) {
      return pollGeneration(data.task_id, onProgress);
    }

    throw new Error('Réponse Treblo invalide : pas de task_id');
  } catch (error: any) {
    console.error('❌ Erreur generateRemix:', error);
    throw error;
  }
}

/**
 * Polling rapide (1 sec) jusqu'à ce que la génération soit terminée.
 */
async function pollGeneration(
  taskId: string,
  onProgress?: (progress: number) => void
): Promise<TrebloGenerationResponse> {
  const apiKey = getApiKey();
  const maxAttempts = 900; // 900 × 1s = 15 minutes
  let attempts = 0;

  // ✅ Statuts qui signifient "ça marche, on continue"
  const PROGRESS_STATUSES = [
    'TRANSCRIBE_STAGE_1',
    'TRANSCRIBE_STAGE_2',
    'PROMPT',
    'TASK_SENT',
    'PROCESSING',
    'PENDING',
    'QUEUED',
    'RUNNING',
    'IN_PROGRESS',
  ];

  // ✅ Statuts de succès (multi-casse)
  const SUCCESS_STATUSES = [
    'completed',
    'COMPLETED',
    'SUCCESS',
    'SUCCEEDED',
    'DONE',
    'FINISHED',
  ];

  // ✅ Statuts d'échec (multi-casse)
  const FAILURE_STATUSES = [
    'failed',
    'FAILED',
    'FAILURE',
    'error',
    'ERROR',
    'CANCELLED',
    'CANCELED',
  ];

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // ✅ 1 sec au lieu de 2
    attempts++;

    // Progression simulée 40% → 95%
    onProgress?.(0.4 + (attempts / maxAttempts) * 0.55);

    try {
      const response = await fetch(`${TREBLO_API_URL}/generations/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        console.warn(`⚠️ Poll HTTP ${response.status}, on réessaie...`);
        continue;
      }

      const data = await response.json();
      const status = data.status || data.state || 'UNKNOWN';

      // Affiche le statut tous les 10 essais pour ne pas surcharger
      if (attempts === 1 || attempts % 10 === 0 || SUCCESS_STATUSES.includes(status) || FAILURE_STATUSES.includes(status)) {
        console.log(`🔄 [${attempts}/${maxAttempts}] Statut: ${status}`);
      }

      // ✅ Détection de succès
      if (
        SUCCESS_STATUSES.includes(status) ||
        data.audio_url ||
        data.url ||
        data.output_url ||
        data.result?.audio_url ||
        data.result?.url
      ) {
        const audioUrl =
          data.audio_url ||
          data.url ||
          data.output_url ||
          data.result?.audio_url ||
          data.result?.url;

        console.log('🎉 SUCCÈS ! Audio URL:', audioUrl);
        onProgress?.(1);

        return {
          id: taskId,
          audioUrl,
          duration: data.duration || data.result?.duration || 0,
          status: 'success',
        };
      }

      // ❌ Détection d'échec
      if (FAILURE_STATUSES.includes(status)) {
        console.error(`❌ Échec (statut: ${status})`, data);
        return {
          id: taskId,
          audioUrl: '',
          duration: 0,
          status: 'error',
          error: data.error || data.message || data.detail || `Statut Treblo : ${status}`,
        };
      }

      // Sinon : statut de progression → on continue
      if (!PROGRESS_STATUSES.includes(status) && status !== 'UNKNOWN') {
        console.warn(`⚠️ Statut inconnu: ${status}`, data);
      }
    } catch (e) {
      console.warn('⚠️ Erreur polling (on continue) :', e);
    }
  }

  throw new Error(
    `Timeout : la génération a pris plus de ${(maxAttempts * 1) / 60} minutes`
  );
}

/**
 * Hash simple d'un fichier (pour identifier la source dans l'historique).
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}