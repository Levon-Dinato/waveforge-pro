// src/utils/rekordboxExporter.ts

export interface RekordboxTrack {
  name: string;
  artist?: string;
  filePath: string;
  bpm: number;
  key: string;
  duration: number;
  hotCues: Array<{
    name: string;
    position: number;
    color: string;
  }>;
  loop?: {
    start: number;
    end: number;
  };
}

// ============================================================
// ✅ Convertit un chemin Windows en URL file:// valide
// D:\Musics\House Music\file.mp3
//   → file:///D:/Musics/House%20Music/file.mp3
// ============================================================
function toFileUrl(path: string): string {
  // 1. Normalise les backslashes en slashes
  const normalized = path.replace(/\\/g, '/');

  // 2. Encode chaque segment (préserve les slashes et le : du disque)
  const encoded = normalized
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');

  // 3. Format Windows : file:///D:/...  (3 slashes, pas de host)
  return `file:///${encoded}`;
}

/**
 * Génère un XML compatible Rekordbox 6 pour l'import de tracks + cue points.
 */
export function generateRekordboxXML(tracks: RekordboxTrack[]): string {
  const tracksXml = tracks
    .map((track, idx) => {
      const trackId = idx + 1;

      const cueMarks = track.hotCues
        .map(
          (cue, cueIdx) =>
            `<POSITION_MARK Name="${escapeXml(cue.name)}" Type="0" Start="${cue.position.toFixed(3)}" Num="${cueIdx}" Red="${hexToR(cue.color)}" Green="${hexToG(cue.color)}" Blue="${hexToB(cue.color)}"/>`
        )
        .join('\n          ');

      const loopMark = track.loop
        ? `<POSITION_MARK Name="Loop" Type="4" Start="${track.loop.start.toFixed(3)}" End="${track.loop.end.toFixed(3)}" Num="-1"/>`
        : '';

      // ✅ Utilise toFileUrl pour un chemin valide
      const fileUrl = toFileUrl(track.filePath);

      return `      <TRACK TrackID="${trackId}" Name="${escapeXml(track.name)}" Artist="${escapeXml(track.artist || '')}" Kind="MP3 File" Size="0" TotalTime="${Math.floor(track.duration)}" AverageBpm="${track.bpm.toFixed(2)}" Tonality="${track.key}" Location="${escapeXml(fileUrl)}">
        <TEMPO Inizio="0.000" Bpm="${track.bpm.toFixed(2)}" Metro="4/4" Battito="1"/>
        ${cueMarks}
        ${loopMark}
      </TRACK>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="rekordbox" Version="6.0.0" Company="AlphaTheta"/>
  <COLLECTION Entries="${tracks.length}">
${tracksXml}
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="0" Name="ROOT" Count="1">
      <NODE Name="WaveForge Export" Type="1" KeyType="0" Entries="${tracks.length}">
${tracks.map((_, idx) => `        <TRACK Key="${idx + 1}"/>`).join('\n')}
      </NODE>
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hexToR(hex: string): string {
  const c = hex.replace('#', '');
  return String(parseInt(c.substring(0, 2), 16));
}

function hexToG(hex: string): string {
  const c = hex.replace('#', '');
  return String(parseInt(c.substring(2, 4), 16));
}

function hexToB(hex: string): string {
  const c = hex.replace('#', '');
  return String(parseInt(c.substring(4, 6), 16));
}

/**
 * Télécharge un fichier XML
 */
export function downloadRekordboxXML(
  tracks: RekordboxTrack[],
  filename?: string
): void {
  const xml = generateRekordboxXML(tracks);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `waveforge-rekordbox-${Date.now()}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}