// src/audio/demucsClient.ts
import { isProduction, DEMUCS_URL } from '../utils/env';

export interface SeparateResult {
  vocalsUrl: string;
  noVocalsUrl: string;
}

/**
 * Vérifie si le serveur Demucs est en ligne.
 */
export async function checkDemucsHealth(): Promise<boolean> {
  // ✅ En production, le serveur local n'est pas accessible
  if (isProduction()) {
    return false;
  }

  try {
    const res = await fetch(`${DEMUCS_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Sépare un fichier audio en voix + instrumental.
 */
export async function separateVocalsWithProgress(
  file: File,
  onProgress?: (percent: number, loaded: number, total: number) => void
): Promise<SeparateResult> {
  if (isProduction()) {
    throw new Error(
      "La séparation de stems nécessite le serveur Python local. Lance WaveForge sur ton PC."
    );
  }

  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${DEMUCS_URL}/separate?two_stems=vocals`);
    xhr.responseType = 'blob';
    xhr.timeout = 7200000; // 2 heures

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent, e.loaded, e.total);
        }
      };
    }

    xhr.onload = async () => {
      if (xhr.status === 200) {
        try {
          const blob = xhr.response as Blob;
          const url = URL.createObjectURL(blob);
          resolve({
            vocalsUrl: url,
            noVocalsUrl: url,
          });
        } catch (e) {
          reject(new Error('Erreur parsing réponse Demucs'));
        }
      } else {
        reject(new Error(`Erreur Demucs (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Erreur réseau Demucs'));
    xhr.ontimeout = () => reject(new Error('Timeout Demucs (2h)'));

    xhr.send(formData);
  });
}