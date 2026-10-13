// src/utils/seratoExporter.ts
import { ID3Writer } from 'browser-id3-writer';

export interface SeratoCue {
  name: string;
  position: number;
  color: string;
}

export interface SeratoExportOptions {
  audioFile: File | Blob;
  bpm: number;
  key: string;
  cues: SeratoCue[];
}

// ============================================================
// Conversion "C minor" → "Cm"
// ============================================================
function keyToId3Format(key: string): string {
  const match = key.match(/^([A-G]#?)\s*(minor|major)?$/i);
  if (!match) return key;
  const [, note, mode] = match;
  if (mode?.toLowerCase() === 'minor') return `${note}m`;
  return note;
}

// ============================================================
// Export principal : écrit les tags ID3 dans le MP3
// ============================================================
export async function exportSeratoMP3(
  options: SeratoExportOptions
): Promise<Blob> {
  const { audioFile, bpm, key, cues } = options;

  // 1. Lit le fichier en ArrayBuffer
  const arrayBuffer = await audioFile.arrayBuffer();

  // 2. Crée le writer ID3
  const writer = new ID3Writer(arrayBuffer);

  // 3. Tags standards ID3 (lus par Serato/Rekordbox automatiquement)
  writer.setFrame('TBPM' as any, [String(Math.round(bpm))]);
  writer.setFrame('TKEY' as any, [keyToId3Format(key)]);

  // 4. Commentaire avec les positions des cues
  const cueList = cues
    .map((c) => `${c.name}@${c.position.toFixed(2)}s`)
    .join(' | ');

  writer.setFrame('COMM', {
    description: 'WaveForge Cues',
    text: cueList || 'No cues detected',
  });

  // 5. Génère le blob final
  writer.addTag();

  return writer.getBlob();
}

// ============================================================
// Télécharge le MP3 modifié
// ============================================================
export function downloadSeratoMP3(
  blob: Blob,
  originalFileName: string
): void {
  const baseName = originalFileName.replace(/\.[^.]+$/, '');
  const filename = `${baseName}-waveforge.mp3`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}