// src/audio/videoExporter.ts

export interface ExportOptions {
  audioBuffer: AudioBuffer;
  canvas: HTMLCanvasElement;
  analyser: AnalyserNode;
  duration: number;
  onProgress?: (percent: number) => void;
}

export interface ExportResult {
  blob: Blob;
  mimeType: string;
  extension: string;
  duration: number;
  size: number;
}

/**
 * Détecte le meilleur codec vidéo disponible dans le navigateur.
 * Priorité : MP4 H.264 (si supporté) > WebM VP9 > WebM VP8
 */
function pickBestMimeType(): { mimeType: string; extension: string } {
  const candidates: { mimeType: string; extension: string }[] = [
    { mimeType: 'video/mp4;codecs=h264,aac', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }
  return { mimeType: 'video/webm', extension: 'webm' };
}

/**
 * Enregistre le canvas + l'audio en une seule vidéo.
 * Le canvas doit être en train d'afficher le visuel souhaité.
 */
export async function recordVisualizer(
  options: ExportOptions
): Promise<ExportResult> {
  const { audioBuffer, canvas, analyser, duration, onProgress } = options;

  // 1. Détecte le meilleur format
  const { mimeType, extension } = pickBestMimeType();
  console.log(`📼 Export en ${extension} (${mimeType})`);

  // 2. Crée un AudioContext pour la lecture pendant l'enregistrement
  const audioContext = new AudioContext();
  await audioContext.resume();

  // 3. Source audio
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  // 4. Destination pour le MediaRecorder (silencieux pour l'utilisateur)
  const mediaStreamDest = audioContext.createMediaStreamDestination();

  // ✅ On connecte l'analyser existant (déjà relié au canvas)
  // Source → Analyser (pour le visuel) → MediaStreamDest (pour l'audio enregistré)
  source.connect(analyser);
  analyser.connect(mediaStreamDest);

  // 5. Stream vidéo depuis le canvas
  const videoStream = canvas.captureStream(60);

  // 6. Combine les 2 streams (audio + vidéo)
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...mediaStreamDest.stream.getAudioTracks(),
  ]);

  // 7. Crée le MediaRecorder
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 8_000_000, // 8 Mbps (qualité 1080p)
    audioBitsPerSecond: 192_000,   // 192 kbps (audio pro)
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<ExportResult>((resolve, reject) => {
    const startTime = Date.now();

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const result: ExportResult = {
        blob,
        mimeType,
        extension,
        duration,
        size: blob.size,
      };
      console.log(`✅ Export terminé : ${(blob.size / 1024 / 1024).toFixed(1)} MB`);
      audioContext.close();
      resolve(result);
    };

    recorder.onerror = (e) => {
      audioContext.close();
      reject(e);
    };

    // 8. Démarre l'enregistrement
    recorder.start(100);

    // 9. Joue le buffer
    source.start(0);

    // 10. Progression
    let progressInterval: number | null = null;
    if (onProgress) {
      progressInterval = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const percent = Math.min(100, (elapsed / duration) * 100);
        onProgress(percent);
      }, 200);
    }

    // 11. Arrête tout après la durée
    source.onended = () => {
      if (progressInterval !== null) clearInterval(progressInterval);
      if (onProgress) onProgress(100);
      // Petit délai pour capturer la dernière frame
      setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, 300);
    };
  });
}

/**
 * Télécharge un blob vidéo
 */
export function downloadVideo(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Formate une taille en MB
 */
export function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Formate une durée en secondes → mm:ss
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}