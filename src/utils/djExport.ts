// src/utils/djExport.ts

export interface DJCuePoint {
  id: number;
  time: number;
  label: string;
  color: string;
}

export interface DJTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  key: string;
  duration: number;
  audio_url: string;
  cover_url?: string | null;
  cuePoints?: DJCuePoint[];
}

// ✅ Helpers
const sanitizeFileName = (name: string): string =>
  name.replace(/[^a-z0-9-_]/gi, '_').substring(0, 50);

const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * ✅ Export M3U — Format universel (VLC, iTunes, WMP, tout logiciel DJ)
 * Simple, robuste, fonctionne partout.
 */
export const exportToM3U = (tracks: DJTrack[], playlistName: string = 'DropZone Playlist'): void => {
  if (!tracks || tracks.length === 0) {
    alert('Aucun morceau à exporter.');
    return;
  }

  let m3u = '#EXTM3U\n';

  tracks.forEach((track) => {
    const duration = Math.round(track.duration || 0);
    const artist = track.artist || 'Artiste Inconnu';
    const title = track.title || 'Sans titre';
    m3u += `#EXTINF:${duration},${artist} - ${title}\n`;
    m3u += `${track.audio_url}\n`;
  });

  downloadFile(
    m3u,
    `dropzone_${sanitizeFileName(playlistName)}.m3u`,
    'audio/x-mpegurl;charset=utf-8'
  );
};

/**
 * ✅ Export JSON — Pour les outils avancés (Lexicon, DJ Cue Bridge, etc.)
 * Contient TOUTES les métadonnées + les cue points.
 */
export const exportToJSON = (tracks: DJTrack[], playlistName: string = 'DropZone Playlist'): void => {
  if (!tracks || tracks.length === 0) {
    alert('Aucun morceau à exporter.');
    return;
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    generator: 'DropZone.dj',
    format: 'dropzone-playlist-v1',
    playlistName,
    trackCount: tracks.length,
    tracks: tracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist || 'Artiste Inconnu',
      genre: track.genre || 'Inconnu',
      bpm: track.bpm || 0,
      key: track.key && track.key !== '--' ? track.key : null,
      duration: Math.round(track.duration || 0),
      coverUrl: track.cover_url || null,
      audioUrl: track.audio_url,
      cuePoints: (track.cuePoints || []).map((cue, i) => ({
        num: i,
        time: parseFloat(cue.time.toFixed(3)),
        label: cue.label || `Cue ${i + 1}`,
        color: cue.color,
      })),
    })),
  };

  downloadFile(
    JSON.stringify(exportData, null, 2),
    `dropzone_${sanitizeFileName(playlistName)}.json`,
    'application/json;charset=utf-8'
  );
};