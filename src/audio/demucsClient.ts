const DEMUCS_API = 'http://localhost:8000';

export interface DemucsResult {
  vocalsUrl: string;
  noVocalsUrl: string;
  jobId: string;
}

/**
 * Envoie un fichier audio au serveur Demucs local.
 * Récupère un ZIP contenant vocals.wav + no_vocals.wav.
 */
export async function separateVocals(file: File): Promise<DemucsResult> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${DEMUCS_API}/separate?two_stems=vocals`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Erreur inconnue');
    throw new Error(`Demucs error ${res.status}: ${errorText}`);
  }

  const jobId = res.headers.get('X-Job-Id') ?? 'unknown';
  const zipBlob = await res.blob();

  // Décompresse le ZIP avec JSZip
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(zipBlob);

  let vocalsUrl = '';
  let noVocalsUrl = '';

  // Extrait vocals.wav
  const vocalsFile = zip.file('vocals.wav');
  if (vocalsFile) {
    const vocalsBlob = await vocalsFile.async('blob');
    vocalsUrl = URL.createObjectURL(new Blob([vocalsBlob], { type: 'audio/wav' }));
  }

  // Extrait no_vocals.wav
  const noVocalsFile = zip.file('no_vocals.wav');
  if (noVocalsFile) {
    const noVocalsBlob = await noVocalsFile.async('blob');
    noVocalsUrl = URL.createObjectURL(new Blob([noVocalsBlob], { type: 'audio/wav' }));
  }

  return { vocalsUrl, noVocalsUrl, jobId };
}

/**
 * Test simple : vérifie que le serveur Demucs est en ligne.
 */
export async function checkDemucsHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${DEMUCS_API}/health`);
    return res.ok;
  } catch {
    return false;
  }
}