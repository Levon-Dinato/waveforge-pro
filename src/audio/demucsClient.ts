const DEMUCS_API = 'http://localhost:8000';

export interface DemucsResult {
  vocalsUrl: string;
  noVocalsUrl: string;
  jobId: string;
}

/**
 * Envoie un fichier audio au serveur Demucs avec progression.
 * Utilise XMLHttpRequest pour tracker l'upload.
 */
export function separateVocalsWithProgress(
  file: File,
  onProgress: (percent: number, loaded: number, total: number) => void
): Promise<DemucsResult> {
  return new Promise(async (resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${DEMUCS_API}/separate?two_stems=vocals`);

    // Progression de l'upload
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        onProgress(percent, e.loaded, e.total);
      }
    };

    // Réponse reçue
    xhr.onload = async () => {
      if (xhr.status !== 200) {
        reject(new Error(`Demucs error ${xhr.status}: ${xhr.responseText}`));
        return;
      }

      try {
        const jobId = xhr.getResponseHeader('X-Job-Id') ?? 'unknown';
        const zipBlob = xhr.response;

        // Décompression du ZIP
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(zipBlob);

        let vocalsUrl = '';
        let noVocalsUrl = '';

        const vocalsFile = zip.file('vocals.wav');
        if (vocalsFile) {
          const vocalsBlob = await vocalsFile.async('blob');
          vocalsUrl = URL.createObjectURL(
            new Blob([vocalsBlob], { type: 'audio/wav' })
          );
        }

        const noVocalsFile = zip.file('no_vocals.wav');
        if (noVocalsFile) {
          const noVocalsBlob = await noVocalsFile.async('blob');
          noVocalsUrl = URL.createObjectURL(
            new Blob([noVocalsBlob], { type: 'audio/wav' })
          );
        }

        resolve({ vocalsUrl, noVocalsUrl, jobId });
      } catch (e) {
        reject(e);
      }
    };

    xhr.onerror = () => {
      reject(new Error('Erreur réseau lors de l\'upload'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Timeout de l\'upload'));
    };

    xhr.responseType = 'blob';
    xhr.send(form);
  });
}

/**
 * Ancien helper (compat) — pas de progression.
 */
export async function separateVocals(file: File): Promise<DemucsResult> {
  return separateVocalsWithProgress(file, () => {});
}

/**
 * Test simple du serveur Demucs.
 */
export async function checkDemucsHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${DEMUCS_API}/health`);
    return res.ok;
  } catch {
    return false;
  }
}