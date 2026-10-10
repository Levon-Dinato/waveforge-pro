// src/audio/musicgenClient.ts

const MUSICGEN_URL = 'http://localhost:8001';

export interface MusicGenRequest {
  prompt: string;
  duration: number;
  temperature: number;
}

export interface MusicGenStatus {
  status: 'online' | 'offline';
  model?: string;
  device?: string;
  max_duration?: number;
}

export async function checkMusicGenHealth(): Promise<MusicGenStatus> {
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

export async function generateMusic(
  request: MusicGenRequest,
  onProgress?: (step: string) => void
): Promise<{ audioUrl: string; generationTime: number }> {
  onProgress?.('Envoi de la requête...');

  const res = await fetch(`${MUSICGEN_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Erreur MusicGen (${res.status}): ${errorText}`);
  }

  onProgress?.('Génération en cours...');

  const generationTime = parseFloat(res.headers.get('X-Generation-Time') || '0');
  const blob = await res.blob();
  const audioUrl = URL.createObjectURL(blob);

  onProgress?.('Terminé !');

  return { audioUrl, generationTime };
}